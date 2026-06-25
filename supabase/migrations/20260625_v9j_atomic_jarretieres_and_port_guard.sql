-- ═══════════════════════════════════════════════════════════════════════════
-- ODF Manager V9j — Création de service réellement atomique
-- ═══════════════════════════════════════════════════════════════════════════
-- Corrige trois défauts de create_service_with_jonctions_atomic :
--   1. Les jarretières de transit étaient créées côté client AVANT le RPC, donc
--      hors transaction : un échec du RPC laissait des câbles orphelins et des
--      ports OCCUPE sans CID (le trigger fn_auto_port_actif occupe les ports à
--      l'insertion du câble). Elles sont désormais créées DANS le RPC, via des
--      champs optionnels (jar_ref/jar_nom/jar_type) sur chaque jonction.
--   2. Le CID était fourni à la seconde près et réutilisé comme clé primaire :
--      deux services créés dans la même seconde provoquaient une collision de
--      PK, et la boucle d'unicité ne s'exécutait jamais (CID toujours fourni).
--      L'unicité est maintenant garantie même quand un CID est fourni, et l'id
--      du service en dérive.
--   3. La disponibilité des ports n'était vérifiée que côté client (TOCTOU).
--      Les ports sont verrouillés (FOR UPDATE) et vérifiés LIBRE dans le RPC.
--
-- Migration idempotente : DROP de toutes les surcharges puis CREATE de la
-- signature unique (identique à la précédente — aucun changement côté appelant).

BEGIN;

DROP FUNCTION IF EXISTS public.create_service_with_jonctions_atomic(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT
);
DROP FUNCTION IF EXISTS public.create_service_with_jonctions_atomic(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT
);
DROP FUNCTION IF EXISTS public.create_service_with_jonctions_atomic(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, NUMERIC
);

CREATE OR REPLACE FUNCTION public.create_service_with_jonctions_atomic(
  p_service_id     TEXT,
  p_cid            TEXT,
  p_label          TEXT,
  p_cable_id       TEXT,
  p_client_id      TEXT,
  p_fournisseur_id TEXT,
  p_port_id        TEXT,
  p_jonctions      JSONB,
  p_history_action TEXT,
  p_created_by     TEXT    DEFAULT NULL,
  p_capacite_gbps  NUMERIC DEFAULT 0
) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_jonction   RECORD;
  v_final_cid  TEXT   := NULLIF(p_cid, '');
  v_service_id TEXT   := NULLIF(p_service_id, '');
  v_cable_id   TEXT;
  v_port_ids   TEXT[];
  v_busy       TEXT[];
BEGIN
  -- ── 1. CID unique ────────────────────────────────────────────────────────
  -- Génère un CID si absent, puis suffixe tant qu'il entre en collision avec un
  -- id ou un cid existant (vrai même lorsqu'un CID est fourni par l'appelant).
  IF v_final_cid IS NULL THEN
    v_final_cid := 'DJT-' || to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS');
  END IF;
  WHILE EXISTS (
    SELECT 1 FROM public.services WHERE cid = v_final_cid OR id = v_final_cid
  ) LOOP
    v_final_cid := 'DJT-' || to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS')
                   || LPAD((floor(random()*100))::INT::TEXT, 2, '0');
  END LOOP;

  -- L'id du service dérive du CID dédupliqué quand il n'est pas imposé.
  IF v_service_id IS NULL THEN
    v_service_id := v_final_cid;
  END IF;

  -- ── 2. Verrou + contrôle de disponibilité des ports (anti-TOCTOU) ─────────
  SELECT array_agg(DISTINCT p) INTO v_port_ids
  FROM (
    SELECT p_port_id AS p
    UNION ALL
    SELECT j.port_entree_id
      FROM jsonb_to_recordset(COALESCE(p_jonctions, '[]'::jsonb))
        AS j(port_entree_id TEXT, port_sortie_id TEXT)
    UNION ALL
    SELECT j.port_sortie_id
      FROM jsonb_to_recordset(COALESCE(p_jonctions, '[]'::jsonb))
        AS j(port_entree_id TEXT, port_sortie_id TEXT)
  ) t
  WHERE p IS NOT NULL;

  IF v_port_ids IS NOT NULL AND array_length(v_port_ids, 1) > 0 THEN
    -- Verrouille les lignes pour empêcher deux créations concurrentes de se
    -- partager le même port.
    PERFORM 1 FROM public.ports WHERE id = ANY(v_port_ids) FOR UPDATE;

    SELECT array_agg(id) INTO v_busy
    FROM public.ports
    WHERE id = ANY(v_port_ids) AND statut <> 'LIBRE';

    IF v_busy IS NOT NULL THEN
      RAISE EXCEPTION 'PORTS_OCCUPES: certains ports ne sont plus libres: %',
        array_to_string(v_busy, ', ')
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- ── 3. Créer le service ──────────────────────────────────────────────────
  INSERT INTO public.services (
    id, cid, label, cable_id, client_id, fournisseur_id, port_id,
    capacite_gbps, statut, created_by, updated_by
  )
  VALUES (
    v_service_id, v_final_cid, p_label, p_cable_id,
    p_client_id, p_fournisseur_id, p_port_id,
    COALESCE(p_capacite_gbps, 0),
    'ACTIF', p_created_by, p_created_by
  );

  -- ── 4. Jonctions (+ création atomique des jarretières au besoin) ──────────
  IF p_jonctions IS NOT NULL AND jsonb_array_length(p_jonctions) > 0 THEN
    FOR v_jonction IN
      SELECT * FROM jsonb_to_recordset(p_jonctions)
        AS x(ordre INT, cable_id TEXT, port_entree_id TEXT, port_sortie_id TEXT,
             jar_ref TEXT, jar_nom TEXT, jar_type TEXT)
    LOOP
      v_cable_id := NULLIF(v_jonction.cable_id, '');

      -- Jarretière de transit à matérialiser : get-or-create par référence,
      -- dans la même transaction. L'INSERT déclenche fn_auto_port_actif qui
      -- occupe les ports — c'est désormais sûr car tout est atomique.
      IF v_cable_id IS NULL
         AND v_jonction.jar_ref IS NOT NULL
         AND v_jonction.jar_ref <> '' THEN
        SELECT id INTO v_cable_id
        FROM public.cables_fibre
        WHERE cable_reference = v_jonction.jar_ref;

        IF v_cable_id IS NULL THEN
          INSERT INTO public.cables_fibre (
            cable_reference, nom, type_lien,
            port_source_id, port_dest_id,
            capacite_totale_gbps, capacite_disponible_gbps
          )
          VALUES (
            v_jonction.jar_ref,
            v_jonction.jar_nom,
            COALESCE(NULLIF(v_jonction.jar_type, ''), 'JARRETIERE'),
            v_jonction.port_entree_id,
            v_jonction.port_sortie_id,
            0, 0
          )
          RETURNING id INTO v_cable_id;
        END IF;
      END IF;

      INSERT INTO public.service_jonctions (
        service_id, ordre, cable_id, port_entree_id, port_sortie_id
      )
      VALUES (
        v_service_id, v_jonction.ordre, v_cable_id,
        v_jonction.port_entree_id, v_jonction.port_sortie_id
      );

      IF v_jonction.port_entree_id IS NOT NULL THEN
        UPDATE public.ports SET statut = 'OCCUPE', cid = v_final_cid
          WHERE id = v_jonction.port_entree_id;
      END IF;
      IF v_jonction.port_sortie_id IS NOT NULL THEN
        UPDATE public.ports SET statut = 'OCCUPE', cid = v_final_cid
          WHERE id = v_jonction.port_sortie_id;
      END IF;
    END LOOP;
  END IF;

  -- ── 5. Port principal ────────────────────────────────────────────────────
  IF p_port_id IS NOT NULL THEN
    UPDATE public.ports SET statut = 'OCCUPE', cid = v_final_cid
      WHERE id = p_port_id;
  END IF;

  -- ── 6. Historique ────────────────────────────────────────────────────────
  IF p_history_action IS NOT NULL AND p_history_action <> '' THEN
    INSERT INTO public.history (action, entity_type, entity_id, user_email)
    VALUES (p_history_action, 'service', v_service_id, p_created_by);
  END IF;

  RETURN v_service_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Toute la transaction est annulée. On préserve le SQLSTATE et le message
    -- d'origine pour ne pas masquer la cause réelle (collision, port occupé…).
    RAISE EXCEPTION 'Erreur lors de la création du service [%]: %', SQLSTATE, SQLERRM
      USING ERRCODE = SQLSTATE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_service_with_jonctions_atomic(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, NUMERIC
) TO anon, authenticated, service_role;

COMMIT;
