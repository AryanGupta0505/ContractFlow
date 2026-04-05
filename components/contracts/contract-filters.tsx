"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";

import { StatusBadge } from "@/components/contracts/status-badge";
import { contractStatuses, type ContractFilters, type ContractUser, type WorkflowSummary } from "@/lib/contracts/types";

type ContractFiltersProps = {
  filters: ContractFilters;
  workflows: WorkflowSummary[];
  creators: ContractUser[];
  searchValue: string;
  totalItems: number;
  onSearchChange: (value: string) => void;
  onStatusToggle: (status: (typeof contractStatuses)[number]) => void;
  onFilterChange: <K extends keyof ContractFilters>(
    key: K,
    value: ContractFilters[K],
  ) => void;
  onWorkflowChange: (workflowId: string) => void;
  onCreatorChange: (creatorId: string) => void;
  onClear: () => void;
};

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-normal tracking-normal text-[var(--foreground)] outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ContractFilters({
  filters,
  workflows,
  creators,
  searchValue,
  totalItems,
  onSearchChange,
  onStatusToggle,
  onFilterChange,
  onWorkflowChange,
  onCreatorChange,
  onClear,
}: ContractFiltersProps) {
  return (
    <section className="rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
            Search & Filters
          </p>
          <h2 className="mt-1.5 text-xl font-semibold text-[var(--foreground)] sm:text-2xl">
            Find the right contract fast
          </h2>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
          <SlidersHorizontal className="h-4 w-4" />
          <span>{totalItems} contracts in view</span>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <label className="flex items-center gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3.5">
          <Search className="h-4 w-4 text-[var(--muted)]" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by title, parties, or metadata"
            className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
          />
        </label>

        <div className="grid gap-3 xl:grid-cols-12">
          <div className="xl:col-span-3">
            <label className="flex min-w-0 flex-col gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              Status
            </label>
            <details className="mt-2">
              <summary className="flex h-[50px] cursor-pointer list-none items-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)]">
                {filters.statuses.length
                  ? `${filters.statuses.length} selected`
                  : "All statuses"}
              </summary>
              <div className="mt-2 space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
              {contractStatuses.map((status) => {
                const active = filters.statuses.includes(status);

                return (
                  <label
                    key={status}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-[var(--surface-soft)]"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => onStatusToggle(status)}
                        className="h-4 w-4 rounded border-[var(--border)]"
                      />
                      <StatusBadge status={status} />
                    </div>
                  </label>
                );
              })}
              </div>
            </details>
          </div>

          <div className="xl:col-span-3">
            <SelectField
              label="Workflow"
              value={filters.workflowIds[0] || ""}
              options={[
                { label: "All workflows", value: "" },
                ...workflows.map((workflow) => ({
                  label: workflow.name,
                  value: workflow.id,
                })),
              ]}
              onChange={onWorkflowChange}
            />
          </div>

          <div className="xl:col-span-3">
            <SelectField
              label="Created Date"
              value={filters.createdDateRange}
              options={[
                { label: "Any time", value: "" },
                { label: "Last 7 days", value: "7d" },
                { label: "Last 30 days", value: "30d" },
                { label: "Custom range", value: "custom" },
              ]}
              onChange={(value) =>
                onFilterChange(
                  "createdDateRange",
                  value as ContractFilters["createdDateRange"],
                )
              }
            />
          </div>

          <div className="xl:col-span-3">
            <SelectField
              label="Created By"
              value={filters.createdByIds[0] || ""}
              options={[
                { label: "All creators", value: "" },
                ...creators.map((creator) => ({
                  label: creator.name,
                  value: creator.id,
                })),
              ]}
              onChange={onCreatorChange}
            />
          </div>
        </div>

        <div className="flex justify-start">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" />
            Clear filters
          </button>
        </div>

        {filters.createdDateRange === "custom" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              From
              <input
                type="date"
                value={filters.createdFrom}
                onChange={(event) => onFilterChange("createdFrom", event.target.value)}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-normal tracking-normal text-[var(--foreground)] outline-none"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              To
              <input
                type="date"
                value={filters.createdTo}
                onChange={(event) => onFilterChange("createdTo", event.target.value)}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-normal tracking-normal text-[var(--foreground)] outline-none"
              />
            </label>
          </div>
        ) : null}
      </div>
    </section>
  );
}
