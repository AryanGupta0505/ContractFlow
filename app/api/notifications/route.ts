import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { listNotifications } from "@/lib/notifications/service";
import type {
  NotificationStatusFilter,
  NotificationType,
} from "@/lib/notifications/types";

const validStatuses = new Set<NotificationStatusFilter>(["ALL", "UNREAD", "READ"]);
const validTypes = new Set<NotificationType>([
  "CONTRACT_CREATED",
  "APPROVAL_REQUIRED",
  "CONTRACT_APPROVED",
  "CONTRACT_REJECTED",
  "SIGNATURE_REQUIRED",
  "SYSTEM",
]);

export async function GET(request: Request) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const statusParam = (url.searchParams.get("status") || "ALL").toUpperCase();
  const typeParam = (url.searchParams.get("type") || "ALL").toUpperCase();

  if (!validStatuses.has(statusParam as NotificationStatusFilter)) {
    return NextResponse.json({ error: "Invalid notification status filter." }, { status: 400 });
  }

  if (typeParam !== "ALL" && !validTypes.has(typeParam as NotificationType)) {
    return NextResponse.json({ error: "Invalid notification type filter." }, { status: 400 });
  }

  const response = await listNotifications({
    userId: context.userId,
    status: statusParam as NotificationStatusFilter,
    type: typeParam as NotificationType | "ALL",
  });

  return NextResponse.json(response);
}
