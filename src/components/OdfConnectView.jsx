import { useState, useEffect } from "react";
import { getSites, getSalles, getRacks, getOdfs, getSlots, createCable, deleteCable } from "../supabase.js";
import { supabase } from "../supabase.js";

/* ─── helpers ─── */
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

/* ─── Sélecteur en cascade Site→Salle→Rack→ODF(→Slot) ─── */
function InfraSelector({ label, color, onChange, TH, excludeSiteId = "", excludeSalleId = "", forcedSiteId = "", connType = "slot", typeLien = "EXTERNE" }) {
  const [sites, setSites] = useState([]);
  const [salles, setSalles] = useState([]);
  const [racks, setRacks] = useState([]);
  const [odfs, setOdfs] = useState([]);
  const [slots, setSlots] = useState([]);

  const [site, setSite] = useState("");
  const [salle, setSalle] = useState("");
  const [rack, setRack] = useState("");
  const [odf, setOdf] = useState("");
  const [slot, setSlot] = useState("");

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
    setSalle(""); setRack(""); setOdf(""); setSlot("");
    setSalles([]); setRacks([]); setOdfs([]); setSlots([]);
    if (site) getSalles(site).then(r => setSalles(r.data || []));
  }, [site]);

  // CASCADE salle → racks
  useEffect(() => {
    setRack(""); setOdf(""); setSlot("");
    setRacks([]); setOdfs([]); setSlots([]);
    if (site) getRacks(site, salle || null).then(r => setRacks(r.data || []));
  }, [salle, site]);

  // CASCADE rack → ODFs (avec filtrage des ODF complets ou partiellement complets)
  useEffect(() => {
    setOdf(""); setSlot("");
    setOdfs([]); setSlots([]);
    if (rack) {
      getOdfs(rack).then(async (r) => {
        const odfList = r.data || [];
        if (odfList.length === 0) return;

        // Récupérer les slots et câbles existants
        const [slotsRes, cablesRes] = await Promise.all([
          supabase.from("slots").select("id, odf_id").in("odf_id", odfList.map(o => o.id)),
          supabase.from("cables_fibre").select("port_source_id, port_dest_id, type_lien")
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

        // Déterminer en temps réel quels ODFs ont déjà des câbles et de quels types ils sont
        const odfCablesMap = {}; // odf_id -> Set of type_lien of cables connected to it
        (cablesRes.data || []).forEach(c => {
          const srcOdf = c.port_source_id ? c.port_source_id.split('_')[0] : null;
          const dstOdf = c.port_dest_id ? c.port_dest_id.split('_')[0] : null;
          if (srcOdf) {
            if (!odfCablesMap[srcOdf]) odfCablesMap[srcOdf] = new Set();
            odfCablesMap[srcOdf].add(c.type_lien);
          }
          if (dstOdf) {
            if (!odfCablesMap[dstOdf]) odfCablesMap[dstOdf] = new Set();
            odfCablesMap[dstOdf].add(c.type_lien);
          }
        });

        let filteredOdfs = [];

        if (connType === "odf") {
          // Pour ODF entier, TOUS les slots doivent être complètement libres (aucune occupation de ports)
          filteredOdfs = odfList.filter(o => {
            // Vérifier si le type de l'ODF dans la DB est compatible (vide/NULL, ou correspond au type de connexion demandé)
            const isCompatibleType = !o.odf_type || o.odf_type === typeLien;
            if (!isCompatibleType) return false;

            const odfSlots = slotsByOdf[o.id] || [];
            if (odfSlots.length === 0) return false;
            return odfSlots.every(slotId => !occupiedSlots.has(slotId));
          });
        } else {
          // Pour Slot individuel, au moins 1 slot doit être libre
          filteredOdfs = odfList.filter(o => {
            // Vérifier si le type de l'ODF dans la DB est compatible (vide/NULL, ou correspond au type de connexion demandé)
            const isCompatibleType = !o.odf_type || o.odf_type === typeLien;
            if (!isCompatibleType) return false;

            const odfSlots = slotsByOdf[o.id] || [];
            if (odfSlots.length === 0) return false;
            return odfSlots.some(slotId => !occupiedSlots.has(slotId));
          });
        }

        setOdfs(filteredOdfs);
      });
    }
  }, [rack, connType, typeLien]);

  // CASCADE ODF → slots (seulement en mode slot)
  useEffect(() => {
    setSlot(""); setSlots([]);
    if (odf && connType === "slot") {
      getSlots(odf).then(async (r) => {
        const slotList = r.data || [];
        if (slotList.length === 0) return;

        // Récupérer les câbles existants
        const cablesRes = await supabase.from("cables_fibre").select("port_source_id, port_dest_id");

        const occupiedSlots = new Set();
        (cablesRes.data || []).forEach(c => {
          if (c.port_source_id) occupiedSlots.add(c.port_source_id.slice(0, -3));
          if (c.port_dest_id) occupiedSlots.add(c.port_dest_id.slice(0, -3));
        });

        const availableSlots = slotList.filter(s => !occupiedSlots.has(s.id));
        setSlots(availableSlots);
      });
    }
  }, [odf, connType]);

  // Notifier le parent
  useEffect(() => {
    onChange({ site, salle, rack, odf, slot });
  }, [site, salle, rack, odf, slot]);

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
            <Label TH={TH}>Slot (1 slot = 12 ports connectés automatiquement)</Label>
            <Sel value={slot} onChange={setSlot} TH={TH} disabled={!odf}>
              <option value="">— Sélectionner un slot —</option>
              {slots.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Sel>
          </div>
        )}
      </div>
      {connType === "slot" ? (
        <SlotPortPreview slotId={slot} label={`Ports du slot ${slot?.split("_").pop() || ""}`} color={color} TH={TH} />
      ) : (
        <OdfSlotsPreview odfId={odf} color={color} TH={TH} />
      )}
    </div>
  );
}

