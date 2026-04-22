import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement?: new (
          options: Record<string, unknown>,
          elementId: string
        ) => unknown;
      };
    };
  }
}

type LanguageOption = {
  code: string;
  label: string;
  countryCode: string;
};

const SOURCE_LANG = "en";
const STORAGE_KEY = "aeroguide_global_language";

const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", countryCode: "gb" },
  { code: "si", label: "Sinhala", countryCode: "lk" },
  { code: "zh-CN", label: "Chinese", countryCode: "cn" },
  { code: "es", label: "Spanish", countryCode: "es" },
  { code: "fr", label: "French", countryCode: "fr" },
  { code: "ar", label: "Arabic", countryCode: "ae" },
  { code: "hi", label: "Hindi", countryCode: "in" },
];

function setGoogleTranslateCookie(targetLang: string) {
  const value = `/${SOURCE_LANG}/${targetLang}`;
  document.cookie = `googtrans=${value}; path=/`;
  document.cookie = `googtrans=${value}; path=/; domain=${window.location.hostname}`;
}

function loadGoogleTranslateScript() {
  const existing = document.getElementById("google-translate-script");
  if (existing) return;

  const script = document.createElement("script");
  script.id = "google-translate-script";
  script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.body.appendChild(script);
}

export default function GlobalLanguageSwitcher() {
  const [selected, setSelected] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || "en");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      new window.google.translate.TranslateElement(
        {
          pageLanguage: SOURCE_LANG,
          includedLanguages: LANGUAGES.map((l) => l.code).join(","),
          autoDisplay: false,
          layout: 0,
        },
        "google_translate_element_hidden"
      );
    };

    loadGoogleTranslateScript();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || "en";
    setGoogleTranslateCookie(saved);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const switchLanguage = (code: string) => {
    setSelected(code);
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, code);
    setGoogleTranslateCookie(code);
    window.location.reload();
  };

  const selectedOption = LANGUAGES.find((l) => l.code === selected) || LANGUAGES[0];

  return (
    <>
      <div ref={containerRef} className="fixed top-4 right-4 z-[100] inline-block font-sans">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-2.5 px-3 sm:px-4 py-2 text-sm font-medium text-white transition-all 
                     bg-slate-900/40 hover:bg-slate-800/60 border border-white/20 rounded-full backdrop-blur-md shadow-lg"
          aria-expanded={open}
        >
          <img 
            src={`https://flagcdn.com/w40/${selectedOption.countryCode}.png`} 
            srcSet={`https://flagcdn.com/w80/${selectedOption.countryCode}.png 2x`}
            alt={selectedOption.label} 
            className="w-6 h-auto rounded-[2px] shadow-[0_2px_4px_rgba(0,0,0,0.3)]" 
          />
          <span className="hidden sm:inline-block tracking-wide font-bold drop-shadow-sm">{selectedOption.label}</span>
          <ChevronDown className={`w-4 h-4 opacity-70 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute right-0 top-full mt-3 w-56 py-3 bg-slate-900/90 backdrop-blur-xl 
                         border border-white/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden"
              role="menu"
            >
              <div className="px-4 pb-2 mb-2 border-b border-white/10">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Language</p>
              </div>
              <div className="flex flex-col gap-1 px-2">
                {LANGUAGES.map((lang) => {
                  const isActive = selected === lang.code;
                  return (
                    <motion.button
                      key={lang.code}
                      whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.05)" }}
                      onClick={() => switchLanguage(lang.code)}
                      className={`flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-xl transition-colors
                                ${isActive ? "bg-amber-500/10 text-amber-500" : "text-slate-200"}`}
                      role="menuitem"
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://flagcdn.com/w40/${lang.countryCode}.png`} 
                          srcSet={`https://flagcdn.com/w80/${lang.countryCode}.png 2x`}
                          alt={lang.label} 
                          className="w-6 h-auto rounded-[2px] shadow-[0_2px_4px_rgba(0,0,0,0.3)]" 
                        />
                        <span className="font-medium tracking-wide">{lang.label}</span>
                      </div>
                      {isActive && <Check className="w-4 h-4" />}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div id="google_translate_element_hidden" style={{ display: "none" }} />
    </>
  );
}
