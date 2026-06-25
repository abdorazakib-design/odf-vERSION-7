// ODF Manager V7 — Omega Tech · Djibouti Telecom
// Clean modularized App.jsx entry point

import React, { useState, useEffect } from "react";
import { THEMES, T, BASE_CSS } from "./components/common/Theme.js";
import { Spinner } from "./components/common/UI.jsx";
import { supabase, getSession, signOut, getPortsFlat } from "./supabase.js";

import AuthScreen from "./components/AuthScreen.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import SearchView from "./components/SearchView.jsx";
import ManageInfra from "./components/ManageInfra.jsx";
import OdfConnectView from "./components/OdfConnectView.jsx";
import ServicesView from "./components/ServicesView.jsx";

export default function App() {
  const [session, setSession] = useState(null);
  const [demoUser, setDemoUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [lang, setLang] = useState("fr");
  const [theme, setTheme] = useState("dark");
  const [view, setView] = useState("dashboard");
  const [col, setCol] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  const TH = THEMES[theme];
  const t = T[lang];

  // Inject CSS
  useEffect(() => {
    let el = document.getElementById("odf-base-css");
    if (!el) {
      el = document.createElement("style");
      el.id = "odf-base-css";
      document.head.appendChild(el);
    }
    el.textContent = BASE_CSS;
  }, []);

  // Supabase session listener
  useEffect(() => {
    getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) =>
      setSession(session)
    );
    return () => subscription.unsubscribe();
  }, []);

  // Alert count
  useEffect(() => {
    if (!session && !demoUser) return;
    getPortsFlat().then(r => {
      const u = (r.data || []).filter(p => p.statut === "INCONNU").length;
      setAlertCount(u);
    });
  }, [session, view, demoUser]);

  const doLogout = async () => {
    await signOut();
    setDemoUser(null);
  };

  if (authLoading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: THEMES.dark.bgBase
      }}>
        <Spinner TH={THEMES.dark} />
      </div>
    );
  }

  if (!session && !demoUser) {
    return (
      <AuthScreen
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        t={t}
        TH={TH}
        onLogin={u => { if (u) setDemoUser(u); }}
      />
    );
  }

  const VIEWS = {
    dashboard: <Dashboard t={t} TH={TH} />,
    search: <SearchView t={t} TH={TH} />,
    manage: <ManageInfra t={t} TH={TH} />,
    odfConnect: <OdfConnectView t={t} TH={TH} />,
    services: <ServicesView t={t} TH={TH} user={session?.user || demoUser} />,
  };

  const VIEW_TITLES = {
    dashboard: t.dashboard,
    search: t.search,
    manage: t.manage,
    odfConnect: t.odfConnect,
    services: t.services,
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: TH.bgBase, overflow: "hidden" }}>
      <Sidebar
        view={view}
        setView={setView}
        col={col}
        setCol={setCol}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        t={t}
        TH={TH}
        user={session?.user || demoUser}
        onLogout={doLogout}
        alertCount={alertCount}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Topbar title={VIEW_TITLES[view]} t={t} TH={TH} />
        <div style={{ flex: 1, overflow: "hidden" }}>
          {VIEWS[view]}
        </div>
      </div>
    </div>
  );
}
