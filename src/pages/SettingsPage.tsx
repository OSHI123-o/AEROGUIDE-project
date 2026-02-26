import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { applyAccessibilityPrefs } from "../utils/accessibility";
import { getStoredLang, setStoredLang, type AppLang } from "../services/i18n";

type ThemeMode = "light" | "dark";
type Lang = AppLang;

const card: CSSProperties = {
  borderRadius: 14,
  padding: 16,
  border: "1px solid #e2e8f0",
  background: "#fff",
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem("aeroguide_theme") === "dark" ? "dark" : "light"));
  const [fontScale, setFontScale] = useState<number>(() => Number(localStorage.getItem("aeroguide_font_scale") || "100"));
  const [highContrast, setHighContrast] = useState<boolean>(() => localStorage.getItem("aeroguide_high_contrast") === "1");
  const [simpleMode, setSimpleMode] = useState<boolean>(() => localStorage.getItem("aeroguide_simple_mode") === "1");
  const [lang, setLang] = useState<Lang>(() => getStoredLang());
  const [gateAlert, setGateAlert] = useState<boolean>(() => localStorage.getItem("aeroguide_alert_gate") !== "0");
  const [delayAlert, setDelayAlert] = useState<boolean>(() => localStorage.getItem("aeroguide_alert_delay") !== "0");
  const [boardingAlert, setBoardingAlert] = useState<boolean>(() => localStorage.getItem("aeroguide_alert_boarding") !== "0");
  const [homeAirport, setHomeAirport] = useState(() => localStorage.getItem("aeroguide_home_airport") || "CMB");
  const [preferredAirline, setPreferredAirline] = useState(() => localStorage.getItem("aeroguide_preferred_airline") || "SriLankan Airlines");
  const [emergencyContact, setEmergencyContact] = useState(() => localStorage.getItem("aeroguide_emergency_contact") || "");

  useEffect(() => {
    localStorage.setItem("aeroguide_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("aeroguide_font_scale", String(fontScale));
    localStorage.setItem("aeroguide_high_contrast", highContrast ? "1" : "0");
    localStorage.setItem("aeroguide_simple_mode", simpleMode ? "1" : "0");
    setStoredLang(lang);
    localStorage.setItem("aeroguide_alert_gate", gateAlert ? "1" : "0");
    localStorage.setItem("aeroguide_alert_delay", delayAlert ? "1" : "0");
    localStorage.setItem("aeroguide_alert_boarding", boardingAlert ? "1" : "0");
    localStorage.setItem("aeroguide_home_airport", homeAirport);
    localStorage.setItem("aeroguide_preferred_airline", preferredAirline);
    localStorage.setItem("aeroguide_emergency_contact", emergencyContact);
    applyAccessibilityPrefs();
  }, [fontScale, highContrast, simpleMode, lang, gateAlert, delayAlert, boardingAlert, homeAirport, preferredAirline, emergencyContact]);

  const themeColors = useMemo(
    () =>
      theme === "light"
        ? { bg: "#f1f5f9", panel: "#ffffff", border: "#e2e8f0", text: "#0f172a", muted: "#64748b", primary: "#0f172a" }
        : { bg: "#020617", panel: "#0f172a", border: "#1f2937", text: "#e2e8f0", muted: "#94a3b8", primary: "#2563eb" },
    [theme]
  );

  const copy = {
    EN: {
      settings: "Settings",
      subtitle: "Customize AEROGUIDE behavior and accessibility.",
      back: "Back",
      display: "Display",
      theme: "Theme",
      light: "Light",
      dark: "Dark",
      fontSize: "Font Size",
      highContrast: "High Contrast",
      simpleLayout: "Simplified Layout",
      langAlerts: "Language & Alerts",
      language: "Language",
      gateAlerts: "Gate Change Alerts",
      delayAlerts: "Delay Alerts",
      boardingAlerts: "Boarding Call Alerts",
      profileDefaults: "Profile Defaults",
      homeAirport: "Home Airport",
      preferredAirline: "Preferred Airline",
      emergencyContact: "Emergency Contact",
    },
    SI: {
      settings: "සැකසුම්",
      subtitle: "AEROGUIDE හැසිරීම සහ ප්‍රවේශතාවය සකසන්න.",
      back: "ආපසු",
      display: "දර්ශනය",
      theme: "තේමාව",
      light: "ආලෝක",
      dark: "අඳුරු",
      fontSize: "අකුරු ප්‍රමාණය",
      highContrast: "ඉහළ විරෝධතාව",
      simpleLayout: "සරල සැලසුම",
      langAlerts: "භාෂාව සහ දැනුම්දීම්",
      language: "භාෂාව",
      gateAlerts: "ගේට් වෙනස්වීම් දැනුම්දීම්",
      delayAlerts: "ප්‍රමාද දැනුම්දීම්",
      boardingAlerts: "බෝඩින් කැඳවීම් දැනුම්දීම්",
      profileDefaults: "ප්‍රොෆයිල් පෙරනිමි",
      homeAirport: "නිවසේ ගුවන් තොටුපළ",
      preferredAirline: "අභිරුචි ගුවන් සේවය",
      emergencyContact: "හදිසි සම්බන්ධතා",
    },
    TA: {
      settings: "அமைப்புகள்",
      subtitle: "AEROGUIDE நடத்தை மற்றும் அணுகலை தனிப்பயனாக்குங்கள்.",
      back: "திரும்ப",
      display: "காட்சி",
      theme: "தீம்",
      light: "ஒளி",
      dark: "இருள்",
      fontSize: "எழுத்து அளவு",
      highContrast: "உயர் முரண்பாடு",
      simpleLayout: "எளிய வடிவமைப்பு",
      langAlerts: "மொழி மற்றும் அறிவிப்புகள்",
      language: "மொழி",
      gateAlerts: "கேட் மாற்ற அறிவிப்புகள்",
      delayAlerts: "தாமத அறிவிப்புகள்",
      boardingAlerts: "போர்டிங் அறிவிப்புகள்",
      profileDefaults: "சுயவிவர முன்னிருப்புகள்",
      homeAirport: "வீட்டு விமானநிலையம்",
      preferredAirline: "விருப்ப விமான சேவை",
      emergencyContact: "அவசர தொடர்பு",
    },
  }[lang];

  return (
    <div style={{ minHeight: "100vh", background: themeColors.bg, padding: 20 }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 14 }}>
        <header style={{ ...card, background: themeColors.panel, borderColor: themeColors.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, color: themeColors.text }}>{copy.settings}</h1>
            <p style={{ margin: "6px 0 0", color: themeColors.muted }}>{copy.subtitle}</p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            style={{ border: 0, borderRadius: 10, padding: "10px 14px", background: themeColors.primary, color: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            {copy.back}
          </button>
        </header>

        <section style={{ ...card, background: themeColors.panel, borderColor: themeColors.border }}>
          <h3 style={{ margin: "0 0 10px", color: themeColors.text }}>{copy.display}</h3>
          <Row label={copy.theme}>
            <ToggleButton on={theme === "light"} label={copy.light} onClick={() => setTheme("light")} />
            <ToggleButton on={theme === "dark"} label={copy.dark} onClick={() => setTheme("dark")} />
          </Row>
          <Row label={`${copy.fontSize} (${fontScale}%)`}>
            <input type="range" min={90} max={130} step={5} value={fontScale} onChange={(e) => setFontScale(Number(e.target.value))} />
          </Row>
          <Row label={copy.highContrast}><Check checked={highContrast} onChange={setHighContrast} /></Row>
          <Row label={copy.simpleLayout}><Check checked={simpleMode} onChange={setSimpleMode} /></Row>
        </section>

        <section style={{ ...card, background: themeColors.panel, borderColor: themeColors.border }}>
          <h3 style={{ margin: "0 0 10px", color: themeColors.text }}>{copy.langAlerts}</h3>
          <Row label={copy.language}>
            <ToggleButton on={lang === "EN"} label="EN" onClick={() => setLang("EN")} />
            <ToggleButton on={lang === "SI"} label="SI" onClick={() => setLang("SI")} />
            <ToggleButton on={lang === "TA"} label="TA" onClick={() => setLang("TA")} />
          </Row>
          <Row label={copy.gateAlerts}><Check checked={gateAlert} onChange={setGateAlert} /></Row>
          <Row label={copy.delayAlerts}><Check checked={delayAlert} onChange={setDelayAlert} /></Row>
          <Row label={copy.boardingAlerts}><Check checked={boardingAlert} onChange={setBoardingAlert} /></Row>
        </section>

        <section style={{ ...card, background: themeColors.panel, borderColor: themeColors.border }}>
          <h3 style={{ margin: "0 0 10px", color: themeColors.text }}>{copy.profileDefaults}</h3>
          <Row label={copy.homeAirport}>
            <input value={homeAirport} onChange={(e) => setHomeAirport(e.target.value.toUpperCase())} style={inputStyle} />
          </Row>
          <Row label={copy.preferredAirline}>
            <input value={preferredAirline} onChange={(e) => setPreferredAirline(e.target.value)} style={inputStyle} />
          </Row>
          <Row label={copy.emergencyContact}>
            <input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="+94 7X XXX XXXX" style={inputStyle} />
          </Row>
        </section>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #e2e8f0" }}>
      <div style={{ fontWeight: 600, color: "#334155" }}>{label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{children}</div>
    </div>
  );
}

function ToggleButton({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: 8,
        padding: "6px 10px",
        background: on ? "#0f172a" : "#fff",
        color: on ? "#fff" : "#0f172a",
        cursor: "pointer",
        fontWeight: 700,
      }}
    >
      {label}
    </button>
  );
}

function Check({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />;
}

const inputStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "8px 10px",
  minWidth: 220,
  fontWeight: 600,
};
