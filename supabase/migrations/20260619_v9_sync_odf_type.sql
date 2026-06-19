-- ═══════════════════════════════════════════════════════════════════════════
-- ODF Manager V9 — Synchronisation automatique odf_type <-> cables_fibre.type_lien
--
-- Cette migration modifie la table public.odfs pour permettre à odf_type d'être 
-- NULL (lorsqu'il n'y a pas de connexion) et crée un trigger qui synchronise 
-- automatiquement et en temps réel cette colonne avec la table cables_fibre.
-- ═══════════════════════════════════════════════════════════════════════════

-- 0. Modification des contraintes de la table public.odfs
-- Supprimer la contrainte CHECK existante si elle existe
ALTER TABLE public.odfs DROP CONSTRAINT IF EXISTS odfs_odf_type_check;

-- Autoriser la colonne odf_type à être NULL
ALTER TABLE public.odfs ALTER COLUMN odf_type DROP NOT NULL;

-- Enlever la valeur par défaut 'EXTERNE' pour mettre NULL par défaut
ALTER TABLE public.odfs ALTER COLUMN odf_type SET DEFAULT NULL;

-- Recréer la contrainte CHECK pour autoriser NULL, 'EXTERNE' ou 'INTERNE'
ALTER TABLE public.odfs ADD CONSTRAINT odfs_odf_type_check CHECK (odf_type IN ('EXTERNE', 'INTERNE') OR odf_type IS NULL);

-- 1. Fonction du trigger pour synchroniser odf_type
CREATE OR REPLACE FUNCTION public.fn_sync_odf_type_from_cables()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_port_id TEXT;
  v_odf_id TEXT;
BEGIN
  -- Parcourir tous les ports affectés par le changement (nouveau et/ou ancien câble)
  FOR v_port_id IN 
    SELECT DISTINCT p_id 
    FROM (
      SELECT CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.port_source_id END AS p_id
      UNION ALL
      SELECT CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.port_dest_id END
      UNION ALL
      SELECT CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.port_source_id END
      UNION ALL
      SELECT CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.port_dest_id END
    ) t
    WHERE p_id IS NOT NULL
  LOOP
    -- Récupérer l'ODF ID correspondant au port
    SELECT odf_id INTO v_odf_id FROM public.ports WHERE id = v_port_id;
    
    IF v_odf_id IS NOT NULL THEN
      DECLARE
        v_type_lien TEXT;
      BEGIN
        -- Recalculer le type_lien de n'importe quel câble connecté à cet ODF
        SELECT c.type_lien INTO v_type_lien
        FROM public.cables_fibre c
        JOIN public.ports p ON p.id IN (c.port_source_id, c.port_dest_id)
        WHERE p.odf_id = v_odf_id
        LIMIT 1;
        
        -- Si un câble existe, l'ODF prend son type. Sinon, il devient NULL.
        UPDATE public.odfs
        SET odf_type = v_type_lien
        WHERE id = v_odf_id;
      END;
    END IF;
  END LOOP;
  
  -- Retourner NEW (ou OLD si DELETE)
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 2. Création du trigger
DROP TRIGGER IF EXISTS trg_cables_fibre_sync_odf_type ON public.cables_fibre;

CREATE TRIGGER trg_cables_fibre_sync_odf_type
  AFTER INSERT OR UPDATE OR DELETE ON public.cables_fibre
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_odf_type_from_cables();

-- 3. Initialisation de l'odf_type pour tous les ODF existants selon les câbles de la DB
-- D'abord, on réinitialise tous les ODF à NULL
UPDATE public.odfs SET odf_type = NULL;

-- Ensuite, on attribue le bon type_lien pour les ODF qui ont des câbles connectés
UPDATE public.odfs o
SET odf_type = t.type_lien
FROM (
  SELECT DISTINCT p.odf_id, c.type_lien
  FROM public.cables_fibre c
  JOIN public.ports p ON p.id IN (c.port_source_id, c.port_dest_id)
) t
WHERE o.id = t.odf_id;
