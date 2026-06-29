import React, { useState, useEffect } from "react";
import { supabase, getSites, getSalles, getRacks, getOdfs, getSlots } from "../../supabase.js";

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

function Label({ children, TH }) {
  return <label style={{ display: "block", color: TH.text2, fontSize: "11px", fontWeight: 600, marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{children}</label>;
}

function SlotPortPreview({ slotId, label, color, TH }) {
  const [ports, setPorts] = useState([]);
  useEffect(() => {
    if (!slotId) { setPorts([]); return; }
    supabase.from("ports").select("id,slot_port,statut").eq("slot_id", slotId).order("slot_port")
      .then(r => setPorts(r.data || []));
  }, [slotId]);

  if (!slotId) return null;
  const libres = ports.filter(p => p.statut === "LIBRE").length;
  const occupes = ports.filter(p => p.statut === "OCCUPE").length;

  return (
    <div style={{ marginTop: "10px", background: TH.bgSurface, border: `1px solid ${color}44`, borderRadius: "8px", padding: "10px 14px" }}>
      <div style={{ fontSize: "11px", color, fontWeight: 700, marginBottom: "6px" }}>{label}</div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {ports.map(p => (
          <span key={p.id} style={{
            fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", padding: "2px 7px",
            borderRadius: "4px", fontWeight: 600,
            background: p.statut === "LIBRE" ? "rgba(16,185,129,.15)" : p.statut === "OCCUPE" ? "rgba(248,113,113,.15)" : "rgba(251,191,36,.15)",
            color: p.statut === "LIBRE" ? "#34D399" : p.statut === "OCCUPE" ? "#F87171" : "#FBBF24",
          }}>{p.slot_port}</span>
        ))}
      </div>
      <div style={{ fontSize: "10px", color: TH.text3, marginTop: "6px" }}>
        {libres} libres · {occupes} occupés
        {libres < 12 && <span style={{ color: "#FBBF24", marginLeft: "8px" }}>⚠ Slots partiellement occupés</span>}
      </div>
    </div>
  );
}

function OdfSlotsPreview({ odfId, color, TH }) {
  const [slotsCount, setSlotsCount] = useState(0);
  useEffect(() => {
    if (!odfId) { setSlotsCount(0); return; }
    supabase.from("slots").select("id").eq("odf_id", odfId)
      .then(r => setSlotsCount((r.data || []).length));
  }, [odfId]);

  if (!odfId || slotsCount === 0) return null;
  return (
    <div style={{ marginTop: "10px", background: TH.bgSurface, border: `1px solid ${color}44`, borderRadius: "8px", padding: "10px 14px", fontSize: "11px", color: TH.text2 }}>
      ℹ Cet ODF contient <strong>{slotsCount} slots</strong> qui seront tous reliés (soit {slotsCount * 12} ports connectés automatiquement).
    </div>
  );
}

function MultiSlotSelect({ slots, selected, onChange, TH, disabled }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSlot = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(item => item !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  if (disabled) {
    return (
      <div style={{
        width: "100%", background: TH.bgInput, border: `1px solid ${TH.border}`,
        borderRadius: "8px", padding: "9px 12px", color: TH.text3,
        fontSize: "13px", cursor: "not-allowed", opacity: 0.6, boxSizing: "border-box"
      }}>
        — Sélectionner un ODF d'abord —
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%", background: TH.bgInput, border: `1px solid ${TH.border2}`,
          borderRadius: "8px", padding: "9px 12px", color: TH.text1,
          fontSize: "13px", cursor: "pointer", display: "flex", justifyContent: "space-between",
          alignItems: "center", boxSizing: "border-box"
        }}
      >
        <span>
          {selected.length === 0 
            ? "— Choisir un ou plusieurs slots —" 
            : `${selected.length} slot(s) sélectionné(s) (${selected.map(id => id.split("_").pop()).join(", ")})`}
        </span>
        <span style={{ fontSize: "10px", color: TH.text3 }}>{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} style={{ position: "fixed", top: 0, bottom: 0, left: 0, right: 0, zIndex: 99 }} />
          <div style={{
            position: "absolute", top: "100%", left: 0, right: 0, 
            background: TH.bgSurface, border: `1px solid ${TH.border}`, 
            borderRadius: "8px", marginTop: "4px", zIndex: 100, 
            maxHeight: "200px", overflowY: "auto", boxShadow: TH.cardShadow,
            padding: "6px"
          }}>
            {slots.length === 0 ? (
              <div style={{ padding: "8px 12px", color: TH.text3, fontSize: "12px" }}>Aucun slot libre</div>
            ) : (
              slots.map(s => {
                const isChecked = selected.includes(s.id);
                return (
                  <label key={s.id} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "6px 10px", borderRadius: "6px", cursor: "pointer",
                    background: isChecked ? "rgba(255,255,255,0.03)" : "transparent",
                    color: TH.text1, fontSize: "12px", userSelect: "none",
                    transition: "background 0.1s"
                  }}>
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => toggleSlot(s.id)}
                      style={{ cursor: "pointer" }}
                    />
                    <span>{s.name}</span>
                  </label>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function InfraSelector({
  label,
  color,
  onChange,
  TH,
  excludeSiteId = "",
  excludeSalleId = "",
  forcedSiteId = "",
  connType = "slot",
  typeLien = "EXTERNE",
}) {
  const [sites, setSites] = useState([]);
  const [salles, setSalles] = useState([]);
  const [racks, setRacks] = useState([]);
  const [odfs, setOdfs] = useState([]);
  const [slots, setSlots] = useState([]);

  const [site, setSite] = useState("");
  const [salle, setSalle] = useState("");
  const [rack, setRack] = useState("");
  const [odf, setOdf] = useState("");
  const [selectedSlots, setSelectedSlots] = useState([]);

  // Chargement initial des sites
  useEffect(() => { getSites().then(r => setSites(r.data || [])); }, []);

  // Forcer le site si demandé (pour connexion interne)
  useEffect(() => {
    if (forcedSiteId) {
      setSite(forcedSiteId);
    }
  }, [forcedSiteId]);

  // CASCADE site → salles
  useEffect(() => {
    setSalle(""); setRack(""); setOdf(""); setSelectedSlots([]);
    setSalles([]); setRacks([]); setOdfs([]); setSlots([]);
    if (site) getSalles(site).then(r => setSalles(r.data || []));
  }, [site]);

  // CASCADE salle → racks
  useEffect(() => {
    setRack(""); setOdf(""); setSelectedSlots([]);
    setRacks([]); setOdfs([]); setSlots([]);
    if (site) getRacks(site, salle || null).then(r => setRacks(r.data || []));
  }, [salle, site]);

  // CASCADE rack → ODFs
  useEffect(() => {
    setOdf(""); setSelectedSlots([]);
    setOdfs([]); setSlots([]);
    if (rack) {
      getOdfs(rack).then(async (r) => {
        const odfList = r.data || [];
        if (odfList.length === 0) return;

        // Récupérer les slots, câbles existants et statut des ports
        const [slotsRes, cablesRes, portsRes] = await Promise.all([
          supabase.from("slots").select("id, odf_id").in("odf_id", odfList.map(o => o.id)),
          supabase.from("cables_fibre").select("port_source_id, port_dest_id, type_lien"),
          supabase.from("ports").select("slot_id, statut").in("odf_id", odfList.map(o => o.id))
        ]);

        const slotsByOdf = {};
        (slotsRes.data || []).forEach(s => {
          if (!slotsByOdf[s.odf_id]) slotsByOdf[s.odf_id] = [];
          slotsByOdf[s.odf_id].push(s.id);
        });

        const occupiedSlots = new Set();
        (cablesRes.data || []).forEach(c => {
          if (c.port_source_id) occupiedSlots.add(c.port_source_id.slice(0, -3));
          if (c.port_dest_id) occupiedSlots.add(c.port_dest_id.slice(0, -3));
        });

        const slotsWithFreePort = new Set();
        (portsRes.data || []).forEach(p => {
          if (p.statut === "LIBRE") slotsWithFreePort.add(p.slot_id);
        });

        let filteredOdfs = [];

        if (connType === "odf") {
          filteredOdfs = odfList.filter(o => {
            const isCompatibleType = !o.odf_type || o.odf_type === typeLien;
            if (!isCompatibleType) return false;

            const odfSlots = slotsByOdf[o.id] || [];
            if (odfSlots.length === 0) return false;
            return odfSlots.every(slotId => !occupiedSlots.has(slotId) && slotsWithFreePort.has(slotId));
          });
        } else {
          filteredOdfs = odfList.filter(o => {
            const isCompatibleType = !o.odf_type || o.odf_type === typeLien;
            if (!isCompatibleType) return false;

            const odfSlots = slotsByOdf[o.id] || [];
            if (odfSlots.length === 0) return false;
            return odfSlots.some(slotId => !occupiedSlots.has(slotId) && slotsWithFreePort.has(slotId));
          });
        }

        setOdfs(filteredOdfs);
      });
    }
  }, [rack, connType, typeLien]);

  // CASCADE ODF → slots
  useEffect(() => {
    setSelectedSlots([]); setSlots([]);
    if (odf && connType === "slot") {
      getSlots(odf).then(async (r) => {
        const slotList = r.data || [];
        if (slotList.length === 0) return;

        const [cablesRes, portsRes] = await Promise.all([
          supabase.from("cables_fibre").select("port_source_id, port_dest_id"),
          supabase.from("ports").select("slot_id, statut").eq("odf_id", odf)
        ]);

        const occupiedSlots = new Set();
        (cablesRes.data || []).forEach(c => {
          if (c.port_source_id) occupiedSlots.add(c.port_source_id.slice(0, -3));
          if (c.port_dest_id) occupiedSlots.add(c.port_dest_id.slice(0, -3));
        });

        const slotsWithFreePort = new Set();
        (portsRes.data || []).forEach(p => {
          if (p.statut === "LIBRE") slotsWithFreePort.add(p.slot_id);
        });

        const availableSlots = slotList.filter(s => !occupiedSlots.has(s.id) && slotsWithFreePort.has(s.id));
        setSlots(availableSlots);
      });
    }
  }, [odf, connType]);

  // Notifier le parent (avec les noms pour la nomenclature de référence)
  useEffect(() => {
    const rackObj = racks.find(r => r.id === rack);
    const salleObj = salles.find(s => s.id === salle);
    const odfObj = odfs.find(o => o.id === odf);
    onChange({
      site, salle, rack, odf, selectedSlots,
      salleName: salleObj?.name || rackObj?.salles?.name || "",
      rackName: rackObj?.name || "",
      odfName: odfObj?.name || "",
    });
  }, [site, salle, rack, odf, selectedSlots]);

  const filteredSitesList = sites.filter(s => s.id !== excludeSiteId);
  const filteredSallesList = salles.filter(s => s.id !== excludeSalleId);

  const g = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" };

  return (
    <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: "14px" }}>
      <div style={{ fontSize: "12px", fontWeight: 700, color, marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>
        {label}
      </div>
      <div style={g}>
        <div>
          <Label TH={TH}>Site</Label>
          <Sel value={site} onChange={setSite} TH={TH} disabled={!!forcedSiteId}>
            <option value="">— Sélectionner un site —</option>
            {filteredSitesList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
          </Sel>
        </div>
        <div>
          <Label TH={TH}>Salle</Label>
          <Sel value={salle} onChange={setSalle} TH={TH} disabled={!site}>
            <option value="">{site ? "Toutes salles" : "— Sélectionner site d'abord —"}</option>
            {filteredSallesList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Sel>
        </div>
        <div>
          <Label TH={TH}>Rack</Label>
          <Sel value={rack} onChange={setRack} TH={TH} disabled={!site}>
            <option value="">— Sélectionner un rack —</option>
            {racks.map(r => <option key={r.id} value={r.id}>{r.name} ({r.id})</option>)}
          </Sel>
        </div>
        <div>
          <Label TH={TH}>ODF</Label>
          <Sel value={odf} onChange={setOdf} TH={TH} disabled={!rack}>
            <option value="">— Sélectionner un ODF —</option>
            {odfs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Sel>
        </div>
        {connType === "slot" && (
          <div style={{ gridColumn: "1/-1" }}>
            <Label TH={TH}>Slots (Cochez le ou les slots souhaités)</Label>
            <MultiSlotSelect 
              slots={slots} 
              selected={selectedSlots} 
              onChange={setSelectedSlots} 
              TH={TH} 
              disabled={!odf}
            />
          </div>
        )}
      </div>
      {connType === "slot" ? (
        selectedSlots.map(sId => (
          <SlotPortPreview key={sId} slotId={sId} label={`Ports du slot ${sId?.split("_").pop() || ""}`} color={color} TH={TH} />
        ))
      ) : (
        <OdfSlotsPreview odfId={odf} color={color} TH={TH} />
      )}
    </div>
  );
}
