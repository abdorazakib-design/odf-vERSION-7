import React from "react";
import { Btn } from "./common/UI.jsx";

const NAV_ITEMS = [
  { key: "dashboard",  icon: "▦" },
  { key: "search",     icon: "🔍" },
  { key: "manage",     icon: "🏗" },
  { key: "odfConnect", icon: "🔗" },
  { key: "services",   icon: "⚡" },
];

export default function Sidebar({
  view, 
  setView, 
  col, 
  setCol, 
  lang, 
  setLang, 
  theme, 
  setTheme, 
  t, 
  TH, 
  user, 
  onLogout, 
  alertCount
}) {
  return (
    <div style={{
      width: col ? "60px" : "200px", 
      minWidth: col ? "60px" : "200px", 
      height: "100vh",
      background: "#08111E", 
      borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex", 
      flexDirection: "column", 
      transition: "width .25s ease", 
      overflow: "hidden", 
      flexShrink: 0
    }}>

      {/* Logo */}
      <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", minHeight: "72px" }}>
        {!col && (
          <>
            <div 
              className="font-syne" 
              style={{
                fontWeight: 800, 
                color: "#E8F0FE", 
                fontSize: "15px", 
                letterSpacing: "-0.2px", 
                lineHeight: 1.2
              }}>
              ODF Manager <span style={{ color: "#3B82F6" }}>V7</span>
            </div>
            {user && (
              <div style={{
                fontSize: "11px", 
                color: "#5A7A9A", 
                marginTop: "5px", 
                whiteSpace: "nowrap", 
                overflow: "hidden", 
                textOverflow: "ellipsis"
              }}>
                {user.name || user.email}&nbsp;
                <span style={{ color: "#3B82F6", fontWeight: 600 }}>({user.role || "user"})</span>
              </div>
            )}
          </>
        )}
        <button 
          onClick={() => setCol(!col)} 
          style={{
            marginTop: col ? "0" : "10px",
            background: "rgba(255,255,255,0.07)", 
            border: "none", 
            borderRadius: "6px",
            width: "28px", 
            height: "28px", 
            cursor: "pointer", 
            color: "#5A7A9A",
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            fontSize: "13px",
            transition: "background .15s"
          }} 
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}>
          {col ? "›" : "‹"}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
        {NAV_ITEMS.map(({ key, icon }) => {
          const active = view === key;
          return (
            <button 
              key={key} 
              onClick={() => setView(key)} 
              title={t[key]}
              style={{
                width: "100%", 
                display: "flex", 
                alignItems: "center", 
                gap: "10px",
                padding: col ? "12px 0" : "9px 0 9px 16px",
                justifyContent: col ? "center" : "flex-start",
                background: active ? "rgba(59,130,246,0.14)" : "transparent",
                borderLeft: active ? "3px solid #3B82F6" : "3px solid transparent",
                border: "none", 
                cursor: "pointer", 
                transition: "background .12s",
                position: "relative"
              }}
              onMouseEnter={e => { 
                if (!active) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)"; 
                }
              }}
              onMouseLeave={e => { 
                if (!active) {
                  e.currentTarget.style.background = "transparent"; 
                }
              }}>
              <span style={{ fontSize: "15px", width: "20px", textAlign: "center", flexShrink: 0 }}>
                {icon}
              </span>
              {!col && (
                <span style={{
                  fontSize: "13px", 
                  fontWeight: active ? 600 : 400,
                  color: active ? "#E8F0FE" : "#5A7A9A",
                  whiteSpace: "nowrap"
                }}>
                  {t[key]}
                </span>
              )}
              {key === "dashboard" && alertCount > 0 && (
                <span style={{
                  background: "#EF4444", 
                  color: "#fff", 
                  borderRadius: "10px",
                  fontSize: "10px", 
                  fontWeight: 700, 
                  padding: "1px 6px", 
                  lineHeight: "16px",
                  position: col ? "absolute" : "static",
                  top: col ? "6px" : "auto", 
                  right: col ? "6px" : "auto",
                  marginLeft: col ? "0" : "auto", 
                  marginRight: col ? "0" : "12px"
                }}>{alertCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 12px 14px" }}>
        {!col && (
          <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
            <button 
              onClick={() => setLang(lang === "fr" ? "en" : "fr")} 
              style={{
                background: "rgba(255,255,255,0.07)", 
                border: "none", 
                borderRadius: "6px",
                padding: "4px 8px", 
                color: "#5A7A9A", 
                fontSize: "11px", 
                cursor: "pointer"
              }}>
              {lang === "fr" ? "🇫🇷 FR" : "🇬🇧 EN"}
            </button>
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
              style={{
                background: "rgba(255,255,255,0.07)", 
                border: "none", 
                borderRadius: "6px",
                padding: "4px 8px", 
                color: "#5A7A9A", 
                fontSize: "11px", 
                cursor: "pointer"
              }}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        )}
        {col && (
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "4px", 
            alignItems: "center", 
            marginBottom: "8px" 
          }}>
            <button 
              onClick={() => setLang(lang === "fr" ? "en" : "fr")} 
              style={{
                background: "rgba(255,255,255,0.07)", 
                border: "none", 
                borderRadius: "6px", 
                padding: "4px", 
                color: "#5A7A9A", 
                fontSize: "11px", 
                cursor: "pointer", 
                width: "28px", 
                height: "24px"
              }}>
              {lang === "fr" ? "🇫🇷" : "🇬🇧"}
            </button>
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
              style={{
                background: "rgba(255,255,255,0.07)", 
                border: "none", 
                borderRadius: "6px", 
                padding: "4px", 
                color: "#5A7A9A", 
                fontSize: "11px", 
                cursor: "pointer", 
                width: "28px", 
                height: "24px"
              }}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>
        )}
        <Btn onClick={onLogout} variant="ghost" size="sm" TH={TH}>{col ? "⏻" : t.logout}</Btn>
      </div>
    </div>
  );
}
