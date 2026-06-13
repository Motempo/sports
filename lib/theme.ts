export type StoredTheme = "light" | "dark" | null;

export function getSystemPrefersLight(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

export function getStoredTheme(): StoredTheme {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem("theme");
  if (value === "light" || value === "dark") return value;
  return null;
}

export function resolveLightTheme(stored: StoredTheme, systemLight = getSystemPrefersLight()): boolean {
  if (stored === "light") return true;
  if (stored === "dark") return false;
  return systemLight;
}

export function applyTheme(stored: StoredTheme, systemLight = getSystemPrefersLight()) {
  document.documentElement.classList.toggle("light", resolveLightTheme(stored, systemLight));
}

export const themeInitScript = `(function(){try{var s=localStorage.getItem('theme');var l=s==='light'||(s!=='dark'&&window.matchMedia('(prefers-color-scheme: light)').matches);document.documentElement.classList.toggle('light',l);}catch(e){}})();`;
