import type {
  TemplateAIInput,
  TemplateAIResponse,
  TemplateDeleteResult,
  TemplatePayload,
  TemplateRecord,
  TemplatesResponse,
} from "@/lib/templates/types";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Request failed.");
  }

  return (await response.json()) as T;
}

export async function getTemplates() {
  const response = await fetch("/api/templates", {
    method: "GET",
    cache: "no-store",
  });

  return parseJson<TemplatesResponse>(response);
}

export async function createTemplate(payload: TemplatePayload) {
  const response = await fetch("/api/templates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<TemplateRecord>(response);
}

export async function updateTemplate(id: string, payload: TemplatePayload) {
  const response = await fetch(`/api/templates/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<TemplateRecord>(response);
}

export async function deleteTemplate(id: string) {
  const response = await fetch(`/api/templates/${id}`, {
    method: "DELETE",
  });

  return parseJson<TemplateDeleteResult>(response);
}

export async function generateTemplateWithAI(payload: TemplateAIInput) {
  const response = await fetch("/api/ai/templates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<TemplateAIResponse>(response);
}
