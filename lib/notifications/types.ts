export type NotificationType =
  | "CONTRACT_CREATED"
  | "APPROVAL_REQUIRED"
  | "CONTRACT_APPROVED"
  | "CONTRACT_REJECTED"
  | "SIGNATURE_REQUIRED"
  | "SYSTEM";

export type NotificationStatusFilter = "ALL" | "UNREAD" | "READ";

export type NotificationRecord = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  route: string | null;
  read: boolean;
  createdAt: string;
  createdAtLabel: string;
};

export type NotificationsResponse = {
  items: NotificationRecord[];
  unreadCount: number;
  totalCount: number;
};
