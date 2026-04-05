import type {
  SettingsResponse,
  ThemePreference,
  UpdateProfileInput,
  UpdateSecurityInput,
} from "@/lib/settings/types";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Request failed.");
  }

  return (await response.json()) as T;
}

export async function getSettings() {
  const response = await fetch("/api/settings", {
    method: "GET",
    cache: "no-store",
  });

  return parseJson<SettingsResponse>(response);
}

export async function updateProfile(input: UpdateProfileInput) {
  const response = await fetch("/api/settings/profile", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<SettingsResponse["profile"]>(response);
}

export async function updateSecurity(input: UpdateSecurityInput) {
  const response = await fetch("/api/settings/security", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJson<{ success: true }>(response);
}

export async function updatePreferences(theme: ThemePreference) {
  const response = await fetch("/api/settings/preferences", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ theme }),
  });

  return parseJson<{ theme: ThemePreference }>(response);
}

export async function leaveCurrentWorkspace() {
  const response = await fetch("/api/settings/leave-workspace", {
    method: "POST",
  });

  return parseJson<{ success: true }>(response);
}

export async function changeCurrentOrganization(name: string) {
  const response = await fetch("/api/settings/change-organization", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  return parseJson<{ success: true; organization: { id: string; name: string } }>(response);
}

export async function deleteAccount() {
  const response = await fetch("/api/settings/account", {
    method: "DELETE",
  });

  return parseJson<{ success: true }>(response);
}
