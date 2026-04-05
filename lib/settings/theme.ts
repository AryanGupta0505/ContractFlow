import type { ThemePreference } from "@/lib/settings/types";

export const themeStorageKey = "contractflow-theme-preference";

export function applyThemePreference(theme: ThemePreference) {
  const root = document.documentElement;

  if (theme === "SYSTEM") {
    root.removeAttribute("data-theme");
    return;
  }

  root.setAttribute("data-theme", theme.toLowerCase());
}

export function storeThemePreference(theme: ThemePreference) {
  window.localStorage.setItem(themeStorageKey, theme);
}

export function readStoredThemePreference() {
  const value = window.localStorage.getItem(themeStorageKey);
  return value === "LIGHT" || value === "DARK" || value === "SYSTEM" ? value : null;
}
