import type {
  BulkAction,
  ContractFilters,
  GenerateContractInput,
  GenerateContractResponse,
  ContractMutationAction,
  ContractRecord,
  ContractsResponse,
  CreateContractInput,
  UpdateContractInput,
} from "@/lib/contracts/types";

function buildQuery(params: Partial<ContractFilters>) {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.set("search", params.search);
  }

  if (params.statuses?.length) {
    searchParams.set("statuses", params.statuses.join(","));
  }

  if (params.workflowIds?.length) {
    searchParams.set("workflowIds", params.workflowIds.join(","));
  }

  if (params.createdByIds?.length) {
    searchParams.set("createdByIds", params.createdByIds.join(","));
  }

  if (params.createdDateRange) {
    searchParams.set("createdDateRange", params.createdDateRange);
  }

  if (params.createdFrom) {
    searchParams.set("createdFrom", params.createdFrom);
  }

  if (params.createdTo) {
    searchParams.set("createdTo", params.createdTo);
  }

  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }

  if (params.sortDirection) {
    searchParams.set("sortDirection", params.sortDirection);
  }

  if (params.page) {
    searchParams.set("page", String(params.page));
  }

  if (params.pageSize) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  return searchParams.toString();
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(error?.error || "Request failed.");
  }

  return (await response.json()) as T;
}

export async function getContracts(params: ContractFilters) {
  const query = buildQuery(params);
  const response = await fetch(`/api/contracts?${query}`, {
    method: "GET",
    cache: "no-store",
  });

  return parseJson<ContractsResponse>(response);
}

export async function createContract(input: CreateContractInput) {
  const response = await fetch("/api/contracts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<ContractRecord>(response);
}

export async function updateContract(id: string, input: UpdateContractInput) {
  const response = await fetch(`/api/contracts/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<ContractRecord>(response);
}

export async function generateContractWithAI(input: GenerateContractInput) {
  const response = await fetch("/api/ai/generate-contract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<GenerateContractResponse>(response);
}

export async function getManualContractSuggestions(input: GenerateContractInput) {
  const response = await fetch("/api/ai/generate-contract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...input,
      mode: "suggest",
    }),
  });

  return parseJson<GenerateContractResponse>(response);
}

export async function mergeManualContractSuggestions(
  input: GenerateContractInput,
) {
  const response = await fetch("/api/ai/generate-contract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...input,
      mode: "merge",
    }),
  });

  return parseJson<GenerateContractResponse>(response);
}

export async function deleteContract(id: string) {
  const response = await fetch(`/api/contracts/${id}`, {
    method: "DELETE",
  });

  return parseJson<{ success: true }>(response);
}

export async function runContractAction(
  id: string,
  action: ContractMutationAction,
  workflowId?: string,
) {
  const response = await fetch(`/api/contracts/${id}/actions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, workflowId }),
  });

  return parseJson<ContractRecord>(response);
}

export async function runBulkAction(action: BulkAction) {
  const response = await fetch("/api/contracts/bulk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(action),
  });

  return parseJson<{ success: true }>(response);
}
