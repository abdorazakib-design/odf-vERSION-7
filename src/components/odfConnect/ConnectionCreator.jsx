import React, { useState, useEffect } from "react";
import { supabase, createCable } from "../../supabase.js";
import { InfraSelector } from "./InfraSelector.jsx";

function Label({ children, TH }) {
  return <label style={{ display: "block", color: TH.text2, fontSize: "11px", fontWeight: 600, marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{children}</label>;
}

function Section({ title, children, TH }) {
  return (
    <div style={{ background: TH.bgCard, border: `1px solid ${TH.border}`, borderRadius: "12px", padding: "18px", marginBottom: "16px" }}>
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, color: TH.text1, fontSize: "13px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Sel({ value, onChange, children, TH, style = {}, disabled = false }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      style={{
        width: "100%", background: TH.bgInput, border: `1px solid ${disabled ? TH.border : TH.border2}`,
        borderRadius: "8px", padding: "9px 12px", color: disabled ? TH.text3 : TH.text1,
        fontSize: "13px", cursor: disabled ? "not-allowed" : "pointer", outline: "none",
        opacity: disabled ? 0.6 : 1, ...style
      }}>
      {children}
    </select>
  );
}

export function ConnectionCreator({
  mode,
  setMode,
  connType,
  setConnType,
  src,
  setSrc,
  dst,
  setDst,
  cableRef,
  setCableRef,
  typeFibre,
  setTypeFibre,
  saving,
  setSaving,
  err,
  setErr,
  success,
  setSuccess,
  TH,
  onCreated,
}) {
  // Réinitialiser les sélections en cas de changement de mode ou type connexion
  useEffect(() => {
    setSrc({ site: "", salle: "", rack: "", odf: "", selectedSlots: [] });
    setDst({ site: "", salle: "", rack: "", odf: "", selectedSlots: [] });
    setErr(""); setSuccess("");
  }, [mode, connType]);

  // Auto-générer la référence câble au format : ALP-BET/S1_R1_ODF7-S1_R1_ODF5
  useEffect(() => {
    if (src.site) {
      const dstSite = mode === "intersalle" ? src.site : dst.site;
      if (dstSite) {
        let ref = `${src.site}-${dstSite}`;
        const srcPath = [src.salleName, src.rackName, src.odfName].filter(Boolean).join("_");
        const dstPath = [dst.salleName, dst.rackName, dst.odfName].filter(Boolean).join("_");
        if (srcPath && dstPath) {
          ref += `/${srcPath}-${dstPath}`;
        } else if (srcPath) {
          ref += `/${srcPath}`;
        }
        setCableRef(ref);
      }
    }
  }, [src.site, dst.site, src.salleName, src.rackName, src.odfName, dst.salleName, dst.rackName, dst.odfName, mode]);

  const canCreate = connType === "odf"
    ? src.odf && dst.odf && src.odf !== dst.odf
    : src.selectedSlots?.length > 0 && dst.selectedSlots?.length > 0 && src.selectedSlots.length === dst.selectedSlots.length;

  const doCreate = async () => {
    if (!canCreate) return;
    setSaving(true); setErr(""); setSuccess("");
    try {
      if (connType === "odf") {
        const [srcSlotsRes, dstSlotsRes] = await Promise.all([
          supabase.from("slots").select("id, name, slot_num").eq("odf_id", src.odf).order("slot_num"),
          supabase.from("slots").select("id, name, slot_num").eq("odf_id", dst.odf).order("slot_num")
        ]);
        const sSlots = srcSlotsRes.data || [];
        const dSlots = dstSlotsRes.data || [];

        if (sSlots.length === 0 || dSlots.length === 0) {
          throw new Error("L'un des ODF sélectionnés ne possède aucun slot.");
        }

        if (sSlots.length !== dSlots.length) {
          throw new Error(`La destination n'a pas la possibilité de recevoir cette connexion : l'ODF source possède ${sSlots.length} slots et la destination possède ${dSlots.length} slots. Veuillez utiliser une connexion "Par Slot".`);
        }

        const typeLien = mode === "externe" ? "EXTERNE" : "INTERNE";
        
        for (let i = 0; i < sSlots.length; i++) {
          const sSlot = sSlots[i];
          const dSlot = dSlots[i];

          const [srcPorts, dstPorts] = await Promise.all([
            supabase.from("ports").select("id,slot_port,statut").eq("slot_id", sSlot.id).order("slot_port"),
            supabase.from("ports").select("id,slot_port,statut").eq("slot_id", dSlot.id).order("slot_port"),
          ]);
          const sp = (srcPorts.data || []).filter(p => p.statut === "LIBRE");
          const dp = (dstPorts.data || []).filter(p => p.statut === "LIBRE");

          if (sp.length === 0 || dp.length === 0) {
            throw new Error(`Aucun port disponible dans le slot ${sSlot.name} ou ${dSlot.name}.`);
          }

          const subRef = `${cableRef}-${sSlot.name}`;
          const { error: cabErr } = await createCable({
            cable_reference: subRef,
            nom: `${src.site} ↔ ${mode === "intersalle" ? src.site : dst.site} (${mode === "externe" ? "EXTERNE" : "INTERNE"})`,
            type_lien: typeLien,
            type_fibre: typeFibre,
            nombre_fibres: 12,
            fournisseur_id: null,
            capacite_totale_gbps: 0,
            capacite_disponible_gbps: 0,
            port_source_id: sp[0].id,
            port_dest_id: dp[0].id,
          });
          if (cabErr) throw cabErr;
        }

        setSuccess(`✅ Connexion par ODF entier créée ! ${sSlots.length} slots raccordés (${sSlots.length * 12} ports connectés).`);
      } else {
        const typeLien = mode === "externe" ? "EXTERNE" : "INTERNE";

        for (let i = 0; i < src.selectedSlots.length; i++) {
          const sSlotId = src.selectedSlots[i];
          const dSlotId = dst.selectedSlots[i];

          const sSlotName = sSlotId.split("_").pop() || `Slot${i+1}`;

          const [srcPorts, dstPorts] = await Promise.all([
            supabase.from("ports").select("id,slot_port,statut").eq("slot_id", sSlotId).order("slot_port"),
            supabase.from("ports").select("id,slot_port,statut").eq("slot_id", dSlotId).order("slot_port"),
          ]);
          const sp = (srcPorts.data || []).filter(p => p.statut === "LIBRE");
          const dp = (dstPorts.data || []).filter(p => p.statut === "LIBRE");

          if (sp.length === 0 || dp.length === 0) {
            throw new Error(`Aucun port libre disponible dans le slot source ${sSlotName} ou sa destination correspondante.`);
          }

          const subRef = `${cableRef}-${sSlotName}`;

          const { error: cabErr } = await createCable({
            cable_reference: subRef,
            nom: `${src.site} ↔ ${mode === "intersalle" ? src.site : dst.site} (${mode === "externe" ? "EXTERNE" : "INTERNE"})`,
            type_lien: typeLien,
            type_fibre: typeFibre,
            nombre_fibres: 12,
            fournisseur_id: null,
            capacite_totale_gbps: 0,
            capacite_disponible_gbps: 0,
            port_source_id: sp[0].id,
            port_dest_id: dp[0].id,
          });
          if (cabErr) throw cabErr;
        }

        setSuccess(`✅ Connexion par Slot(s) créée ! ${src.selectedSlots.length} slot(s) raccordé(s) (${src.selectedSlots.length * 12} ports connectés).`);
      }

      setCableRef(""); 
      setSrc({ site: "", salle: "", rack: "", odf: "", selectedSlots: [] }); 
      setDst({ site: "", salle: "", rack: "", odf: "", selectedSlots: [] });
      if (onCreated) onCreated();
    } catch (e) {
      setErr("Erreur : " + (e.message || JSON.stringify(e)));
    }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
        {[
          { key: "externe", label: "🌐 Connexion Inter-Sites (EXTERNE)" },
          { key: "intersalle", label: "🏢 Connexion Inter-Salles (INTERNE)" },
        ].map(m => (
          <button key={m.key} onClick={() => { setMode(m.key); }}
            style={{
              padding: "9px 18px", borderRadius: "10px", border: `1px solid ${mode === m.key ? TH.blue : TH.border}`,
              background: mode === m.key ? `${TH.blue}22` : "transparent",
              color: mode === m.key ? TH.blue : TH.text2, fontSize: "13px", fontWeight: 700, cursor: "pointer"
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Niveau de raccordement */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => setConnType("odf")}
          style={{
            flex: 1, padding: "11px", borderRadius: "10px", border: `1px solid ${connType === "odf" ? TH.blue : TH.border}`,
            background: connType === "odf" ? `${TH.blue}15` : "transparent",
            color: connType === "odf" ? TH.blue : TH.text2, fontWeight: 700, cursor: "pointer", fontSize: "13px"
          }}>
          📦 Par ODF Entier (tous les slots reliés)
        </button>
        <button onClick={() => setConnType("slot")}
          style={{
            flex: 1, padding: "11px", borderRadius: "10px", border: `1px solid ${connType === "slot" ? TH.blue : TH.border}`,
            background: connType === "slot" ? `${TH.blue}15` : "transparent",
            color: connType === "slot" ? TH.blue : TH.text2, fontWeight: 700, cursor: "pointer", fontSize: "13px"
          }}>
          🔌 Par Slot individuel (12 ports)
        </button>
      </div>

      <div style={{ background: `${TH.blue}11`, border: `1px solid ${TH.blue}33`, borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", fontSize: "12px", color: TH.text2 }}>
        {mode === "externe"
          ? `Connexion de type EXTERNE. ${connType === "odf" ? "Sélectionnez un ODF entier source et un ODF entier destination. Tous les slots respectifs seront connectés." : "Sélectionnez un Slot source et destination. Les 12 ports seront connectés."}`
          : `Connexion de type INTERNE (dans le même site entre deux salles différentes). ${connType === "odf" ? "Sélectionnez un ODF entier source et un ODF entier destination." : "Sélectionnez un Slot source et destination."}`}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <Section title="📤 Source" TH={TH}>
          <InfraSelector label="Site source" color={TH.green} onChange={setSrc} TH={TH} connType={connType} typeLien={mode === "externe" ? "EXTERNE" : "INTERNE"} />
        </Section>
        <Section title="📥 Destination" TH={TH}>
          <InfraSelector
            label="Site destination"
            color={TH.cyan}
            onChange={setDst}
            TH={TH}
            excludeSiteId={mode === "externe" ? src.site : ""}
            excludeSalleId={mode === "intersalle" ? src.salle : ""}
            forcedSiteId={mode === "intersalle" ? src.site : ""}
            connType={connType}
            typeLien={mode === "externe" ? "EXTERNE" : "INTERNE"}
          />
        </Section>
      </div>

      <Section title="⚙️ Paramètres du câble" TH={TH}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <Label TH={TH}>Référence câble</Label>
            <input value={cableRef} onChange={e => setCableRef(e.target.value)}
              style={{ width: "100%", background: TH.bgInput, border: `1px solid ${TH.border}`, borderRadius: "8px", padding: "9px 12px", color: TH.text1, fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <Label TH={TH}>Type fibre</Label>
            <Sel value={typeFibre} onChange={setTypeFibre} TH={TH}>
              <option>Monomode</option>
              <option>Multimode</option>
            </Sel>
          </div>
        </div>
      </Section>

      <button onClick={doCreate} disabled={!canCreate || saving}
        style={{
          width: "100%", padding: "14px", borderRadius: "12px", border: "none",
          background: canCreate ? TH.blue : TH.border,
          color: canCreate ? "#fff" : TH.text3,
          fontSize: "14px", fontWeight: 700, cursor: canCreate ? "pointer" : "not-allowed",
          transition: "all .2s"
        }}>
        {saving ? "Création en cours…" : `🔗 Créer la connexion ${mode === "externe" ? "EXTERNE" : "INTERNE"}`}
      </button>
      
      {!canCreate && !saving && (
        <div style={{ textAlign: "center", color: TH.text3, fontSize: "12px", marginTop: "12px", background: "rgba(251,191,36,.08)", border: `1px solid rgba(251,191,36,.2)`, padding: "10px", borderRadius: "8px" }}>
          💡 <strong>Conseil :</strong> Si un ODF ou un slot n'apparaît pas dans la liste déroulante, cela signifie qu'il est déjà entièrement ou partiellement occupé. 
          {connType === "odf" && ` Si aucun ODF entier n'est disponible, veuillez basculer vers la méthode de connexion "Par Slot individuel".`}
        </div>
      )}
    </div>
  );
}
