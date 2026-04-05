"use client";

import { Check, LoaderCircle, Monitor, MoonStar, SunMedium } from "lucide-react";
import { useState } from "react";

import { applyThemePreference, storeThemePreference } from "@/lib/settings/theme";
import type { ThemePreference } from "@/lib/settings/types";

const themeOptions: Array<{
  value: ThemePreference;
  title: string;
  description: string;
  icon: typeof SunMedium;
}> = [
  {
    value: "LIGHT",
    title: "Light",
    description: "Bright interface with clear contrast for daytime work.",
    icon: SunMedium,
  },
  {
    value: "DARK",
    title: "Dark",
    description: "Lower-glare interface for dim environments and long sessions.",
    icon: MoonStar,
  },
  {
    value: "SYSTEM",
    title: "System",
    description: "Follow your device setting automatically.",
    icon: Monitor,
  },
];

export function PreferencesSettings({
  theme,
  isSaving,
  onSave,
}: {
  theme: ThemePreference;
  isSaving: boolean;
  onSave: (theme: ThemePreference) => Promise<void>;
}) {
  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>(theme);

  async function handleSave() {
    applyThemePreference(selectedTheme);
    storeThemePreference(selectedTheme);
    await onSave(selectedTheme);
  }

  return (
    <section className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Preferences</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Personalize your workspace</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Choose how the app should look and feel when you open it.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const active = selectedTheme === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedTheme(option.value)}
                className={`rounded-[24px] border p-5 text-left ${
                  active
                    ? "border-[rgba(67,97,238,0.24)] bg-[linear-gradient(180deg,#f4f7ff_0%,#ffffff_100%)] shadow-[0_14px_28px_rgba(67,97,238,0.08)]"
                    : "border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[var(--primary)] shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  {active ? <Check className="h-4 w-4 text-[var(--primary)]" /> : null}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--foreground)]">{option.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{option.description}</p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-[18px] bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            Save preferences
          </button>
        </div>
      </div>
    </section>
  );
}