/* ─── OdfConnectView principal ─── */
export default function OdfConnectView({ t, TH }) {
  const [activeTab, setActiveTab] = useState("create"); // "create" | "manage"
  const [mode, setMode] = useState("externe"); // "externe" | "intersalle"
  const [connType, setConnType] = useState("odf"); // "odf" | "slot"

  const [src, setSrc] = useState({ site: "", salle: "", rack: "", odf: "", slot: "" });
  const [dst, setDst] = useState({ site: "", salle: "", rack: "", odf: "", slot: "" });

  const [cableRef, setCableRef] = useState("");
  const [typeFibre, setTypeFibre] = useState("Monomode");

  // Liste des connexions
  const [cables, setCables] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState(""); // "" | "EXTERNE" | "JARRETIERE"
  const [loadingCables, setLoadingCables] = useState(false);
  const [expandedCableId, setExpandedCableId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [err, setErr] = useState("");

  // Réinitialiser les sélections en cas de changement de mode ou type connexion
  useEffect(() => {
    setSrc({ site: "", salle: "", rack: "", odf: "", slot: "" });
    setDst({ site: "", salle: "", rack: "", odf: "", slot: "" });
    setErr(""); setSuccess("");
  }, [mode, connType]);

  // Charger les connexions
  const loadCablesList = () => {
    setLoadingCables(true);
    supabase.from('cables_fibre').select(`
      *,
      port_source:ports!cables_fibre_port_source_id_fkey(
        id, slot_port, slot_id,
        slots(id, name, slot_num,
          odfs(id, name, odf_type,
            racks(id, name,
              salles(id, name,
                sites(id, name)
              )
            )
          )
        )
      ),
      port_dest:ports!cables_fibre_port_dest_id_fkey(
        id, slot_port, slot_id,
        slots(id, name, slot_num,
          odfs(id, name, odf_type,
            racks(id, name,
              salles(id, name,
                sites(id, name)
              )
            )
          )
        )
      )
    `).order('cable_reference')
    .then(r => {
      setCables(r.data || []);
      setLoadingCables(false);
    }).catch(() => setLoadingCables(false));
  };

  useEffect(() => {
    if (activeTab === "manage") {
      loadCablesList();
    }
  }, [activeTab]);

  // Auto-générer la référence câble
  useEffect(() => {
    if (src.site) {
      const targetSite = mode === "intersalle" ? src.site : dst.site;
      if (targetSite) {
        const type = mode === "externe" ? "CBL" : "JAR";
        setCableRef(`${type}-${src.site}-${targetSite}-${String(Date.now()).slice(-4)}`);
      }
    }
  }, [src.site, dst.site, mode]);

  const canCreate = connType === "odf"
    ? src.odf && dst.odf && src.odf !== dst.odf
    : src.slot && dst.slot && src.slot !== dst.slot;

  const doCreate = async () => {
    if (!canCreate) return;
    setSaving(true); setErr(""); setSuccess("");
    try {
      if (connType === "odf") {
        // --- Création globale par ODF entier ---
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
        
        // Relier chaque slot un à un
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

          // Note: Les ports restent au statut LIBRE à la création.
          // Ils passeront OCCUPE lorsqu'un service utilisera ces ports.
        }

        setSuccess(`✅ Connexion par ODF entier créée ! ${sSlots.length} slots raccordés (${sSlots.length * 12} ports connectés).`);
      } else {
        // --- Création par Slot unique ---
        const [srcPorts, dstPorts] = await Promise.all([
          supabase.from("ports").select("id,slot_port,statut").eq("slot_id", src.slot).order("slot_port"),
          supabase.from("ports").select("id,slot_port,statut").eq("slot_id", dst.slot).order("slot_port"),
        ]);
        const sp = (srcPorts.data || []).filter(p => p.statut === "LIBRE");
        const dp = (dstPorts.data || []).filter(p => p.statut === "LIBRE");
        if (sp.length === 0 || dp.length === 0) {
          throw new Error("Aucun port libre disponible dans l'un des slots sélectionnés.");
        }
        const typeLien = mode === "externe" ? "EXTERNE" : "INTERNE";
        const { error } = await createCable({
          cable_reference: cableRef,
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
        if (error) throw error;

        // Note: Les ports restent au statut LIBRE à la création.
        // Ils passeront OCCUPE lorsqu'un service utilisera ces ports.

        setSuccess(`✅ Connexion créée ! Câble ${cableRef} — ports raccordés.`);
      }

      setCableRef(""); 
      setSrc({ site: "", salle: "", rack: "", odf: "", slot: "" }); 
      setDst({ site: "", salle: "", rack: "", odf: "", slot: "" });
    } catch (e) {
      setErr("Erreur : " + (e.message || JSON.stringify(e)));
    }
    setSaving(false);
  };

  const doDelete = async (cable) => {
    if (!window.confirm(`Confirmez-vous la suppression de la connexion ${cable.cable_reference} ? \n(Attention : cela supprimera également tous les services actifs utilisant cette liaison, et remettra les ports en LIBRE)`)) return;
    setSaving(true); setErr(""); setSuccess("");
    try {
      const { error: svcErr } = await supabase.from("services").delete().eq("cable_id", cable.id);
      if (svcErr) throw svcErr;

      const { error } = await deleteCable(cable.id);
      if (error) throw error;

      const srcSlotId = cable.port_source_id ? cable.port_source_id.slice(0, -3) : null;
      const dstSlotId = cable.port_dest_id ? cable.port_dest_id.slice(0, -3) : null;

      if (srcSlotId && dstSlotId) {
        await Promise.all([
          supabase.from("ports").update({ statut: "LIBRE" }).eq("slot_id", srcSlotId),
          supabase.from("ports").update({ statut: "LIBRE" }).eq("slot_id", dstSlotId),
        ]);
      }

      setSuccess(`✅ Connexion ${cable.cable_reference} et services associés supprimés avec succès.`);
      loadCablesList();
    } catch (e) {
      setErr("Erreur suppression : " + (e.message || JSON.stringify(e)));
    }
    setSaving(false);
  };

  const [expandedPorts, setExpandedPorts] = useState({ src: {}, dst: {} });

  const handleExpand = async (cable) => {
    if (expandedCableId === cable.id) {
      setExpandedCableId(null);
      return;
    }
    
    setExpandedCableId(cable.id);
    setExpandedPorts({ src: {}, dst: {} });

    const srcSlotId = cable.port_source_id ? cable.port_source_id.slice(0, -3) : null;
    const dstSlotId = cable.port_dest_id ? cable.port_dest_id.slice(0, -3) : null;

    if (srcSlotId && dstSlotId) {
      try {
        const [srcPortsRes, dstPortsRes] = await Promise.all([
          supabase.from("ports").select("slot_port, statut, cid").eq("slot_id", srcSlotId),
          supabase.from("ports").select("slot_port, statut, cid").eq("slot_id", dstSlotId)
        ]);

        const srcMap = {};
        (srcPortsRes.data || []).forEach(p => {
          srcMap[p.slot_port.slice(-3)] = { statut: p.statut, cid: p.cid };
        });

        const dstMap = {};
        (dstPortsRes.data || []).forEach(p => {
          dstMap[p.slot_port.slice(-3)] = { statut: p.statut, cid: p.cid };
        });

        setExpandedPorts({ src: srcMap, dst: dstMap });
      } catch (err) {
        console.error("Error loading port statuses:", err);
      }
    }
  };

  const getPortDisplay = (port) => {
    if (!port || !port.slots) return "—";
    const slot = port.slots;
    const odf = slot.odfs;
    const rack = odf?.racks;
    const salle = rack?.salles;
    const site = salle?.sites;
    const parts = [
      site?.id || "",
      salle?.name || "",
      rack?.name || "",
      odf?.name || "",
      port.slot_port || ""
    ].filter(Boolean);
    return parts.join("-");
  };

  const filteredCables = cables.filter(c => {
    const term = searchQuery.toLowerCase();
    const matchSearch =
      (c.cable_reference || "").toLowerCase().includes(term) ||
      (c.nom || "").toLowerCase().includes(term) ||
      (c.type_fibre || "").toLowerCase().includes(term);

    const matchType = !searchType || c.type_lien === searchType;
    return matchSearch && matchType;
  });

  const getPortPaths = (cable, pNum) => {
    const pStr = String(pNum).padStart(2, '0');
    
    const src = cable.port_source;
    let pathSrc = "—";
    if (src && src.slots) {
      const slot = src.slots;
      const odf = slot.odfs;
      const rack = odf?.racks;
      const salle = rack?.salles;
      const site = salle?.sites;
      pathSrc = `${site?.name || "Site"} / Salle ${salle?.name || "Salle"} / ${rack?.name || "Rack"} / ${odf?.name || "ODF"} / Slot ${slot?.name || "Slot"} / Port ${slot?.name || "Slot"}P${pStr}`;
    }

    const dst = cable.port_dest;
    let pathDst = "—";
    if (dst && dst.slots) {
      const slot = dst.slots;
      const odf = slot.odfs;
      const rack = odf?.racks;
      const salle = rack?.salles;
      const site = salle?.sites;
      pathDst = `${site?.name || "Site"} / Salle ${salle?.name || "Salle"} / ${rack?.name || "Rack"} / ${odf?.name || "ODF"} / Slot ${slot?.name || "Slot"} / Port ${slot?.name || "Slot"}P${pStr}`;
    }

    return { src: pathSrc, dst: pathDst };
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Onglets Principaux ── */}
      <div style={{ display: "flex", borderBottom: `1px solid ${TH.border}`, background: TH.bgSurface, flexShrink: 0 }}>
        <button onClick={() => { setActiveTab("create"); setErr(""); setSuccess(""); }}
          style={{
            flex: 1, padding: "16px", background: activeTab === "create" ? "rgba(255,255,255,.03)" : "transparent",
            color: activeTab === "create" ? TH.blue : TH.text2, border: "none",
            borderBottom: `2px solid ${activeTab === "create" ? TH.blue : "transparent"}`,
            fontSize: "14px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s"
          }}>
          🔌 Nouvelle interconnexion
        </button>
        <button onClick={() => { setActiveTab("manage"); setErr(""); setSuccess(""); }}
          style={{
            flex: 1, padding: "16px", background: activeTab === "manage" ? "rgba(255,255,255,.03)" : "transparent",
            color: activeTab === "manage" ? TH.blue : TH.text2, border: "none",
            borderBottom: `2px solid ${activeTab === "manage" ? TH.blue : "transparent"}`,
            fontSize: "14px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s"
          }}>
          🔍 Gérer les connexions existantes ({cables.length})
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

        {err && <div style={{ background: "rgba(248,113,113,.12)", border: "1px solid rgba(248,113,113,.3)", borderRadius: "10px", padding: "12px 16px", color: "#F87171", fontSize: "13px", marginBottom: "16px" }}>{err}</div>}
        {success && <div style={{ background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.3)", borderRadius: "10px", padding: "12px 16px", color: "#34D399", fontSize: "13px", marginBottom: "16px" }}>{success}</div>}

        {/* ── CONTENU : CRÉATION ── */}
        {activeTab === "create" && (
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
        )}

        {/* ── CONTENU : VISUALISATION & SUPPRESSION ── */}
        {activeTab === "manage" && (
          <div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 Rechercher par réf. câble, nom, type fibre..."
                style={{
                  flex: 3, minWidth: "200px", background: TH.bgInput, border: `1px solid ${TH.border}`,
                  borderRadius: "8px", padding: "9px 12px", color: TH.text1, fontSize: "13px", outline: "none"
                }} />
              <Sel value={searchType} onChange={setSearchType} TH={TH} style={{ flex: 1, minWidth: "140px" }}>
                <option value="">Tous les types</option>
                <option value="EXTERNE">🌐 EXTERNE</option>
                <option value="INTERNE">🏢 INTERNE</option>
              </Sel>
            </div>

            {loadingCables ? (
              <div style={{ textAlign: "center", padding: "40px", color: TH.text3 }}>Chargement des connexions…</div>
            ) : filteredCables.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: TH.text3 }}>Aucune connexion trouvée</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: TH.bgSurface, borderBottom: `2px solid ${TH.border}` }}>
                    <th style={{ width: "30px", padding: "10px 12px" }}></th>
                    {["Référence", "Nom", "Type", "Fibre", "Port Source", "Port Dest", "Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: TH.text3, fontWeight: 600, fontSize: "11px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCables.map((c, i) => {
                    const isExpanded = expandedCableId === c.id;
                    return (
                      <>
                        <tr key={c.id} style={{ borderBottom: `1px solid ${TH.border}`, background: i % 2 === 0 ? "transparent" : TH.bgHover }}>
                          <td style={{ padding: "10px 12px", textAlign: "center", cursor: "pointer", color: TH.blue }}
                              onClick={() => handleExpand(c)}>
                            {isExpanded ? "▼" : "▶"}
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono',monospace", color: TH.text1, fontWeight: 600 }}>{c.cable_reference}</td>
                          <td style={{ padding: "10px 12px", color: TH.text2 }}>{c.nom}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{
                              background: c.type_lien === "EXTERNE" 
                                ? "rgba(59,130,246,.15)" 
                                : "rgba(245,158,11,.15)",
                              color: c.type_lien === "EXTERNE" 
                                ? "#3B82F6" 
                                : "#F59E0B",
                              border: `1px solid ${
                                c.type_lien === "EXTERNE" 
                                  ? "rgba(59,130,246,.3)" 
                                  : "rgba(245,158,11,.3)"
                              }`,
                              borderRadius: "6px", padding: "2px 8px", fontSize: "10px", fontWeight: 700
                            }}>
                              {c.type_lien === "EXTERNE" ? "EXTERNE" : "INTERNE"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", color: TH.text2 }}>{c.type_fibre}</td>
                          <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: TH.text3 }}>{getPortDisplay(c.port_source)}</td>
                          <td style={{ padding: "10px 12px", fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: TH.text3 }}>{getPortDisplay(c.port_dest)}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <button onClick={() => doDelete(c)}
                              style={{
                                background: "rgba(248,113,113,.15)", color: "#F87171", border: "1px solid rgba(248,113,113,.3)",
                                borderRadius: "6px", padding: "4px 8px", fontSize: "11px", fontWeight: 600, cursor: "pointer"
                              }}>
                              ✕ Supprimer
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr style={{ background: TH.bgSurface }}>
                            <td colSpan={8} style={{ padding: "16px 20px" }}>
                              <div style={{ background: TH.bgCard, border: `1px solid ${TH.border}`, borderRadius: "10px", padding: "16px" }}>                                 <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                                  <thead>
                                    <tr style={{ borderBottom: `1px solid ${TH.border}`, background: TH.bgInput }}>
                                      <th style={{ padding: "8px 12px", textAlign: "left", color: TH.text3, width: "130px", fontWeight: 600 }}>CID</th>
                                      <th style={{ padding: "8px 12px", textAlign: "left", color: TH.text3, fontWeight: 600 }}>chemin_source</th>
                                      <th style={{ padding: "8px 12px", textAlign: "center", color: TH.text3, width: "100px", fontWeight: 600 }}>statut_source</th>
                                      <th style={{ padding: "8px 12px", textAlign: "center", color: TH.text3, width: "50px", fontWeight: 600 }}>liaison</th>
                                      <th style={{ padding: "8px 12px", textAlign: "left", color: TH.text3, fontWeight: 600 }}>chemin_destination</th>
                                      <th style={{ padding: "8px 12px", textAlign: "center", color: TH.text3, width: "100px", fontWeight: 600 }}>statut_dest</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Array.from({ length: 12 }, (_, index) => {
                                      const paths = getPortPaths(c, index + 1);
                                      const pStr = 'P' + String(index + 1).padStart(2, '0');
                                      
                                      const srcPortObj = expandedPorts.src[pStr] || { statut: "LIBRE", cid: null };
                                      const dstPortObj = expandedPorts.dst[pStr] || { statut: "LIBRE", cid: null };

                                      const rowCid = srcPortObj.cid || dstPortObj.cid || "—";
                                      
                                      // Status is considered OCCUPE if a CID is assigned, otherwise LIBRE
                                      const srcStatus = srcPortObj.cid ? "OCCUPE" : "LIBRE";
                                      const dstStatus = dstPortObj.cid ? "OCCUPE" : "LIBRE";

                                      const getStatusBadge = (status) => (
                                        <span style={{
                                          background: status === "LIBRE" ? "rgba(16,185,129,.15)" : "rgba(248,113,113,.15)",
                                          color: status === "LIBRE" ? "#34D399" : "#F87171",
                                          borderRadius: "4px", padding: "2px 6px", fontSize: "10px", fontWeight: 700
                                        }}>
                                          {status}
                                        </span>
                                      );

                                      return (
                                        <tr key={index} style={{ borderBottom: `1px solid ${TH.border}55`, background: index % 2 === 0 ? "transparent" : TH.bgHover }}>
                                          <td style={{ padding: "7px 12px", fontFamily: "'JetBrains Mono',monospace", color: rowCid !== "—" ? TH.cyan : TH.text3, fontWeight: rowCid !== "—" ? 600 : 400 }}>{rowCid}</td>
                                          <td style={{ padding: "7px 12px", fontFamily: "'JetBrains Mono',monospace", color: TH.text2 }}>{paths.src}</td>
                                          <td style={{ padding: "7px 12px", textAlign: "center" }}>{getStatusBadge(srcStatus)}</td>
                                          <td style={{ padding: "7px 12px", textAlign: "center", color: TH.blue, fontWeight: 700 }}>➔</td>
                                          <td style={{ padding: "7px 12px", fontFamily: "'JetBrains Mono',monospace", color: TH.text2 }}>{paths.dst}</td>
                                          <td style={{ padding: "7px 12px", textAlign: "center" }}>{getStatusBadge(dstStatus)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
