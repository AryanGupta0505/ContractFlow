"use client";

import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertCircle,
  Archive,
  ArrowUpRight,
  FilePlus2,
  LoaderCircle,
  Trash2,
  Waypoints,
} from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";

import { ContractFilters } from "@/components/contracts/contract-filters";
import { ContractTable } from "@/components/contracts/contract-table";
import {
  deleteContract,
  getContracts,
  runBulkAction,
  runContractAction,
} from "@/lib/contracts/api";
import {
  defaultContractFilters,
  type BulkAction,
  type ContractFilters as ContractFilterState,
  type ContractMutationAction,
  type ContractPermissions,
  type ContractRecord,
  type ContractsResponse,
  type SortField,
} from "@/lib/contracts/types";
import {
  inferContractTypeFromMetadata,
  inferContractTypeFromSignals,
  matchWorkflowByType,
} from "@/lib/contracts/workflow-matching";

type ContractsPageClientProps = {
  initialFilters: ContractFilterState;
  roleLabel: string;
  initialPermissions: ContractPermissions;
};

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debounced;
}

function buildSearchParams(filters: ContractFilterState) {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.statuses.length) {
    params.set("statuses", filters.statuses.join(","));
  }

  if (filters.workflowIds.length) {
    params.set("workflowIds", filters.workflowIds.join(","));
  }

  if (filters.createdByIds.length) {
    params.set("createdByIds", filters.createdByIds.join(","));
  }

  if (filters.createdDateRange) {
    params.set("createdDateRange", filters.createdDateRange);
  }

  if (filters.createdFrom) {
    params.set("createdFrom", filters.createdFrom);
  }

  if (filters.createdTo) {
    params.set("createdTo", filters.createdTo);
  }

  if (filters.sortBy !== defaultContractFilters.sortBy) {
    params.set("sortBy", filters.sortBy);
  }

  if (filters.sortDirection !== defaultContractFilters.sortDirection) {
    params.set("sortDirection", filters.sortDirection);
  }

  if (filters.page !== defaultContractFilters.page) {
    params.set("page", String(filters.page));
  }

  if (filters.pageSize !== defaultContractFilters.pageSize) {
    params.set("pageSize", String(filters.pageSize));
  }

  return params.toString();
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <article className="rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-5 shadow-sm">
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${tone}`}>
        {label}
      </span>
      <p className="mt-4 text-3xl font-semibold text-[var(--foreground)]">{value}</p>
    </article>
  );
}

function applyContractUpdate(
  data: ContractsResponse,
  contractId: string,
  updater: (contract: ContractRecord) => ContractRecord | null,
) {
  const items = data.items.flatMap((item) => {
    if (item.id !== contractId) {
      return [item];
    }

    const nextItem = updater(item);
    return nextItem ? [nextItem] : [];
  });

  return {
    ...data,
    items,
    totalItems: items.length < data.items.length ? Math.max(0, data.totalItems - 1) : data.totalItems,
  };
}

function suggestWorkflowId(
  contract: ContractRecord,
  workflows: ContractsResponse["workflows"],
) {
  const metadataType = inferContractTypeFromMetadata(contract.metadata);
  const type =
    metadataType ||
    inferContractTypeFromSignals(
      `${contract.title} ${contract.summary || ""} ${contract.metadata.join(" ")} ${contract.content}`,
    );
  const workflow = matchWorkflowByType(type, workflows);

  return workflow?.id || "";
}

export function ContractsPageClient({
  initialFilters,
  roleLabel,
  initialPermissions,
}: ContractsPageClientProps) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(initialFilters);
  const [searchValue, setSearchValue] = useState(initialFilters.search);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkWorkflowId, setBulkWorkflowId] = useState("");
  const debouncedSearch = useDebouncedValue(searchValue, 300);

  const queryFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch,
    }),
    [debouncedSearch, filters],
  );

  useEffect(() => {
    const nextUrl = buildSearchParams(queryFilters);

    startTransition(() => {
      window.history.replaceState(
        null,
        "",
        nextUrl ? `/contracts?${nextUrl}` : "/contracts",
      );
    });
  }, [queryFilters]);

  const query = useQuery({
    queryKey: ["contracts", queryFilters],
    queryFn: () => getContracts(queryFilters),
    placeholderData: keepPreviousData,
  });

  const permissions = query.data?.permissions || initialPermissions;
  const contracts = query.data?.items || [];
  const workflows = query.data?.workflows || [];
  const creators = query.data?.creators || [];

  const updateAllContractQueries = (
    updater: (data: ContractsResponse) => ContractsResponse,
  ) => {
    const snapshots = queryClient.getQueriesData<ContractsResponse>({
      queryKey: ["contracts"],
    });

    snapshots.forEach(([key, value]) => {
      if (value) {
        queryClient.setQueryData(key, updater(value));
      }
    });

    return snapshots;
  };

  const rowActionMutation = useMutation({
    mutationFn: async ({
      contract,
      action,
    }: {
      contract: ContractRecord;
      action: ContractMutationAction | "delete";
    }) => {
      if (action === "delete") {
        await deleteContract(contract.id);
        return null;
      }

      return runContractAction(
        contract.id,
        action,
        action === "send_for_approval" && !contract.workflow
          ? suggestWorkflowId(contract, workflows)
          : "",
      );
    },
    onMutate: async ({ contract, action }) => {
      await queryClient.cancelQueries({ queryKey: ["contracts"] });
      const snapshots =
        action === "delete"
          ? updateAllContractQueries((data) =>
              applyContractUpdate(data, contract.id, () => null),
            )
          : updateAllContractQueries((data) =>
              applyContractUpdate(data, contract.id, (item) => {
                if (action === "archive") {
                  return {
                    ...item,
                    status: "ARCHIVED",
                    updatedAt: new Date().toISOString(),
                  };
                }

                if (action === "unarchive") {
                  return {
                    ...item,
                    status: "DRAFT",
                    updatedAt: new Date().toISOString(),
                  };
                }

                if (action === "send_for_approval") {
                  return {
                    ...item,
                    status: "PENDING",
                    updatedAt: new Date().toISOString(),
                  };
                }

                return item;
              }),
            );

      if (action === "delete") {
        setSelectedIds((current) => current.filter((id) => id !== contract.id));
      }

      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contracts"] });
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async (payload: BulkAction) => runBulkAction(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ["contracts"] });

      const snapshots = updateAllContractQueries((data) => {
        if (payload.action === "delete") {
          return {
            ...data,
            items: data.items.filter((item) => !payload.ids.includes(item.id)),
            totalItems: Math.max(0, data.totalItems - payload.ids.length),
          };
        }

        if (payload.action === "archive") {
          return {
            ...data,
            items: data.items.map((item) =>
              payload.ids.includes(item.id)
                ? {
                    ...item,
                    status: "ARCHIVED",
                    updatedAt: new Date().toISOString(),
                  }
                : item,
            ),
          };
        }

        return {
          ...data,
          items: data.items.map((item) => {
            if (!payload.ids.includes(item.id)) {
              return item;
            }

            return {
              ...item,
              workflow:
                data.workflows.find((workflow) => workflow.id === payload.workflowId) ||
                item.workflow,
              updatedAt: new Date().toISOString(),
            };
          }),
        };
      });

      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
    },
    onSettled: async () => {
      setSelectedIds([]);
      setBulkWorkflowId("");
      await queryClient.invalidateQueries({ queryKey: ["contracts"] });
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });

  const selectedCount = selectedIds.length;

  const selectionLabel = useMemo(() => {
    if (!selectedCount) {
      return "";
    }

    return `${selectedCount} contract${selectedCount === 1 ? "" : "s"} selected`;
  }, [selectedCount]);

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,#fff7ea_0%,#f8fbff_44%,#ffffff_100%)] shadow-sm">
        <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.25fr_0.75fr] xl:items-center">
          <div className="relative">
            <div className="absolute -left-10 top-2 h-28 w-28 rounded-full bg-[radial-gradient(circle,#e8eeff_0%,rgba(232,238,255,0)_72%)]" />
            <div className="relative">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                Workspace Contracts
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
                Contracts
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                Review agreements across your workspace, filter them cleanly, and jump straight into the contracts that need attention.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full border border-[var(--border)] bg-white/85 px-4 py-2 text-sm text-[var(--muted)] shadow-sm">
                  Centralized contract tracking
                </div>
                <div className="rounded-full border border-[var(--border)] bg-white/85 px-4 py-2 text-sm text-[var(--muted)] shadow-sm">
                  Live workflow visibility
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_20px_44px_rgba(35,40,75,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                  Access Level
                </p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  {roleLabel}
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--surface-soft)] px-3 py-2 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Contracts hub
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Open the contract studio to draft, generate, and route agreements without leaving the workspace.
            </p>

            {permissions.canCreate ? (
              <Link
                href="/contracts/new"
                className="mt-6 inline-flex w-full items-center justify-between rounded-[22px] bg-[var(--primary)] px-5 py-4 text-sm font-medium text-white shadow-[0_18px_40px_rgba(80,104,255,0.24)] hover:bg-[var(--primary-strong)]"
              >
                <span className="inline-flex items-center gap-2">
                  <FilePlus2 className="h-4 w-4" />
                  New Contract
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total contracts"
          value={query.data?.stats.totalContracts || 0}
          tone="bg-[var(--primary-soft)] text-[var(--primary)]"
        />
        <StatCard
          label="Pending approvals"
          value={query.data?.stats.pendingApprovals || 0}
          tone="bg-[var(--warning-soft)] text-[var(--warning)]"
        />
        <StatCard
          label="Approved this month"
          value={query.data?.stats.approvedThisMonth || 0}
          tone="bg-[var(--success-soft)] text-[var(--success)]"
        />
      </section>

      <ContractFilters
        filters={filters}
        workflows={workflows}
        creators={creators}
        searchValue={searchValue}
        totalItems={query.data?.totalItems || 0}
        onSearchChange={(value) => {
          setSearchValue(value);
          setFilters((current) => ({
            ...current,
            page: 1,
          }));
        }}
        onStatusToggle={(status) =>
          setFilters((current) => ({
            ...current,
            page: 1,
            statuses: current.statuses.includes(status)
              ? current.statuses.filter((item) => item !== status)
              : [...current.statuses, status],
          }))
        }
        onFilterChange={(key, value) =>
          setFilters((current) => ({
            ...current,
            page: key === "page" ? Number(value) : 1,
            [key]: value,
            ...(key === "createdDateRange" && value !== "custom"
              ? { createdFrom: "", createdTo: "" }
              : {}),
          }))
        }
        onWorkflowChange={(workflowId) =>
          setFilters((current) => ({
            ...current,
            page: 1,
            workflowIds: workflowId ? [workflowId] : [],
          }))
        }
        onCreatorChange={(creatorId) =>
          setFilters((current) => ({
            ...current,
            page: 1,
            createdByIds: creatorId ? [creatorId] : [],
          }))
        }
        onClear={() => {
          setSearchValue("");
          setFilters(defaultContractFilters);
        }}
      />

      {selectedCount > 0 ? (
        <section className="flex flex-col gap-4 rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-5 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--primary-soft)] p-3 text-[var(--primary)]">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-[var(--foreground)]">{selectionLabel}</p>
              <p className="text-sm text-[var(--muted)]">
                Apply actions to the current selection.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {permissions.canArchive ? (
              <button
                type="button"
                onClick={() => bulkMutation.mutate({ action: "archive", ids: selectedIds })}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
              >
                <Archive className="h-4 w-4" />
                Bulk archive
              </button>
            ) : null}

            {permissions.canDelete ? (
              <button
                type="button"
                onClick={() => bulkMutation.mutate({ action: "delete", ids: selectedIds })}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                Bulk delete
              </button>
            ) : null}

            {permissions.canAssignWorkflow ? (
              <>
                <select
                  value={bulkWorkflowId}
                  onChange={(event) => setBulkWorkflowId(event.target.value)}
                  className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none"
                >
                  <option value="">Assign workflow</option>
                  {workflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!bulkWorkflowId}
                  onClick={() =>
                    bulkMutation.mutate({
                      action: "assignWorkflow",
                      ids: selectedIds,
                      workflowId: bulkWorkflowId,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Waypoints className="h-4 w-4" />
                  Apply workflow
                </button>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      <ContractTable
        contracts={contracts}
        permissions={permissions}
        isLoading={query.isLoading}
        page={query.data?.page || filters.page}
        totalPages={query.data?.totalPages || 1}
        totalItems={query.data?.totalItems || 0}
        sortBy={filters.sortBy}
        sortDirection={filters.sortDirection}
        selectedIds={selectedIds}
        availableWorkflows={workflows}
        onPageChange={(page) =>
          setFilters((current) => ({
            ...current,
            page,
          }))
        }
        onToggleSelection={(id) =>
          setSelectedIds((current) =>
            current.includes(id)
              ? current.filter((item) => item !== id)
              : [...current, id],
          )
        }
        onTogglePageSelection={() =>
          setSelectedIds((current) => {
            const visibleIds = contracts.map((contract) => contract.id);
            const allSelected = visibleIds.every((id) => current.includes(id));

            if (allSelected) {
              return current.filter((id) => !visibleIds.includes(id));
            }

            return Array.from(new Set([...current, ...visibleIds]));
          })
        }
        onSortingChange={(field: SortField) =>
          setFilters((current) => ({
            ...current,
            page: 1,
            sortBy: field,
            sortDirection:
              current.sortBy === field && current.sortDirection === "desc"
                ? "asc"
                : "desc",
          }))
        }
        onAction={(contract, action) => rowActionMutation.mutate({ contract, action })}
      />

      {query.isFetching && !query.isLoading ? (
        <div className="flex items-center justify-end gap-2 text-sm text-[var(--muted)]">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Refreshing contracts
        </div>
      ) : null}
    </div>
  );
}
