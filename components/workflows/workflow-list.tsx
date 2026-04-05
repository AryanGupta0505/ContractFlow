import { ChevronDown, ChevronUp, FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkflowRecord } from "@/lib/workflows/types";

import { WorkflowCard } from "./workflow-card";

export function WorkflowList({
  workflows,
  isLoading,
  permissions,
  selectedWorkflowId,
  onSelect,
  onEdit,
  onDelete,
  deletingIds,
}: {
  workflows?: WorkflowRecord[];
  isLoading: boolean;
  permissions?: { canEdit: boolean; canDelete: boolean };
  selectedWorkflowId?: string;
  onSelect: (workflow: WorkflowRecord) => void;
  onEdit: (workflow: WorkflowRecord) => void;
  onDelete: (id: string) => void;
  deletingIds: Set<string>;
}) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filteredWorkflows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return workflows ?? [];
    }

    return (workflows ?? []).filter((workflow) =>
      [workflow.name, workflow.stepsPreview]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [search, workflows]);

  const visibleWorkflows = showAll ? filteredWorkflows : filteredWorkflows.slice(0, 4);
  const hiddenCount = Math.max(filteredWorkflows.length - visibleWorkflows.length, 0);

  return (
    <div className="rounded-[36px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-7 shadow-[0_20px_48px_rgba(15,23,42,0.05)] sm:p-8">
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
            All Workflows
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            Organization workflows
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--muted)]">
            Browse reusable approval flows, compare load, and pick one to inspect
            in the workflow inspector.
          </p>
        </div>
        <div className="w-full max-w-md">
          <label className="flex items-center gap-3 rounded-[22px] border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--muted)] shadow-sm">
            <Search className="h-4 w-4" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setShowAll(false);
              }}
              placeholder="Search workflows or steps"
              className="w-full bg-transparent outline-none placeholder:text-[var(--muted)]"
            />
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-5">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="flex h-40 animate-pulse flex-col justify-center gap-4 rounded-[28px] bg-[var(--surface-soft)] px-6"
            />
          ))}
        </div>
      ) : null}

      {!isLoading && workflows?.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-14 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--foreground)]">
            No workflows created yet
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-7 text-[var(--muted)]">
            Start with a template on the left, then shape the approval path
            around the teams that need to review your contracts.
          </p>
        </div>
      ) : null}

      {!isLoading && filteredWorkflows.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-4 py-4 text-sm text-[var(--muted)]">
          <p>
            Showing {visibleWorkflows.length} of {filteredWorkflows.length} workflow
            {filteredWorkflows.length !== 1 ? "s" : ""}
            {search.trim() ? " matching your search." : "."}
          </p>
          {filteredWorkflows.length > 4 ? (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface)]"
            >
              {showAll ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {showAll ? "Show less" : `Show ${hiddenCount} more`}
            </button>
          ) : null}
        </div>
      ) : null}

      {!isLoading && (workflows?.length ?? 0) > 0 && filteredWorkflows.length === 0 ? (
        <div className="mt-6 rounded-[28px] border border-dashed border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-10 text-center">
          <p className="text-lg font-semibold text-[var(--foreground)]">
            No workflows match that search
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            Try a workflow name, a role like manager or admin, or part of a step
            sequence.
          </p>
        </div>
      ) : null}

      <div className="mt-8 space-y-5">
        {visibleWorkflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            permissions={permissions}
            isSelected={selectedWorkflowId === workflow.id}
            onSelect={() => onSelect(workflow)}
            onEdit={() => onEdit(workflow)}
            onDelete={() => onDelete(workflow.id)}
            isDeleting={deletingIds.has(workflow.id)}
          />
        ))}
      </div>
    </div>
  );
}
