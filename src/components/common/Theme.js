// ═══════════════════════════════════════════════════════════════════════════
// THEMES (zéro theme=== dans JSX style props)
// ═══════════════════════════════════════════════════════════════════════════
export const THEMES = {
  dark: {
    bgBase: "#0B1427", bgSurface: "#111C30", bgCard: "#152036",
    bgHover: "rgba(255,255,255,0.04)", bgInput: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.08)", border2: "rgba(255,255,255,0.15)",
    text1: "#E8F0FE", text2: "#7A9BBF", text3: "#3D5473",
    blue: "#3B82F6", blueGlow: "rgba(59,130,246,0.2)",
    cyan: "#22D3EE", gold: "#FBBF24", green: "#10B981",
    red: "#F87171", orange: "#FB923C", purple: "#A78BFA",
    sidebarBg: "#08111E",
    cardShadow: "0 2px 16px rgba(0,0,0,0.35)",
    glassShadow: "0 8px 32px rgba(0,0,0,0.55)",
    activeGlow: "0 0 20px rgba(59,130,246,0.4)",
    statusGlow: true,
    backdropFilter: "blur(20px)",
    topbarShadow: "0 1px 0 rgba(255,255,255,0.05)",
    modalHeaderBg: "rgba(59,130,246,0.06)",
    drawerShadow: "-8px 0 40px rgba(0,0,0,0.6)",
    loginCardBg: "rgba(11,20,39,0.98)",
    sc: {
      LIBRE:   { bg: "rgba(255,255,255,.04)", tx: "#3D5473", bd: "rgba(255,255,255,.07)", dot: "#3D5473" },
      OCCUPE:  { bg: "rgba(16,185,129,.15)",  tx: "#34D399", bd: "rgba(52,211,153,.3)",   dot: "#10B981" },
      MAUVAIS: { bg: "rgba(248,113,113,.15)", tx: "#F87171", bd: "rgba(248,113,113,.3)",  dot: "#EF4444" },
      INCONNU: { bg: "rgba(245,158,11,0.15)", tx: "#FBBF24", bd: "rgba(245,158,11,0.3)",  dot: "#F59E0B" },
    },
  },
  light: {
    bgBase: "#F0F5FF", bgSurface: "#FFFFFF", bgCard: "#FFFFFF",
    bgHover: "rgba(0,0,0,0.03)", bgInput: "rgba(0,0,0,0.04)",
    border: "#E2E8F0", border2: "#CBD5E1",
    text1: "#0F172A", text2: "#475569", text3: "#94A3B8",
    blue: "#1D4ED8", blueGlow: "rgba(29,78,216,0.12)",
    cyan: "#0891B2", gold: "#D97706", green: "#059669",
    red: "#DC2626", orange: "#EA580C", purple: "#7C3AED",
    sidebarBg: "#0F172A",
    cardShadow: "0 2px 12px rgba(15,23,42,0.08)",
    glassShadow: "0 4px 20px rgba(15,23,42,0.12)",
    activeGlow: "0 0 12px rgba(29,78,216,0.2)",
    statusGlow: false,
    backdropFilter: "none",
    topbarShadow: "0 1px 8px rgba(15,23,42,0.06)",
    modalHeaderBg: "rgba(0,0,0,0.03)",
    drawerShadow: "-4px 0 20px rgba(15,23,42,0.12)",
    loginCardBg: "rgba(255,255,255,0.97)",
    sc: {
      LIBRE:   { bg: "#F1F5F9", tx: "#94A3B8", bd: "#CBD5E1", dot: "#475569" },
      OCCUPE:  { bg: "#D1FAE5", tx: "#065F46", bd: "#6EE7B7", dot: "#10B981" },
      MAUVAIS: { bg: "#FEE2E2", tx: "#991B1B", bd: "#FCA5A5", dot: "#EF4444" },
      INCONNU: { bg: "#FEF3C7", tx: "#B45309", bd: "#FCD34D", dot: "#D97706" },
    },
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// TRADUCTIONS
// ═══════════════════════════════════════════════════════════════════════════
export const T = {
  fr: {
    appName: "ODF Manager", appSub: "Omega Tech · Djibouti Telecom",
    login: "Connexion", logout: "Déconnexion",
    email: "Email", password: "Mot de passe", signin: "Se connecter",
    dashboard: "Tableau de bord", search: "Recherche", searchPlaceholder: "Rechercher…",
    manage: "Créer Infra", odfConnect: "Connexion ODF", services: "Services",
    sites: "Sites", racks: "Racks", odfs: "ODFs", slots: "Slots", ports: "Ports",
    totalPorts: "Total Ports", free: "Libres", active: "Actifs", internal: "Internes",
    unknown: "Inconnus", reserved: "Réservés",
    filter: "Filtrer", export: "Exporter",
    exportCSV: "Export CSV", exportPDF: "Export PDF Étiquettes",
    add: "Ajouter", save: "Enregistrer", cancel: "Annuler", delete: "Supprimer", edit: "Modifier",
    confirmDelete: "Confirmer la suppression ?", yes: "Oui", no: "Non",
    siteName: "Nom du site", salleName: "Nom de la salle", rackName: "Nom du rack",
    odfName: "Nom de l'ODF", slotName: "Nom du slot",
    portName: "Nom du port", status: "Statut", client: "Client (OT)", cid: "CID",
    operator: "Owner", capacity: "Capacité", destination: "Destination",
    notes: "Remarques", updatedAt: "Modifié le",
    cableRef: "Référence câble", fiberType: "Type fibre", source: "Source", dest: "Destination",
    pathSource: "Chemin source", pathDest: "Chemin destination",
    monomode: "Monomode", multimode: "Multimode",
    noData: "Aucune donnée", loading: "Chargement…", saving: "Enregistrement…",
    saved: "Sauvegardé ✓", error: "Erreur",
    history_empty: "Aucun historique", history_action: "Action",
    selectSite: "Sélectionner un site",
    selectRack: "Sélectionner un rack", selectOdf: "Sélectionner un ODF",
    selectSlot: "Sélectionner un slot",
    allSites: "Tous les sites", allStatuses: "Tous les statuts",
    portDrawerTitle: "Détails du port", close: "Fermer",
    infraTabs: ["Sites", "Salles", "Racks", "ODFs", "Slots"],
    welcome: "Bienvenue",
  },
  en: {
    appName: "ODF Manager", appSub: "Omega Tech · Djibouti Telecom",
    login: "Login", logout: "Logout",
    email: "Email", password: "Password", signin: "Sign in",
    dashboard: "Dashboard", search: "Search", searchPlaceholder: "Search…",
    manage: "Create Infra", odfConnect: "ODF Connection", services: "Services",
    sites: "Sites", racks: "Racks", odfs: "ODFs", slots: "Slots", ports: "Ports",
    totalPorts: "Total Ports", free: "Free", active: "Active", internal: "Internal",
    unknown: "Unknown", reserved: "Reserved",
    filter: "Filter", export: "Export",
    exportCSV: "Export CSV", exportPDF: "Export PDF Labels",
    add: "Add", save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit",
    confirmDelete: "Confirm deletion?", yes: "Yes", no: "No",
    siteName: "Site name", salleName: "Room name", rackName: "Rack name",
    odfName: "ODF name", slotName: "Slot name",
    portName: "Port name", status: "Status", client: "Client (OT)", cid: "CID",
    operator: "Owner", capacity: "Capacity", destination: "Destination",
    notes: "Remarks", updatedAt: "Updated at",
    cableRef: "Cable reference", fiberType: "Fiber type", source: "Source", dest: "Destination",
    pathSource: "Source path", pathDest: "Destination path",
    monomode: "Single-mode", multimode: "Multi-mode",
    noData: "No data", loading: "Loading…", saving: "Saving…",
    saved: "Saved ✓", error: "Error",
    history_empty: "No history", history_action: "Action",
    selectSite: "Select a site",
    selectRack: "Select a rack", selectOdf: "Select an ODF",
    selectSlot: "Select a slot",
    allSites: "All sites", allStatuses: "All statuses",
    portDrawerTitle: "Port details", close: "Close",
    infraTabs: ["Sites", "Rooms", "Racks", "ODFs", "Slots"],
    welcome: "Welcome",
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CSS GLOBAL INJECTÉ
// ═══════════════════════════════════════════════════════════════════════════
export const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'DM Sans',sans-serif;overflow:hidden;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.3);border-radius:2px;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideR{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
  @keyframes glow{0%,100%{box-shadow:0 0 4px currentColor}50%{box-shadow:0 0 12px currentColor}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  .fade-up{animation:fadeUp .35s ease both;}
  .slide-r{animation:slideR .3s ease both;}
  .font-syne{font-family:'Syne',sans-serif;}
  .font-mono{font-family:'JetBrains Mono',monospace;}
  input,select,textarea{outline:none;font-family:'DM Sans',sans-serif;}
  button{cursor:pointer;font-family:'DM Sans',sans-serif;}
  table{border-collapse:collapse;width:100%;}
  @media print{
    body{overflow:auto;}
    .no-print{display:none!important;}
    .print-label{break-inside:avoid;page-break-inside:avoid;}
  }
`;
