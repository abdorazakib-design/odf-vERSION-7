import { useState, useEffect } from "react";
import {
  getSites, createSite, deleteSite,
  getSalles, createSalle, deleteSalle,
  getRacks, createRack, deleteRack,
  getOdfs, createOdf, deleteOdf,
  getSlots, createSlot, deleteSlot,
} from "../supabase.js";

const TABS = [
  { key: "sites",  label: "🌐 Sites",  color: "#3B82F6" },
  { key: "salles", label: "🏢 Salles", color: "#8B5CF6" },
  { key: "racks",  label: "🔲 Racks",  color: "#06B6D4" },
  { key: "odfs",   label: "◉ ODFs",   color: "#10B981" },
  { key: "slots",  label: "📦 Slots",  color: "#F59E0B" },
];

export default function InfraManage({ t, TH }) {
  const [tab, setTab]         = useState("sites");
  const [sites, setSites]     = useState([]);
  const [salles, setSalles]   = useState([]);
  const [racks, setRacks]     = useState([]);
  const [odfs, setOdfs]       = useState([]);
  const [slots, setSlots]     = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [error, setError]     = useState(null);

  const load = async () => {
    const [si, sa, ra, od, sl] = await Promise.all([
      getSites(), getSalles(), getRacks(), getOdfs(), getSlots(),
    ]);
    setSites(si.data || []);
    setSalles(sa.data || []);
    setRacks(ra.data || []);
    setOdfs(od.data || []);
    setSlots(sl.data || []);
  };

  useEffect(() => { load(); }, []);

  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));

  /* ── Création avec cascade ── */
  const doAdd = async () => {
    setSaving(true);
    setError(null);
    try {
      if (tab === "sites") {
        const id = form.id?.trim().toUpperCase();
        if (!id || !form.name) return;
        const { error: e } = await createSite({ id, name: form.name, description: form.description || "" });
        if (e) { setError(e.message); return; }
      }
      else if (tab === "salles") {
        if (!form.site_id || !form.name) return;
        const salleCode = form.name.trim().toUpperCase();
        const id = `${form.site_id}-${salleCode}`;
        const { error: eS } = await createSalle({ id, site_id: form.site_id, name: form.name, description: form.description || "" });
        if (eS) { setError(eS.message); return; }
      }
      else if (tab === "racks") {
        if (!form.site_id || !form.salle_id || !form.name) return;
        // Extraire le code salle depuis l'ID de salle (ex: "BET-S1" → "S1")
        const salleSuffix = form.salle_id.replace(form.site_id + "-", "");
        const rackName = form.name.trim().toUpperCase();
        const id = `${form.site_id}-${salleSuffix}-${rackName}`;   // ex: BET-S1-R2
        const { error: e } = await createRack({ id, site_id: form.site_id, salle_id: form.salle_id, name: rackName });
        if (e) { setError(e.message); return; }
      }
      else if (tab === "odfs") {
        if (!form.rack_id || !form.name) return;
        const id = `${form.rack_id}-${form.name.trim().toUpperCase()}`;
        const { error: e } = await createOdf({ id, rack_id: form.rack_id, name: form.name, odf_type: form.odf_type || "EXTERNE", route: form.route || "" });
        if (e) { setError(e.message); return; }
      }
      else if (tab === "slots") {
        if (!form.odf_id || !form.name) return;
        const slotNum = slots.filter(s => s.odf_id === form.odf_id).length + 1;
        const id = `${form.odf_id}_${form.name.trim().toUpperCase()}`;
        const { error: e } = await createSlot({ id, odf_id: form.odf_id, slot_num: slotNum, name: form.name });
        if (e) { setError(e.message); return; }
      }
      setShowAdd(false);
      setForm({});
      await load();
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id) => {
    if (tab === "sites")  await deleteSite(id);
    if (tab === "salles") await deleteSalle(id);
    if (tab === "racks")  await deleteRack(id);
    if (tab === "odfs")   await deleteOdf(id);
    if (tab === "slots")  await deleteSlot(id);
    setConfirm(null);
    await load();
  };

  /* ── Données du tab actif ── */
  const rows = { sites, salles, racks, odfs, slots }[tab] || [];

  /* ── Formulaire selon le tab ── */
  const renderForm = () => {
    const inp = (label, key, placeholder = "") => (
      <div key={key} style={{ marginBottom: 12 }}>
        <label style={{ display: "block", color: TH.text2, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{label}</label>
        <input value={form[key] || ""} onChange={e => up(key, e.target.value)} placeholder={placeholder}
          style={{ width: "100%", background: TH.bgInput, border: `1px solid ${TH.border}`, borderRadius: 8,
            padding: "8px 12px", color: TH.text1, fontSize: 13, boxSizing: "border-box" }} />
      </div>
    );

    // sel générique — clearKeys : liste de clés form à vider quand ce champ change
    const sel = (label, key, options, clearKeys = []) => (
      <div key={key} style={{ marginBottom: 12 }}>
        <label style={{ display: "block", color: TH.text2, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{label}</label>
        <select value={form[key] || ""}
          onChange={e => setForm(f => {
            const next = { ...f, [key]: e.target.value };
            clearKeys.forEach(k => { next[k] = ""; });
            return next;
          })}
          style={{ width: "100%", background: TH.bgInput, border: `1px solid ${TH.border}`, borderRadius: 8,
            padding: "8px 12px", color: TH.text1, fontSize: 13 }}>
          <option value="">— Sélectionner —</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );

    // Helper : label salle à partir d'un rack
    const salleLabel = (rackId) => {
      const rack = racks.find(r => r.id === rackId);
      if (!rack?.salle_id) return "";
      const salle = salles.find(s => s.id === rack.salle_id);
      return ` 🏢 ${salle?.name || rack.salle_id}`;
    };

    if (tab === "sites") return <>
      {inp("ID Site (ex: RDK)", "id", "RDK")}
      {inp("Nom", "name", "Ras-Dika")}
      {inp("Description", "description")}
      <div style={{ padding: "8px 12px", background: "rgba(59,130,246,0.08)", borderRadius: 8, fontSize: 11, color: TH.text2 }}>
        ✨ Auto-crée : Salle S1 → Rack R1 → ODF1 → Slot S01 → 12 ports
      </div>
    </>;

    if (tab === "salles") return <>
      {sel("Site", "site_id", sites.map(s => ({ value: s.id, label: `${s.name} (${s.id})` })), ["salle_id"])}
      {inp("Nom Salle (ex: S2)", "name", "S2")}
      {inp("Description", "description")}
      <div style={{ padding: "8px 12px", background: "rgba(139,92,246,0.08)", borderRadius: 8, fontSize: 11, color: TH.text2 }}>
        ✨ Auto-crée : Rack Rn → ODF1 → Slot S01 → 12 ports
      </div>
    </>;

    if (tab === "racks") return <>
      {sel("Site", "site_id",
        sites.map(s => ({ value: s.id, label: `${s.name} (${s.id})` })),
        ["salle_id"])}
      {sel("Salle", "salle_id",
        salles
          .filter(s => !form.site_id || s.site_id === form.site_id)
          .map(s => ({ value: s.id, label: `${s.name} (${s.id})` })))}
      {inp("Nom Rack (ex: R2)", "name", "R2")}
      {inp("Description", "description")}
      <div style={{ padding: "8px 12px", background: "rgba(6,182,212,0.08)", borderRadius: 8, fontSize: 11, color: TH.text2 }}>
        ✨ Auto-crée : ODF1 → Slot S01 → 12 ports
      </div>
    </>;

    if (tab === "odfs") return <>
      {/* Filtre salle : réduit la liste des racks affichés */}
      {sel("🏢 Filtrer par Salle", "salle_id",
        salles.map(s => ({ value: s.id, label: `${s.name} (${s.id})` })),
        ["rack_id"])}
      {sel("Rack", "rack_id",
        racks
          .filter(r => !form.salle_id || r.salle_id === form.salle_id)
          .map(r => {
            const salle = salles.find(s => s.id === r.salle_id);
            return { value: r.id, label: `${r.name} — ${r.id}  🏢 ${salle?.name || r.salle_id || "—"}` };
          }))}
      {inp("Nom ODF (ex: ODF2)", "name", "ODF2")}
      {sel("Type", "odf_type", [{ value: "EXTERNE", label: "EXTERNE" }, { value: "INTERNE", label: "INTERNE (iODF)" }])}
      {inp("Route / Description", "route")}
      <div style={{ padding: "8px 12px", background: "rgba(16,185,129,0.08)", borderRadius: 8, fontSize: 11, color: TH.text2 }}>
        ✨ Auto-crée : Slot S01 → 12 ports
      </div>
    </>;

    if (tab === "slots") return <>
      {/* Filtre salle : réduit la liste des ODFs affichés */}
      {sel("🏢 Filtrer par Salle", "salle_id",
        salles.map(s => ({ value: s.id, label: `${s.name} (${s.id})` })))}
      {sel("ODF", "odf_id",
        odfs
          .filter(o => {
            if (!form.salle_id) return true;
            const rack = racks.find(r => r.id === o.rack_id);
            return rack?.salle_id === form.salle_id;
          })
          .map(o => ({ value: o.id, label: `${o.name} — ${o.id}${salleLabel(o.rack_id)}` })))}
      {inp("Nom Slot (ex: S02)", "name", "S02")}
      <div style={{ padding: "8px 12px", background: "rgba(245,158,11,0.08)", borderRadius: 8, fontSize: 11, color: TH.text2 }}>
        ✨ Auto-crée : 12 ports
      </div>
    </>;
  };

  /* ── Rendu d'une ligne selon le tab ── */
  const renderRow = (row) => {
    const badge = (txt, color) => (
      <span style={{ background: `${color}20`, color, border: `1px solid ${color}50`,
        borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{txt}</span>
    );
    if (tab === "sites")  return <>{badge(row.id, "#3B82F6")} <strong style={{ color: TH.text1 }}>{row.name}</strong> <span style={{ color: TH.text3, fontSize: 11 }}>{row.description}</span></>;
    if (tab === "salles") return <>{badge(row.id, "#8B5CF6")} <strong style={{ color: TH.text1 }}>{row.name}</strong> <span style={{ color: TH.text3, fontSize: 11 }}>→ Site : {row.site_id}</span></>;
    if (tab === "racks") {
      const salle = salles.find(s => s.id === row.salle_id);
      return <>{badge(row.id, "#06B6D4")} <strong style={{ color: TH.text1 }}>{row.name}</strong> <span style={{ color: TH.text3, fontSize: 11 }}>→ Site : {row.site_id} / 🏢 Salle : {salle?.name || row.salle_id || "—"}</span></>;
    }
    if (tab === "odfs") {
      const rack = racks.find(r => r.id === row.rack_id);
      const salle = salles.find(s => s.id === rack?.salle_id);
      return <>{badge(row.odf_type || "EXTERNE", row.odf_type === "INTERNE" ? "#A78BFA" : "#3B82F6")} <strong style={{ color: TH.text1 }}>{row.name || row.id}</strong> <span style={{ color: TH.text3, fontSize: 11 }}>🏢 {salle?.name || rack?.salle_id || "—"} / {row.route || row.rack_id}</span></>;
    }
    if (tab === "slots") {
      const odf = odfs.find(o => o.id === row.odf_id);
      const rack = racks.find(r => r.id === odf?.rack_id);
      const salle = salles.find(s => s.id === rack?.salle_id);
      return <>{badge(row.name, "#F59E0B")} <span style={{ color: TH.text3, fontSize: 11 }}>ODF : {row.odf_id}{salle ? `  🏢 ${salle.name}` : ""}</span></>;
    }
  };

  const activeTab = TABS.find(t => t.key === tab);

  return (
    <div style={{ padding: 24, height: "100%", overflowY: "auto" }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map(tb => (
          <button key={tb.key} onClick={() => { setTab(tb.key); setShowAdd(false); setForm({}); setError(null); }}
            style={{ padding: "8px 16px", borderRadius: 10, border: `2px solid ${tab === tb.key ? tb.color : "transparent"}`,
              background: tab === tb.key ? `${tb.color}18` : `${TH.bgCard}`,
              color: tab === tb.key ? tb.color : TH.text2, cursor: "pointer", fontWeight: tab === tb.key ? 700 : 400,
              fontSize: 13, transition: "all .15s" }}>
            {tb.label}
          </button>
        ))}
        <button onClick={() => { setShowAdd(s => !s); setForm({}); setError(null); }}
          style={{ marginLeft: "auto", padding: "8px 18px", borderRadius: 10, border: "none",
            background: activeTab.color, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
          {showAdd ? "✕ Annuler" : `+ Ajouter ${activeTab.label}`}
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showAdd && (
        <div style={{ background: TH.bgCard, border: `1px solid ${activeTab.color}40`, borderRadius: 14,
          padding: 20, marginBottom: 20, maxWidth: 480 }}>
          <div style={{ fontWeight: 700, color: activeTab.color, marginBottom: 16, fontSize: 14 }}>
            Nouveau — {activeTab.label}
          </div>
          {renderForm()}
          {error && (
            <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 12,
              color: "#EF4444", marginBottom: 12 }}>
              ⚠️ {error}
            </div>
          )}
          <button onClick={doAdd} disabled={saving}
            style={{ marginTop: 8, width: "100%", padding: "10px", borderRadius: 10, border: "none",
              background: activeTab.color, color: "#fff", fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, fontSize: 14 }}>
            {saving ? "Création en cours…" : "✓ Créer"}
          </button>
        </div>
      )}

      {/* Breadcrumb hiérarchie */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 11, color: TH.text3 }}>
        {TABS.map((tb, i) => (
          <span key={tb.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: tb.key === tab ? tb.color : TH.text3, fontWeight: tb.key === tab ? 700 : 400 }}>{tb.label}</span>
            {i < TABS.length - 1 && <span>→</span>}
          </span>
        ))}
        <span style={{ marginLeft: 4 }}>→ <span style={{ color: "#F87171" }}>🔌 Ports (×12)</span></span>
      </div>

      {/* Liste */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map(row => (
          <div key={row.id} style={{ display: "flex", alignItems: "center", gap: 12,
            background: TH.bgCard, border: `1px solid ${TH.border}`, borderRadius: 10,
            padding: "10px 14px", transition: "border-color .15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = activeTab.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = TH.border}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {renderRow(row)}
            </div>
            <button onClick={() => setConfirm(row.id)}
              style={{ background: "transparent", border: `1px solid ${TH.red}`, borderRadius: 6,
                padding: "3px 8px", color: TH.red, cursor: "pointer", fontSize: 11, flexShrink: 0 }}>✕</button>
          </div>
        ))}
        {!rows.length && (
          <div style={{ textAlign: "center", padding: "48px 24px", color: TH.text3 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div>Aucun élément — cliquez sur "+ Ajouter" pour créer</div>
          </div>
        )}
      </div>

      {/* Confirm delete */}
      {confirm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center",
          justifyContent: "center", background: "rgba(0,0,0,0.7)" }}>
          <div style={{ background: TH.bgCard, border: `1px solid ${TH.border}`, borderRadius: 14,
            padding: 32, textAlign: "center", maxWidth: 320 }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>⚠️</div>
            <div style={{ color: TH.text1, marginBottom: 8, fontWeight: 700 }}>Supprimer ?</div>
            <div style={{ color: TH.text3, fontSize: 12, marginBottom: 20 }}>
              ID: <code style={{ color: TH.red }}>{confirm}</code><br />
              Tous les éléments enfants seront supprimés en cascade.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => doDelete(confirm)}
                style={{ padding: "8px 20px", borderRadius: 8, background: TH.red, border: "none", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                Supprimer
              </button>
              <button onClick={() => setConfirm(null)}
                style={{ padding: "8px 20px", borderRadius: 8, background: TH.bgHover, border: `1px solid ${TH.border}`, color: TH.text2, cursor: "pointer" }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
