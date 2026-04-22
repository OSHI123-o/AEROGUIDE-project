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
        ? { bg: "#f3f7fc", panel: "#ffffff", border: "#d5e0ef", text: "#0b1d3a", muted: "#52627a", primary: "#FDB913", primaryText: "#002B5B", chipBg: "#ffffff", chipBorder: "#b9c8dd" }
        : { bg: "#061227", panel: "#0a1f3d", border: "#21426d", text: "#e2e8f0", muted: "#b3c1d8", primary: "#FDB913", primaryText: "#002B5B", chipBg: "#102b4f", chipBorder: "#31557f" },
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
      <div style={{ width: "100%", display: "grid", gap: 14 }}>
        <header style={{ ...card, background: themeColors.panel, borderColor: themeColors.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, color: themeColors.text }}>{copy.settings}</h1>
            <p style={{ margin: "6px 0 0", color: themeColors.muted }}>{copy.subtitle}</p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            style={{ border: 0, borderRadius: 10, padding: "10px 14px", background: themeColors.primary, color: themeColors.primaryText, fontWeight: 700, cursor: "pointer" }}
          >
            {copy.back}
          </button>
        </header>

        <section style={{ ...card, background: themeColors.panel, borderColor: themeColors.border }}>
          <h3 style={{ margin: "0 0 10px", color: themeColors.text }}>{copy.display}</h3>
          <Row label={copy.theme} border={themeColors.border} text={themeColors.text}>
            <ToggleButton
              on={theme === "light"}
              label={copy.light}
              onClick={() => setTheme("light")}
              activeBg={themeColors.primary}
              activeText={themeColors.primaryText}
              idleBg={themeColors.chipBg}
              idleText={themeColors.text}
              border={themeColors.chipBorder}
            />
            <ToggleButton
              on={theme === "dark"}
              label={copy.dark}
              onClick={() => setTheme("dark")}
              activeBg={themeColors.primary}
              activeText={themeColors.primaryText}
              idleBg={themeColors.chipBg}
              idleText={themeColors.text}
              border={themeColors.chipBorder}
            />
          </Row>
          <Row label={`${copy.fontSize} (${fontScale}%)`} border={themeColors.border} text={themeColors.text}>
            <input type="range" min={90} max={130} step={5} value={fontScale} onChange={(e) => setFontScale(Number(e.target.value))} />
          </Row>
          <Row label={copy.highContrast} border={themeColors.border} text={themeColors.text}><Check checked={highContrast} onChange={setHighContrast} /></Row>
          <Row label={copy.simpleLayout} border={themeColors.border} text={themeColors.text}><Check checked={simpleMode} onChange={setSimpleMode} /></Row>
        </section>

        <section style={{ ...card, background: themeColors.panel, borderColor: themeColors.border }}>
          <h3 style={{ margin: "0 0 10px", color: themeColors.text }}>{copy.langAlerts}</h3>
          <Row label={copy.language} border={themeColors.border} text={themeColors.text}>
            <ToggleButton on={lang === "EN"} label="EN" onClick={() => setLang("EN")} activeBg={themeColors.primary} activeText={themeColors.primaryText} idleBg={themeColors.chipBg} idleText={themeColors.text} border={themeColors.chipBorder} />
            <ToggleButton on={lang === "SI"} label="SI" onClick={() => setLang("SI")} activeBg={themeColors.primary} activeText={themeColors.primaryText} idleBg={themeColors.chipBg} idleText={themeColors.text} border={themeColors.chipBorder} />
            <ToggleButton on={lang === "TA"} label="TA" onClick={() => setLang("TA")} activeBg={themeColors.primary} activeText={themeColors.primaryText} idleBg={themeColors.chipBg} idleText={themeColors.text} border={themeColors.chipBorder} />
          </Row>
          <Row label={copy.gateAlerts} border={themeColors.border} text={themeColors.text}><Check checked={gateAlert} onChange={setGateAlert} /></Row>
          <Row label={copy.delayAlerts} border={themeColors.border} text={themeColors.text}><Check checked={delayAlert} onChange={setDelayAlert} /></Row>
          <Row label={copy.boardingAlerts} border={themeColors.border} text={themeColors.text}><Check checked={boardingAlert} onChange={setBoardingAlert} /></Row>
        </section>

        <section style={{ ...card, background: themeColors.panel, borderColor: themeColors.border }}>
          <h3 style={{ margin: "0 0 10px", color: themeColors.text }}>{copy.profileDefaults}</h3>
          <Row label={copy.homeAirport} border={themeColors.border} text={themeColors.text}>
            <input value={homeAirport} onChange={(e) => setHomeAirport(e.target.value.toUpperCase())} style={{ ...inputStyle, background: themeColors.chipBg, color: themeColors.text, borderColor: themeColors.chipBorder }} />
          </Row>
          <Row label={copy.preferredAirline} border={themeColors.border} text={themeColors.text}>
            <input value={preferredAirline} onChange={(e) => setPreferredAirline(e.target.value)} style={{ ...inputStyle, background: themeColors.chipBg, color: themeColors.text, borderColor: themeColors.chipBorder }} />
          </Row>
          <Row label={copy.emergencyContact} border={themeColors.border} text={themeColors.text}>
            <input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="+94 7X XXX XXXX" style={{ ...inputStyle, background: themeColors.chipBg, color: themeColors.text, borderColor: themeColors.chipBorder }} />
          </Row>
        </section>
      </div>
    </div>
  );
}

function Row({ label, children, border, text }: { label: string; children: ReactNode; border: string; text: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${border}` }}>
      <div style={{ fontWeight: 600, color: text }}>{label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{children}</div>
    </div>
  );
}

function ToggleButton({
  on,
  label,
  onClick,
  activeBg,
  activeText,
  idleBg,
  idleText,
  border,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
  activeBg: string;
  activeText: string;
  idleBg: string;
  idleText: string;
  border: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${border}`,
        borderRadius: 8,
        padding: "6px 10px",
        background: on ? activeBg : idleBg,
        color: on ? activeText : idleText,
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
