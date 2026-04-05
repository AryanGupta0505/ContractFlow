import type {
  NotificationRecord,
  NotificationStatusFilter,
  NotificationType,
  NotificationsResponse,
} from "@/lib/notifications/types";

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "Request failed.");
  }

  return (await response.json()) as T;
}

export async function getNotifications(input?: {
  status?: NotificationStatusFilter;
  type?: NotificationType | "ALL";
}) {
  const searchParams = new URLSearchParams();

  if (input?.status && input.status !== "ALL") {
    searchParams.set("status", input.status);
  }

  if (input?.type && input.type !== "ALL") {
    searchParams.set("type", input.type);
  }

  const response = await fetch(`/api/notifications${searchParams.toString() ? `?${searchParams.toString()}` : ""}`, {
    method: "GET",
    cache: "no-store",
  });

  return parseJson<NotificationsResponse>(response);
}

export async function setNotificationReadState(id: string, read: boolean) {
  const response = await fetch(`/api/notifications/${id}/read`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ read }),
  });

  return parseJson<NotificationRecord>(response);
}

export async function markAllNotificationsRead() {
  const response = await fetch("/api/notifications/read-all", {
    method: "PATCH",
  });

  return parseJson<{ success: true }>(response);
}

export async function removeNotification(id: string) {
  const response = await fetch(`/api/notifications/${id}`, {
    method: "DELETE",
  });

  return parseJson<{ success: true }>(response);
}
