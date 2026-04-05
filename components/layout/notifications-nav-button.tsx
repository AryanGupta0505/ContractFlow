"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { getNotifications } from "@/lib/notifications/api";

export function NotificationsNavButton() {
  const query = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => getNotifications(),
    refetchInterval: 15_000,
  });

  const unreadCount = query.data?.unreadCount ?? 0;
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
      aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
    >
      <Bell className="h-4 w-4" />
      {unreadCount ? (
        <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(67,97,238,0.35)]">
          {badgeLabel}
        </span>
      ) : null}
    </Link>
  );
}
