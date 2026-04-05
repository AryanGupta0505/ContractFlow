"use client";

import { Edit3, Layers3, Play, Trash2 } from "lucide-react";

import type { TemplatePermissions, TemplateRecord } from "@/lib/templates/types";

function prettifyType(value: TemplateRecord["type"]) {
  return value === "NDA" ? "NDA" : value.charAt(0) + value.slice(1).toLowerCase();
}

export function TemplateCard({
  template,
  permissions,
  isDeleting,
  onUse,
  onEdit,
  onDelete,
}: {
  template: TemplateRecord;
  permissions: TemplatePermissions;
  isDeleting: boolean;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_18px_38px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex rounded-full border border-[rgba(80,104,255,0.18)] bg-[var(--primary-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
            {prettifyType(template.type)}
          </span>
          <h3 className="mt-3 text-xl font-semibold text-[var(--foreground)]">
            {template.name}
          </h3>
        </div>
        <div className="rounded-2xl bg-[var(--surface-soft)] p-3 text-[var(--muted)]">
          <Layers3 className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[20px] border border-[var(--border)] bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Created</p>
          <p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">
            {template.createdAtLabel}
          </p>
        </div>
        <div className="rounded-[20px] border border-[var(--border)] bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Usage</p>
          <p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">
            {template.usageCount} contract{template.usageCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-[20px] border border-[var(--border)] bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Workflow</p>
          <p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">
            {template.workflowName || "None"}
          </p>
        </div>
      </div>

      <p className="mt-5 max-h-[84px] overflow-hidden text-sm leading-7 text-[var(--muted)]">
        {template.contentText || "Template content is ready for contract creation."}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onUse}
          className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow hover:bg-[var(--primary-strong)]"
        >
          <Play className="h-4 w-4" />
          Use Template
        </button>

        {permissions.canEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </button>
        ) : null}

        {permissions.canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
