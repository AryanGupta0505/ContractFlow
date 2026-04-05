import prisma from "@/lib/prisma";
import { publishNotificationEvent } from "@/lib/notifications/live-events";

import type { ContractRole } from "@/lib/contracts/types";
import type {
  NotificationRecord,
  NotificationStatusFilter,
  NotificationType,
  NotificationsResponse,
} from "@/lib/notifications/types";

type NotificationDataShape = {
  title?: string;
  message?: string;
  entityType?: string | null;
  entityId?: string | null;
  route?: string | null;
};

type NotificationWriteInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  route?: string | null;
};

type NotificationChangeEvent = {
  type: "notifications.changed";
  organizationId?: string | null;
  userIds?: string[];
};

const supportedNotificationTypes = new Set<NotificationType>([
  "CONTRACT_CREATED",
  "APPROVAL_REQUIRED",
  "CONTRACT_APPROVED",
  "CONTRACT_REJECTED",
  "SIGNATURE_REQUIRED",
  "SYSTEM",
]);

function isNotificationType(value: string): value is NotificationType {
  return supportedNotificationTypes.has(value as NotificationType);
}

function formatRelativeTime(value: Date) {
  const diffMs = value.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absMinutes < 60) {
    return rtf.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) {
    return rtf.format(diffDays, "day");
  }

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, "month");
  }

  const diffYears = Math.round(diffDays / 365);
  return rtf.format(diffYears, "year");
}

function defaultTitleForType(type: NotificationType) {
  switch (type) {
    case "CONTRACT_CREATED":
      return "Contract created";
    case "APPROVAL_REQUIRED":
      return "Approval required";
    case "CONTRACT_APPROVED":
      return "Contract approved";
    case "CONTRACT_REJECTED":
      return "Contract rejected";
    case "SIGNATURE_REQUIRED":
      return "Signature required";
    default:
      return "System update";
  }
}

function defaultMessageForType(type: NotificationType) {
  switch (type) {
    case "CONTRACT_CREATED":
      return "A new contract is ready in your workspace.";
    case "APPROVAL_REQUIRED":
      return "A contract needs your approval.";
    case "CONTRACT_APPROVED":
      return "A contract completed its approval flow.";
    case "CONTRACT_REJECTED":
      return "A contract was rejected and sent back to draft.";
    case "SIGNATURE_REQUIRED":
      return "A contract is waiting for signature.";
    default:
      return "A new system notification is available.";
  }
}

function parseNotificationData(rawData: unknown): NotificationDataShape {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return {};
  }

  const data = rawData as Record<string, unknown>;
  return {
    title: typeof data.title === "string" ? data.title : undefined,
    message: typeof data.message === "string" ? data.message : undefined,
    entityType: typeof data.entityType === "string" ? data.entityType : null,
    entityId: typeof data.entityId === "string" ? data.entityId : null,
    route: typeof data.route === "string" ? data.route : null,
  };
}

function buildNotificationRoute(
  entityType: string | null,
  entityId: string | null,
  explicitRoute?: string | null,
) {
  if (explicitRoute) {
    return explicitRoute;
  }

  if (!entityType || !entityId) {
    return null;
  }

  if (entityType === "contract" || entityType === "approval") {
    return `/contracts/${entityId}`;
  }

  if (entityType === "workflow") {
    return "/workflows";
  }

  return null;
}

function toNotificationRecord(notification: {
  id: string;
  type: string;
  data: unknown;
  read: boolean;
  createdAt: Date;
}): NotificationRecord {
  const type = isNotificationType(notification.type) ? notification.type : "SYSTEM";
  const parsed = parseNotificationData(notification.data);

  return {
    id: notification.id,
    type,
    title: parsed.title || defaultTitleForType(type),
    message: parsed.message || defaultMessageForType(type),
    entityType: parsed.entityType ?? null,
    entityId: parsed.entityId ?? null,
    route: buildNotificationRoute(parsed.entityType ?? null, parsed.entityId ?? null, parsed.route ?? null),
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
    createdAtLabel: formatRelativeTime(notification.createdAt),
  };
}

async function emitNotificationChange(event: NotificationChangeEvent) {
  publishNotificationEvent(event);

  await prisma.$executeRaw`
    SELECT pg_notify('notifications_live', ${JSON.stringify(event)})
  `;
}

export async function listNotifications(input: {
  userId: string;
  status?: NotificationStatusFilter;
  type?: NotificationType | "ALL";
}): Promise<NotificationsResponse> {
  const where = {
    userId: input.userId,
    ...(input.status === "READ" ? { read: true } : {}),
    ...(input.status === "UNREAD" ? { read: false } : {}),
    ...(input.type && input.type !== "ALL" ? { type: input.type } : {}),
  };

  const [items, unreadCount, totalCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.notification.count({
      where: {
        userId: input.userId,
        read: false,
      },
    }),
    prisma.notification.count({
      where: {
        userId: input.userId,
      },
    }),
  ]);

  return {
    items: items.map(toNotificationRecord),
    unreadCount,
    totalCount,
  };
}

