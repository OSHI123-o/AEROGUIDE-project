export function applyAccessibilityPrefs() {
  const rawScale = Number(localStorage.getItem("aeroguide_font_scale") || "100");
  const fontScale = Number.isNaN(rawScale) ? 100 : Math.min(130, Math.max(90, rawScale));
  const zoom = fontScale / 100;
  const highContrast = localStorage.getItem("aeroguide_high_contrast") === "1";

  document.documentElement.style.setProperty("--aero-font-scale", `${fontScale}%`);
  document.documentElement.classList.toggle("aero-high-contrast", highContrast);

  // Apply visual scale globally so inline px-based layouts also scale.
  document.body.style.zoom = String(zoom);
}
