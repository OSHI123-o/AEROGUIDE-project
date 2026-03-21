export type AppLang = "EN" | "SI" | "TA";

export function getStoredLang(): AppLang {
  const value = (localStorage.getItem("aeroguide_lang") || "EN").toUpperCase();
  if (value === "SI" || value === "TA") return value;
  return "EN";
}

export function setStoredLang(lang: AppLang) {
  localStorage.setItem("aeroguide_lang", lang);
}

