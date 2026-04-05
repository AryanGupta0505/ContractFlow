import type {
  WorkflowAIInput,
  WorkflowAIResponse,
  WorkflowPayload,
  WorkflowRecord,
  WorkflowsResponse,
} from "@/lib/workflows/types";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Request failed.");
  }

  return (await response.json()) as T;
}

export async function getWorkflows() {
  const response = await fetch("/api/workflows", {
    method: "GET",
    cache: "no-store",
  });

  return parseJson<WorkflowsResponse>(response);
}

export async function createWorkflow(payload: WorkflowPayload) {
  const response = await fetch("/api/workflows", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<WorkflowRecord>(response);
}

export async function updateWorkflow(id: string, payload: WorkflowPayload) {
  const response = await fetch(`/api/workflows/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<WorkflowRecord>(response);
}

export async function deleteWorkflow(id: string) {
  const response = await fetch(`/api/workflows/${id}`, {
    method: "DELETE",
  });

  return parseJson<{ success: true; unlinkedContracts: number }>(response);
}

export async function generateWorkflowWithAI(payload: WorkflowAIInput) {
  const response = await fetch("/api/ai/workflows", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<WorkflowAIResponse>(response);
}
