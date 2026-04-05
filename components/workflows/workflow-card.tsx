import { CalendarRange, Edit2, Trash2 } from "lucide-react";

import type { WorkflowRecord } from "@/lib/workflows/types";

import { WorkflowPipeline } from "./workflow-detail";

export function WorkflowCard({
  workflow,
  permissions,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  isDeleting,
}: {
  workflow: WorkflowRecord;
  permissions?: { canEdit: boolean; canDelete: boolean };
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`rounded-[24px] border p-4 shadow-sm transition sm:p-5 ${
        isSelected
          ? "border-[var(--primary)] bg-[linear-gradient(180deg,var(--primary-soft)_0%,var(--surface)_100%)] shadow-[0_24px_52px_rgba(80,104,255,0.16)]"
          : "border-[rgba(15,23,42,0.08)] bg-[var(--surface)] hover:border-[var(--primary-soft)] hover:shadow-[0_18px_42px_rgba(15,23,42,0.06)]"
      } cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {isSelected ? (
                <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                  Selected
                </span>
              ) : null}
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
                {workflow.steps.length} steps
              </span>
            </div>

            <div className="mt-2 block max-w-full text-left">
              <h3 className="line-clamp-1 text-lg font-semibold text-[var(--foreground)]">
                {workflow.name}
              </h3>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                {workflow.contractCount} linked contract{workflow.contractCount !== 1 && "s"}
              </span>
              <span className="flex items-center gap-1">
                <CalendarRange className="h-3 w-3" />
                {workflow.createdAtLabel}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {permissions?.canEdit ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-soft)]"
              >
                <Edit2 className="h-3 w-3 text-[var(--muted)]" />
                Edit
              </button>
            ) : null}
            {permissions?.canDelete ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                onDelete();
              }}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60"
              style={{
                borderColor: "var(--danger-border)",
                backgroundColor: "var(--surface)",
                color: "var(--danger)",
              }}
            >
              <Trash2 className="h-3 w-3" />
              Delete
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1.8fr)_minmax(220px,0.9fr)] lg:items-start">
          <div className="rounded-[18px] border border-[rgba(15,23,42,0.06)] bg-[var(--surface-soft)] px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Approval path
              </p>
            </div>
            <WorkflowPipeline steps={workflow.steps} compact />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[18px] bg-[var(--surface-soft)] px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                Active
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                {workflow.analytics.activeApprovals}
              </p>
            </div>
            <div className="rounded-[18px] bg-[var(--surface-soft)] px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                Complete
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                {workflow.analytics.completionRate}%
              </p>
            </div>
          </div>
        </div>

        {workflow.contractCount > 0 ? (
          <p className="text-[11px] leading-5 text-[var(--muted)]">
            If deleted, linked contracts will be automatically unlinked from this workflow.
          </p>
        ) : null}
      </div>
    </article>
  );
}
