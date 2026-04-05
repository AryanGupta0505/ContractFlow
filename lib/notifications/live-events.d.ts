export type NotificationLiveEvent = {
  type: "notifications.changed";
  organizationId?: string | null;
  userIds?: string[];
};

export function publishNotificationEvent(event: NotificationLiveEvent): void;
export function subscribeNotificationEvents(
  listener: (event: NotificationLiveEvent) => void,
): () => void;
