import { ChevronDown } from "lucide-react";

export const roleOptions = [
  { value: "ADMIN", label: "Admin", description: "Final governance and organization-wide control" },
  { value: "MANAGER", label: "Manager", description: "Team or department approval owner" },
  { value: "EMPLOYEE", label: "Employee", description: "Contributor or operational review step" },
] as const;

export function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 pr-10 text-sm text-[var(--foreground)] outline-none hover:bg-[var(--surface-soft)] focus:border-[var(--primary)] focus:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      >
        {roleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} - {option.description}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
        <ChevronDown className="h-4 w-4 opacity-70" />
      </div>
    </div>
  );
}