export async function updateNotificationReadState(
  userId: string,
  notificationId: string,
  read: boolean,
  organizationId?: string,
) {
  const existing = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!existing) {
    throw new Error("Notification not found.");
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { read },
  });

  await emitNotificationChange({
    type: "notifications.changed",
    organizationId: organizationId ?? null,
    userIds: [userId],
  });

  return toNotificationRecord(updated);
}

export async function markAllNotificationsAsRead(userId: string, organizationId?: string) {
  await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
    },
  });

  await emitNotificationChange({
    type: "notifications.changed",
    organizationId: organizationId ?? null,
    userIds: [userId],
  });
}

export async function deleteNotification(userId: string, notificationId: string, organizationId?: string) {
  const existing = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new Error("Notification not found.");
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  await emitNotificationChange({
    type: "notifications.changed",
    organizationId: organizationId ?? null,
    userIds: [userId],
  });
}

export async function createNotification(
  input: NotificationWriteInput,
  options?: {
    organizationId?: string | null;
    userIds?: string[];
  },
) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      data: {
        title: input.title,
        message: input.message,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        route: input.route ?? null,
      },
    },
  });

  await emitNotificationChange({
    type: "notifications.changed",
    organizationId: options?.organizationId ?? null,
    userIds: options?.userIds ?? [input.userId],
  });
}

export async function createNotifications(
  inputs: NotificationWriteInput[],
  options?: {
    organizationId?: string | null;
    userIds?: string[];
  },
) {
  if (!inputs.length) {
    return;
  }

  await prisma.notification.createMany({
    data: inputs.map((input) => ({
      userId: input.userId,
      type: input.type,
      data: {
        title: input.title,
        message: input.message,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        route: input.route ?? null,
      },
      read: false,
    })),
  });

  await emitNotificationChange({
    type: "notifications.changed",
    organizationId: options?.organizationId ?? null,
    userIds: options?.userIds ?? Array.from(new Set(inputs.map((input) => input.userId))),
  });
}

async function createOrganizationNotifications(input: {
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  route?: string | null;
}) {
  const memberships = await prisma.membership.findMany({
    where: {
      organizationId: input.organizationId,
    },
    select: {
      userId: true,
    },
  });

  const userIds = Array.from(new Set(memberships.map((membership) => membership.userId)));

  await createNotifications(
    userIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      route: input.route ?? null,
    })),
    {
      organizationId: input.organizationId,
      userIds,
    },
  );
}

export async function notifyContractCreated(input: {
  organizationId: string;
  actorName: string;
  contractId: string;
  contractTitle: string;
}) {
  await createOrganizationNotifications({
    organizationId: input.organizationId,
    type: "CONTRACT_CREATED",
    title: "Contract created",
    message: `${input.actorName} created ${input.contractTitle}.`,
    entityType: "contract",
    entityId: input.contractId,
    route: `/contracts/${input.contractId}`,
  });
}

export async function notifyApprovalRequired(input: {
  organizationId: string;
  contractId: string;
  contractTitle: string;
  role: ContractRole;
}) {
  await createOrganizationNotifications({
    organizationId: input.organizationId,
    type: "APPROVAL_REQUIRED",
    title: "Approval required",
    message: `${input.contractTitle} is waiting for ${input.role.toLowerCase()} approval.`,
    entityType: "approval",
    entityId: input.contractId,
    route: `/contracts/${input.contractId}`,
  });
}

export async function notifyContractApproved(input: {
  organizationId: string;
  actorName: string;
  contractId: string;
  contractTitle: string;
}) {
  await createOrganizationNotifications({
    organizationId: input.organizationId,
    type: "CONTRACT_APPROVED",
    title: "Contract approved",
    message: `${input.actorName} approved ${input.contractTitle}.`,
    entityType: "contract",
    entityId: input.contractId,
    route: `/contracts/${input.contractId}`,
  });
}

export async function notifyContractRejected(input: {
  organizationId: string;
  actorName: string;
  contractId: string;
  contractTitle: string;
}) {
  await createOrganizationNotifications({
    organizationId: input.organizationId,
    type: "CONTRACT_REJECTED",
    title: "Contract rejected",
    message: `${input.actorName} rejected ${input.contractTitle}.`,
    entityType: "contract",
    entityId: input.contractId,
    route: `/contracts/${input.contractId}`,
  });
}

export async function notifySignatureRequired(input: {
  organizationId: string;
  contractId: string;
  contractTitle: string;
  emails: string[];
}) {
  if (!input.emails.length) {
    return;
  }

  const suffix =
    input.emails.length > 0
      ? ` Signature requested from ${input.emails.join(", ")}.`
      : "";

  await createOrganizationNotifications({
    organizationId: input.organizationId,
    type: "SIGNATURE_REQUIRED",
    title: "Signature required",
    message: `${input.contractTitle} is waiting for signature.${suffix}`,
    entityType: "contract",
    entityId: input.contractId,
    route: `/contracts/${input.contractId}`,
  });
}
