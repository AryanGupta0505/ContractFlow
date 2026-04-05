"use client";

import { Braces, CopyPlus } from "lucide-react";

import { ContractEditor } from "@/components/contracts/contract-editor";

const defaultPlaceholders = ["partyA", "partyB", "duration", "paymentTerms"] as const;

export function TemplateEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
}) {
  function insertPlaceholder(token: (typeof defaultPlaceholders)[number]) {
    const placeholder = `{{${token}}}`;
    const nextValue = value.trim()
      ? `${value}<p>${placeholder}</p>`
      : `<p>${placeholder}</p>`;

    onChange(nextValue);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#fffefb_0%,#f8fbff_100%)] p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[var(--primary-soft)] p-3 text-[var(--primary)]">
            <Braces className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Placeholders
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Use placeholder tokens inside the template body so contract creation can
              replace them with real values later.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          {defaultPlaceholders.map((token) => (
            <button
              key={token}
              type="button"
              disabled={disabled}
              onClick={() => insertPlaceholder(token)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3.5 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)] disabled:opacity-60"
            >
              <CopyPlus className="h-3.5 w-3.5" />
              {`{{${token}}}`}
            </button>
          ))}
        </div>
      </div>

      <ContractEditor value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}
