"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";

import { ContractActions } from "@/components/contracts/contract-actions";
import { StatusBadge } from "@/components/contracts/status-badge";
import type {
  ContractMutationAction,
  ContractPermissions,
  ContractRecord,
  SortDirection,
  SortField,
  WorkflowSummary,
} from "@/lib/contracts/types";

type ContractTableProps = {
  contracts: ContractRecord[];
  permissions: ContractPermissions;
  isLoading: boolean;
  page: number;
  totalPages: number;
  totalItems: number;
  sortBy: SortField;
  sortDirection: SortDirection;
  selectedIds: string[];
  availableWorkflows: WorkflowSummary[];
  onPageChange: (page: number) => void;
  onToggleSelection: (id: string) => void;
  onTogglePageSelection: () => void;
  onSortingChange: (field: SortField) => void;
  onAction: (contract: ContractRecord, action: ContractMutationAction | "delete") => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function HeaderButton({
  label,
  field,
  sortBy,
  sortDirection,
  onClick,
}: {
  label: string;
  field: SortField;
  sortBy: SortField;
  sortDirection: SortDirection;
  onClick: (field: SortField) => void;
}) {
  const active = sortBy === field;

  return (
    <button
      type="button"
      onClick={() => onClick(field)}
      className={`inline-flex items-center gap-2 ${active ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}
    >
      {label}
      <span className="text-[10px] uppercase">{active ? sortDirection : ""}</span>
    </button>
  );
}

function WorkflowCell({ workflow }: { workflow: ContractRecord["workflow"] }) {
  if (!workflow) {
    return <span className="text-sm text-[var(--muted)]">No workflow</span>;
  }

  const percentage = Math.round((workflow.completedSteps / workflow.totalSteps) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm font-medium text-[var(--foreground)]">
          {workflow.name}
        </span>
        <span className="shrink-0 text-xs text-[var(--muted)]">
          {workflow.completedSteps}/{workflow.totalSteps}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <div
          className="h-full rounded-full bg-[var(--primary)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] px-6 py-14 text-center">
      <div className="relative h-28 w-28">
        <div className="absolute inset-2 rounded-[28px] border border-[var(--border)] bg-white shadow-sm" />
        <div className="absolute left-5 top-5 h-16 w-16 rounded-[22px] bg-[var(--primary-soft)]" />
        <div className="absolute right-4 top-8 h-10 w-10 rounded-2xl border border-dashed border-[var(--primary)]" />
      </div>
      <h3 className="mt-6 text-2xl font-semibold text-[var(--foreground)]">No contracts yet</h3>
      <p className="mt-2 max-w-md text-sm leading-7 text-[var(--muted)]">
        Start your first agreement, attach a workflow, and keep approvals moving from one place.
      </p>
      {canCreate ? (
        <Link
          href="/contracts/new"
          className="mt-6 inline-flex rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_32px_rgba(80,104,255,0.24)] hover:bg-[var(--primary-strong)]"
        >
          Create your first contract
        </Link>
      ) : null}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-[var(--border)]">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-[36px_minmax(0,2fr)_0.9fr_1fr_1fr_0.9fr_48px] items-center gap-3 px-5 py-4"
        >
          {Array.from({ length: 7 }, (_, cellIndex) => (
            <div
              key={cellIndex}
              className="h-4 animate-pulse rounded-full bg-[var(--surface-soft)]"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ContractTable({
  contracts,
  permissions,
  isLoading,
  page,
  totalPages,
  totalItems,
  sortBy,
  sortDirection,
  selectedIds,
  availableWorkflows,
  onPageChange,
  onToggleSelection,
  onTogglePageSelection,
  onSortingChange,
  onAction,
}: ContractTableProps) {
  const router = useRouter();
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected =
    contracts.length > 0 && contracts.every((contract) => selectedSet.has(contract.id));

  const columns = useMemo<ColumnDef<ContractRecord>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={onTogglePageSelection}
            className="h-4 w-4 rounded border-[var(--border)]"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedSet.has(row.original.id)}
            onChange={() => onToggleSelection(row.original.id)}
            onClick={(event) => event.stopPropagation()}
            className="h-4 w-4 rounded border-[var(--border)]"
          />
        ),
      },
      {
        accessorKey: "title",
        header: () => (
          <HeaderButton
            label="Contract Name"
            field="name"
            sortBy={sortBy}
            sortDirection={sortDirection}
            onClick={onSortingChange}
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <span className="line-clamp-2 break-words font-medium text-[var(--foreground)]">
              {row.original.title}
            </span>
            <p className="mt-1 line-clamp-2 break-words text-sm text-[var(--muted)]">
              {row.original.parties.length
                ? row.original.parties.join(" • ")
                : "No parties added yet"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <HeaderButton
            label="Status"
            field="status"
            sortBy={sortBy}
            sortDirection={sortDirection}
            onClick={onSortingChange}
          />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "workflow",
        header: "Workflow",
        cell: ({ row }) => <WorkflowCell workflow={row.original.workflow} />,
      },
      {
        accessorKey: "createdBy",
        header: "Created By",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">
              {row.original.createdBy.name}
            </p>
            <p className="truncate text-xs text-[var(--muted)]">
              {row.original.createdBy.email}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: () => (
          <HeaderButton
            label="Last Updated"
            field="updatedAt"
            sortBy={sortBy}
            sortDirection={sortDirection}
            onClick={onSortingChange}
          />
        ),
        cell: ({ row }) => (
          <div className="text-sm text-[var(--muted)]">{formatDate(row.original.updatedAt)}</div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end opacity-100 xl:opacity-0 xl:transition-opacity xl:group-hover:opacity-100">
            <ContractActions
              contract={row.original}
              permissions={permissions}
              onAction={onAction}
            />
          </div>
        ),
      },
    ],
    [
      allVisibleSelected,
      onAction,
      onSortingChange,
      onTogglePageSelection,
      onToggleSelection,
      permissions,
      selectedSet,
      sortBy,
      sortDirection,
    ],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: contracts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(page - 3, 0),
    Math.min(totalPages, Math.max(page + 2, 5)),
  );

  return (
    <section className="overflow-visible rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
            All Contracts
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            Contracts table
          </h3>
        </div>

        <div className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
          {totalItems} records • {availableWorkflows.length} workflows
        </div>
      </div>

      {isLoading ? <LoadingRows /> : null}

      {!isLoading && contracts.length === 0 ? (
        <EmptyState canCreate={permissions.canCreate} />
      ) : null}

      {!isLoading && contracts.length > 0 ? (
        <>
          <div className="px-3 pb-2 pt-3 sm:px-4">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-10" />
                <col className="w-[32%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[14%]" />
                <col className="w-14" />
              </colgroup>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="bg-[linear-gradient(180deg,#f8faff_0%,#eef1ff_100%)] text-left text-xs uppercase tracking-[0.24em] text-[var(--muted)]"
                  >
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 font-medium first:w-10">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/contracts/${row.original.id}`)}
                    className="group cursor-pointer hover:bg-[var(--surface-soft)]"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="border-t border-[var(--border)] px-4 py-4 align-middle"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--muted)]">
              Page {page} of {totalPages}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>

              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => onPageChange(pageNumber)}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-sm ${
                    pageNumber === page
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--border)] bg-white text-[var(--foreground)]"
                  }`}
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
