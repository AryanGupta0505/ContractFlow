"use client";

import type { NotificationRecord } from "@/lib/notifications/types";
import { NotificationItem } from "@/components/notifications/notification-item";

export function NotificationList({
  items,
  selectedIds,
  onSelect,
  onOpen,
  onToggleRead,
  onDelete,
}: {
  items: NotificationRecord[];
  selectedIds: string[];
  onSelect: (id: string, selected: boolean) => void;
  onOpen: (notification: NotificationRecord) => void;
  onToggleRead: (notification: NotificationRecord) => void;
  onDelete: (notification: NotificationRecord) => void;
}) {
  return (
    <div className="space-y-4">
      {items.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          selected={selectedIds.includes(notification.id)}
          onSelect={(selected) => onSelect(notification.id, selected)}
          onOpen={() => onOpen(notification)}
          onToggleRead={() => onToggleRead(notification)}
          onDelete={() => onDelete(notification)}
        />
      ))}
    </div>
  );
}
