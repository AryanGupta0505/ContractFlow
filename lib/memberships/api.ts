import type {
  CreateMembershipPayload,
  MembershipRecord,
  MembershipsResponse,
  UpdateMembershipPayload,
} from "@/lib/memberships/types";
import type { ContractRole } from "@/lib/contracts/types";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Request failed.");
  }

  return (await response.json()) as T;
}

export async function getMemberships() {
  const response = await fetch("/api/users", {
    method: "GET",
    cache: "no-store",
  });

  return parseJson<MembershipsResponse>(response);
}

export async function createMembership(payload: CreateMembershipPayload) {
  const response = await fetch("/api/users/invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<MembershipRecord>(response);
}

export async function updateMembershipRole(id: string, role: ContractRole) {
  const response = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role }),
  });

  return parseJson<MembershipRecord>(response);
}

export async function updateMembership(id: string, payload: UpdateMembershipPayload) {
  const response = await fetch(`/api/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<MembershipRecord>(response);
}

export async function deleteMembership(id: string) {
  const response = await fetch(`/api/users/${id}`, {
    method: "DELETE",
  });

  return parseJson<{ success: true }>(response);
}
