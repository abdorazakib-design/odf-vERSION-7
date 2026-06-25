import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabase.js";

// Import search subcomponents
import { HierarchySelectors } from "./search/HierarchySelectors.jsx";
import { Breadcrumbs } from "./search/Breadcrumbs.jsx";
import { ExplorerCards } from "./search/ExplorerCards.jsx";
import { PortTable } from "./search/PortTable.jsx";

export default function SearchView({ t, TH }) {
  // Cascading states
  const [sites, setSites] = useState([]);
  const [salles, setSalles] = useState([]);
  const [racks, setRacks] = useState([]);
  const [odfs, setOdfs] = useState([]);
  const [slots, setSlots] = useState([]);
  
  // Selection states
  const [selSite, setSelSite] = useState("");
  const [selSalle, setSelSalle] = useState("");
  const [selRack, setSelRack] = useState("");
  const [selOdf, setSelOdf] = useState("");
  const [selSlot, setSelSlot] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cidFilter, setCidFilter] = useState("");

  // Loaded ports list
  const [allPorts, setAllPorts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const perPage = 25;

  // 1. Initial Load: Sites
  useEffect(() => {
    supabase.from("sites").select("id, name, description").order("name")
      .then(({ data }) => setSites(data || []));
  }, []);

  // 2. Load Rooms on Site Select
  useEffect(() => {
    setSelSalle(""); setSalles([]);
    if (!selSite) return;
    supabase.from("salles").select("id, name").eq("site_id", selSite).order("name")
      .then(({ data }) => setSalles(data || []));
  }, [selSite]);

  // 3. Load Racks on Room Select
  useEffect(() => {
    setSelRack(""); setRacks([]);
    if (!selSalle) return;
    supabase.from("racks").select("id, name").eq("salle_id", selSalle).order("name")
      .then(({ data }) => setRacks(data || []));
  }, [selSalle]);

  // 4. Load ODFs on Rack Select
  useEffect(() => {
    setSelOdf(""); setOdfs([]);
    if (!selRack) return;
    supabase.from("odfs").select("id, name, odf_type").eq("rack_id", selRack).order("name")
      .then(({ data }) => setOdfs(data || []));
  }, [selRack]);

  // 5. Load Slots on ODF Select
  useEffect(() => {
    setSelSlot(""); setSlots([]);
    if (!selOdf) return;
    supabase.from("slots").select("id, name, slot_num").eq("odf_id", selOdf).order("slot_num")
      .then(({ data }) => setSlots(data || []));
  }, [selOdf]);

  // 6. Fetch Ports
  useEffect(() => {
    setLoading(true);
    let q = supabase.from("ports").select(`
      id, slot_id, slot_port, statut, cid, owner, ot_num, destination, updated_at,
      slots (
        id, name, slot_num,
        odfs (
          id, name, odf_type,
          racks (
            id, name,
            salles ( id, name ),
            sites ( id, name )
          )
        )
      )
    `);

    // Hierarchy filters
    if (selSlot) {
      q = q.eq("slot_id", selSlot);
    } else if (selOdf) {
      q = q.in("slot_id", slots.map(s => s.id));
    } else if (selRack) {
      // Fetch all slots under odfs under the selected rack
      // Since supabase doesn't support nested filter directly in a simple eq,
      // we can filter using inner join if needed, or query keys.
      // But we can filter client-side if the dataset is small, or use standard queries.
      // The original code fetch all ports under a query that gets filtered client-side!
      // Let's verify: Yes, the original code queried 'q' without slot_id if only rack is selected,
      // and then did the filtering client-side or queried all. Let's see the original query logic.
    }

    q.then(({ data }) => {
      setAllPorts(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selSlot, selOdf, slots]);

  // Client-side filtering for performance & search
  const filteredPorts = useMemo(() => {
    return allPorts.filter(p => {
      const rk = p.slots?.odfs?.racks;
      
      // Hierarchical filtering (where not already filtered in query)
      if (selSite && rk?.sites?.id !== selSite) return false;
      if (selSalle && rk?.salles?.id !== selSalle) return false;
      if (selRack && rk?.id !== selRack) return false;
      if (selOdf && p.slots?.odfs?.id !== selOdf) return false;
      if (selSlot && p.slot_id !== selSlot) return false;

      // Filter by Status
      if (statusFilter && p.statut !== statusFilter) return false;

      // Filter by CID
      if (cidFilter && (!p.cid || !p.cid.toLowerCase().includes(cidFilter.toLowerCase()))) return false;

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const siteMatch = rk?.sites?.name?.toLowerCase().includes(q);
        const salleMatch = rk?.salles?.name?.toLowerCase().includes(q);
        const rackMatch = rk?.name?.toLowerCase().includes(q);
        const odfMatch = p.slots?.odfs?.name?.toLowerCase().includes(q);
        const slotMatch = p.slots?.name?.toLowerCase().includes(q);
        const portMatch = p.slot_port?.toLowerCase().includes(q);
        const cidMatch = p.cid?.toLowerCase().includes(q);
        const clientMatch = p.owner?.toLowerCase().includes(q);
        const otMatch = p.ot_num?.toLowerCase().includes(q);
        const destMatch = p.destination?.toLowerCase().includes(q);

        if (!(siteMatch || salleMatch || rackMatch || odfMatch || slotMatch || portMatch || cidMatch || clientMatch || otMatch || destMatch)) {
          return false;
        }
      }

      return true;
    });
  }, [allPorts, selSite, selSalle, selRack, selOdf, selSlot, statusFilter, cidFilter, searchQuery]);

  // Determine current active explorer level
  const explorerLevel = useMemo(() => {
    if (!selSite) return "sites";
    if (!selSalle) return "salles";
    if (!selRack) return "racks";
    if (!selOdf) return "odfs";
    if (!selSlot) return "slots";
    return "ports";
  }, [selSite, selSalle, selRack, selOdf, selSlot]);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setCidFilter("");
    setSelSite("");
    setPage(0);
  };

  const isSearchActive = !!(searchQuery || statusFilter || cidFilter);

  // Paginated ports
  const paginatedPorts = useMemo(() => {
    if (!isSearchActive && explorerLevel !== "ports") return [];
    const start = page * perPage;
    return filteredPorts.slice(start, start + perPage);
  }, [filteredPorts, page, perPage, isSearchActive, explorerLevel]);

  // Breadcrumbs context details
  const ctxCols = useMemo(() => {
    const cols = [];
    if (selSite) cols.push({ label: "Site", val: sites.find(s => s.id === selSite)?.name || selSite, color: "#3B82F6" });
    if (selSalle) cols.push({ label: "Salle", val: salles.find(s => s.id === selSalle)?.name || selSalle, color: "#22D3EE" });
    if (selRack) cols.push({ label: "Rack", val: racks.find(r => r.id === selRack)?.name || selRack, color: "#A78BFA" });
    if (selOdf) cols.push({ label: "ODF", val: odfs.find(o => o.id === selOdf)?.name || selOdf, color: "#FBBF24" });
    if (selSlot) cols.push({ label: "Slot", val: slots.find(s => s.id === selSlot)?.name || selSlot, color: "#10B981" });
    return cols;
  }, [selSite, selSalle, selRack, selOdf, selSlot, sites, salles, racks, odfs, slots]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
      {/* ── TOP FILTER BAR ── */}
      <div style={{ 
        padding: "16px 20px", 
        borderBottom: `1px solid ${TH.border}`, 
        background: TH.bgSurface, 
        display: "flex", 
        gap: "10px", 
        alignItems: "center", 
        flexWrap: "wrap", 
        flexShrink: 0 
      }}>
        <div style={{ position: "relative", flex: 3, minWidth: "220px" }}>
          <input 
            value={searchQuery} 
            onChange={e => { setSearchQuery(e.target.value); setPage(0); }}
            placeholder="🔍 Recherche globale par CID, client, remarques, port ou câble..."
            style={{
              width: "100%", 
              background: TH.bgInput, 
              border: `1px solid ${TH.border}`, 
              borderRadius: "8px", 
              padding: "9px 12px 9px 36px", 
              color: TH.text1, 
              fontSize: "13px", 
              outline: "none"
            }} 
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(""); setPage(0); }}
              style={{
                position: "absolute", 
                right: "10px", 
                top: "50%", 
                transform: "translateY(-50%)",
                background: "none", 
                border: "none", 
                color: TH.text3, 
                cursor: "pointer", 
                fontSize: "14px"
              }}>
              ✕
            </button>
          )}
        </div>

        <select 
          value={statusFilter} 
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          style={{
            flex: 1, 
            minWidth: "130px", 
            background: TH.bgInput, 
            border: `1px solid ${TH.border}`, 
            borderRadius: "8px", 
            padding: "9px 12px", 
            color: TH.text1, 
            fontSize: "13px", 
            outline: "none", 
            cursor: "pointer"
          }}>
          <option value="">Tous les statuts</option>
          <option value="LIBRE">LIBRE</option>
          <option value="OCCUPE">OCCUPE</option>
          <option value="MAUVAIS">MAUVAIS</option>
          <option value="INCONNU">INCONNU</option>
        </select>

        <input 
          value={cidFilter} 
          onChange={e => { setCidFilter(e.target.value); setPage(0); }}
          placeholder="Filtrer par CID"
          style={{
            flex: 1, 
            minWidth: "120px", 
            background: TH.bgInput, 
            border: `1px solid ${TH.border}`, 
            borderRadius: "8px", 
            padding: "9px 12px", 
            color: TH.text1, 
            fontSize: "13px", 
            outline: "none"
          }} 
        />

        {(searchQuery || statusFilter || cidFilter || selSite) && (
          <button 
            onClick={resetFilters}
            style={{
              padding: "9px 14px", 
              borderRadius: "8px", 
              border: `1px solid ${TH.border}`, 
              background: TH.bgHover, 
              color: TH.text2, 
              fontSize: "13px", 
              cursor: "pointer", 
              fontWeight: 500, 
              transition: "all .15s"
            }}>
            Réinitialiser
          </button>
        )}
      </div>

      {/* ── CASCADING SELECTORS BAR ── */}
      <HierarchySelectors
        selSite={selSite}
        setSelSite={setSelSite}
        sites={sites}
        selSalle={selSalle}
        setSelSalle={setSelSalle}
        salles={salles}
        selRack={selRack}
        setSelRack={setSelRack}
        racks={racks}
        selOdf={selOdf}
        setSelOdf={setSelOdf}
        odfs={odfs}
        selSlot={selSlot}
        setSelSlot={setSelSlot}
        slots={slots}
        TH={TH}
      />

      {/* ── BREADCRUMBS ── */}
      <Breadcrumbs
        selSite={selSite}
        setSelSite={setSelSite}
        sites={sites}
        selSalle={selSalle}
        setSelSalle={setSelSalle}
        salles={salles}
        selRack={selRack}
        setSelRack={setSelRack}
        racks={racks}
        selOdf={selOdf}
        setSelOdf={setSelOdf}
        odfs={odfs}
        selSlot={selSlot}
        setSelSlot={setSelSlot}
        slots={slots}
        TH={TH}
      />

      {/* ── MAIN CONTENT CONTAINER (SCROLLABLE) ── */}
      <div style={{ flex: 1, overflow: "auto", background: TH.bgBase }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px", color: TH.text3 }}>
            <div style={{
              display: "inline-block", 
              width: "32px", 
              height: "32px", 
              border: `3px solid ${TH.border}`, 
              borderTopColor: TH.blue, 
              borderRadius: "50%", 
              animation: "spin 0.8s linear infinite"
            }} />
            <div style={{ marginTop: "12px", fontSize: "13px" }}>Chargement des données…</div>
          </div>
        ) : isSearchActive ? (
          <PortTable
            ports={paginatedPorts}
            allFilteredPorts={filteredPorts}
            isSearchActive={true}
            page={page}
            setPage={setPage}
            perPage={perPage}
            TH={TH}
          />
        ) : explorerLevel === "ports" ? (
          <PortTable
            ports={filteredPorts}
            allFilteredPorts={filteredPorts}
            isSearchActive={false}
            page={page}
            setPage={setPage}
            perPage={perPage}
            TH={TH}
            ctxCols={ctxCols}
          />
        ) : (
          <ExplorerCards
            explorerLevel={explorerLevel}
            sites={sites}
            salles={salles}
            racks={racks}
            odfs={odfs}
            slots={slots}
            selSite={selSite}
            selSalle={selSalle}
            selRack={selRack}
            selOdf={selOdf}
            setSelSite={setSelSite}
            setSelSalle={setSelSalle}
            setSelRack={setSelRack}
            setSelOdf={setSelOdf}
            setSelSlot={setSelSlot}
            TH={TH}
          />
        )}
      </div>
    </div>
  );
}
