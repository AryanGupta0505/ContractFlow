import { redirect } from "next/navigation";

import { ContractsPageClient } from "@/components/contracts/contracts-page-client";
import { getContractAccessContext } from "@/lib/contracts/access";
import {
  defaultContractFilters,
  type ContractFilters,
  type ContractStatus,
} from "@/lib/contracts/types";

function getString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function parseFilters(searchParams: Record<string, string | string[] | undefined>): ContractFilters {
  return {
    ...defaultContractFilters,
    search: getString(searchParams.search),
    statuses: getString(searchParams.statuses)
      .split(",")
      .filter(Boolean) as ContractStatus[],
    workflowIds: getString(searchParams.workflowIds).split(",").filter(Boolean),
    createdByIds: getString(searchParams.createdByIds).split(",").filter(Boolean),
    createdDateRange: getString(searchParams.createdDateRange) as ContractFilters["createdDateRange"],
    createdFrom: getString(searchParams.createdFrom),
    createdTo: getString(searchParams.createdTo),
    sortBy:
      (getString(searchParams.sortBy) as ContractFilters["sortBy"]) ||
      defaultContractFilters.sortBy,
    sortDirection:
      (getString(searchParams.sortDirection) as ContractFilters["sortDirection"]) ||
      defaultContractFilters.sortDirection,
    page: Number(getString(searchParams.page) || defaultContractFilters.page),
    pageSize: Number(getString(searchParams.pageSize) || defaultContractFilters.pageSize),
  };
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await getContractAccessContext();

  if (!context) {
    redirect("/signin?callbackUrl=/contracts");
  }

  const resolvedSearchParams = await searchParams;
  const initialFilters = parseFilters(resolvedSearchParams);

  return (
    <ContractsPageClient
      initialFilters={initialFilters}
      roleLabel={context.role}
      initialPermissions={context.permissions}
    />
  );
}
