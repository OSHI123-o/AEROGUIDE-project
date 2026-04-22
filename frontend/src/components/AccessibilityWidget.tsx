import React, { useState, useEffect, useRef } from "react";
import { applyAccessibilityPrefs } from "../utils/accessibility";

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [fontScale, setFontScale] = useState(() => Number(localStorage.getItem("aeroguide_font_scale") || "100"));
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem("aeroguide_high_contrast") === "1");
  const [simpleMode, setSimpleMode] = useState(() => localStorage.getItem("aeroguide_simple_mode") === "1");
  
  const panelRef = useRef<HTMLDivElement>(null);

  // Persist and apply changes instantly
  useEffect(() => {
    localStorage.setItem("aeroguide_font_scale", String(fontScale));
    localStorage.setItem("aeroguide_high_contrast", highContrast ? "1" : "0");
    localStorage.setItem("aeroguide_simple_mode", simpleMode ? "1" : "0");
    
    try {
      applyAccessibilityPrefs();
    } catch (error) {
      console.warn("Failed to apply accessibility preferences", error);
    }
  }, [fontScale, highContrast, simpleMode]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const resetDefaults = () => {
    setFontScale(100);
    setHighContrast(false);
    setSimpleMode(false);
  };

  return (
    <div ref={panelRef} className="fixed bottom-6 left-6 z-[9999] font-sans">
      {/* Accessibility Panel */}
      <div 
        className={`absolute bottom-16 left-0 w-80 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0A1A2F]/95 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all duration-300 origin-bottom-left ${
          isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="p-5 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-slate-50/50 dark:bg-white/5 rounded-t-3xl">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">Accessibility</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Customize your experience</p>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200/50 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
            aria-label="Close accessibility panel"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Text Size Control */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Text Size</span>
              <span className="text-xs font-bold text-aeroguide-blue dark:text-aeroguide-gold">{fontScale}%</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 p-1.5 rounded-xl border border-slate-200 dark:border-white/5">
              <button 
                onClick={() => setFontScale(p => Math.max(90, p - 5))}
                className="flex-1 py-2 flex justify-center items-center rounded-lg hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 shadow-sm transition-all font-bold text-sm disabled:opacity-50"
                disabled={fontScale <= 90}
              >
                A-
              </button>
              <button 
                onClick={() => setFontScale(100)}
                className="flex-1 py-2 flex justify-center items-center rounded-lg hover:bg-white dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-all font-semibold text-xs"
              >
                Reset
              </button>
              <button 
                onClick={() => setFontScale(p => Math.min(130, p + 5))}
                className="flex-1 py-2 flex justify-center items-center rounded-lg hover:bg-white dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 shadow-sm transition-all font-bold text-lg disabled:opacity-50"
                disabled={fontScale >= 130}
              >
                A+
              </button>
            </div>
          </div>

          {/* High Contrast Toggle */}
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-aeroguide-blue dark:group-hover:text-aeroguide-gold transition-colors">High Contrast</span>
            <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${highContrast ? 'bg-aeroguide-blue dark:bg-aeroguide-gold' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${highContrast ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
            <input type="checkbox" className="sr-only" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} />
          </label>

          {/* Simplified Layout Toggle */}
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-aeroguide-blue dark:group-hover:text-aeroguide-gold transition-colors">Simplified Layout</span>
            <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${simpleMode ? 'bg-aeroguide-blue dark:bg-aeroguide-gold' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${simpleMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
            <input type="checkbox" className="sr-only" checked={simpleMode} onChange={(e) => setSimpleMode(e.target.checked)} />
          </label>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 rounded-b-3xl">
          <button 
            onClick={resetDefaults}
            className="w-full py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors border border-transparent hover:border-slate-300 dark:hover:border-white/20"
          >
            Reset All Settings
          </button>
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle accessibility options"
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.2)] focus:outline-none focus:ring-4 focus:ring-aeroguide-gold/50 z-50 ${
          isOpen 
            ? "bg-aeroguide-gold text-aeroguide-navy scale-105" 
            : "bg-aeroguide-navy dark:bg-slate-800 text-white hover:bg-aeroguide-blue dark:hover:bg-slate-700 hover:scale-105 border border-white/10"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-7 h-7"
        >
          <circle cx="14.5" cy="4.75" r="1.75" />
          <path d="M13.75 8.25h-2.5a1 1 0 0 0-1 1v5.25a1 1 0 0 0 1 1h4.4" />
          <path d="M10.25 11.5h5.1" />
          <path d="M15.4 11.5l3.1 7.25" />
          <path d="M9.9 19.25a4.15 4.15 0 1 1 3.5-6.4" />
          <path d="M18.5 18.75l2-.85" />
        </svg>
      </button>
    </div>
  );
}
