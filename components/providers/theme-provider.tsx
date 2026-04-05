"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { applyThemePreference, readStoredThemePreference, storeThemePreference } from "@/lib/settings/theme";
import type { ThemePreference } from "@/lib/settings/types";

export function ThemeProvider() {
  const { status } = useSession();

  useEffect(() => {
    const storedPreference = readStoredThemePreference();

    if (storedPreference) {
      applyThemePreference(storedPreference);
      return;
    }

    applyThemePreference("LIGHT");
    storeThemePreference("LIGHT");
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    const loadPreference = async () => {
      const storedPreference = readStoredThemePreference();
      const response = await fetch("/api/settings", {
        method: "GET",
        cache: "no-store",
      }).catch(() => null);

      if (!response?.ok || cancelled) {
        return;
      }

      const payload = (await response.json()) as {
        preferences?: {
          theme?: ThemePreference;
        };
      };
      const theme = payload.preferences?.theme;

      if (!theme || cancelled) {
        return;
      }

      if (storedPreference && theme === "SYSTEM") {
        return;
      }

      applyThemePreference(theme);
      storeThemePreference(theme);
    };

    void loadPreference();

    return () => {
      cancelled = true;
    };
  }, [status]);

  return null;
}
