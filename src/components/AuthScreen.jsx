import React, { useState } from "react";
import { signIn } from "../supabase.js";
import { Inp, Btn } from "./common/UI.jsx";
import { DEMO_USERS } from "../utils/constants.js";

export default function AuthScreen({
  lang, 
  setLang, 
  theme, 
  setTheme, 
  t, 
  TH, 
  onLogin
}) {
  const [email, setEmail] = useState("admin@demo.dj");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const doLogin = async () => {
    setLoading(true); 
    setError("");
    const demo = DEMO_USERS.find(u => u.email === email && u.pass === password);
    if (demo) { 
      onLogin(demo); 
      setLoading(false); 
      return; 
    }
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err.message);
    } else {
      onLogin(null);
    }
    setLoading(false);
  };

  return (
    <div style={{
      height: "100vh", 
      background: TH.bgBase, 
      display: "flex", 
      flexDirection: "column",
      alignItems: "center", 
      justifyContent: "center", 
      position: "relative"
    }}>
      {/* BG decoration */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: TH.blueGlow,
          filter: "blur(80px)"
        }} />
        <div style={{
          position: "absolute",
          bottom: "-20%",
          left: "-10%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "rgba(34,211,238,0.06)",
          filter: "blur(60px)"
        }} />
      </div>

      {/* Toggle lang/theme */}
      <div style={{ position: "absolute", top: 20, right: 20, display: "flex", gap: "8px" }}>
        <button 
          onClick={() => setLang(lang === "fr" ? "en" : "fr")} 
          style={{
            background: TH.bgInput,
            border: `1px solid ${TH.border}`,
            borderRadius: "8px",
            padding: "6px 12px",
            color: TH.text2,
            fontSize: "12px",
            cursor: "pointer"
          }}>
          {lang === "fr" ? "🇫🇷 FR" : "🇬🇧 EN"}
        </button>
        <button 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
          style={{
            background: TH.bgInput,
            border: `1px solid ${TH.border}`,
            borderRadius: "8px",
            padding: "6px 12px",
            color: TH.text2,
            fontSize: "13px",
            cursor: "pointer"
          }}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Card */}
      <div 
        className="fade-up" 
        style={{
          background: TH.loginCardBg, 
          border: `1px solid ${TH.border2}`,
          borderRadius: "20px", 
          padding: "40px", 
          width: "380px", 
          boxShadow: TH.glassShadow,
          backdropFilter: TH.backdropFilter, 
          position: "relative"
        }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ 
            fontFamily: "'Syne',sans-serif", 
            fontWeight: 800, 
            fontSize: "26px", 
            color: TH.text1 
          }}>
            {t.appName}
          </div>
          <div style={{ color: TH.blue, fontSize: "12px", marginTop: "4px" }}>
            {t.appSub}
          </div>
          <div style={{
            width: "40px",
            height: "3px",
            background: TH.blue,
            borderRadius: "2px",
            margin: "12px auto 0"
          }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ 
              color: TH.text2, 
              fontSize: "12px", 
              fontWeight: 600, 
              display: "block", 
              marginBottom: "6px" 
            }}>
              {t.email}
            </label>
            <Inp value={email} onChange={setEmail} placeholder={t.email} type="email" TH={TH} />
          </div>
          <div>
            <label style={{ 
              color: TH.text2, 
              fontSize: "12px", 
              fontWeight: 600, 
              display: "block", 
              marginBottom: "6px" 
            }}>
              {t.password}
            </label>
            <Inp value={password} onChange={setPassword} placeholder={t.password} type="password" TH={TH} />
          </div>
          {error && (
            <div style={{
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: "8px",
              padding: "8px 12px",
              color: TH.red,
              fontSize: "12px"
            }}>
              {error}
            </div>
          )}
          <Btn onClick={doLogin} disabled={loading} size="lg" TH={TH}>
            {loading ? t.loading : t.signin}
          </Btn>
        </div>
      </div>
    </div>
  );
}
