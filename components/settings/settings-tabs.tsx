"use client";

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "preferences", label: "Preferences" },
  { id: "danger", label: "Danger Zone" },
] as const;

export type SettingsTabId = (typeof tabs)[number]["id"];

export function SettingsTabs({
  value,
  onChange,
}: {
  value: SettingsTabId;
  onChange: (value: SettingsTabId) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] p-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-[18px] px-4 py-2.5 text-sm font-medium ${
            value === tab.id
              ? "bg-white text-[var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
