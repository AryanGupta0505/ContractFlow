"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCheck, LoaderCircle, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { NotificationFilters } from "@/components/notifications/notification-filters";
import { NotificationList } from "@/components/notifications/notification-list";
import { useToast } from "@/components/providers/toast-provider";
import {
  getNotifications,
  markAllNotificationsRead,
  removeNotification,
  setNotificationReadState,
} from "@/lib/notifications/api";
import type {
  NotificationRecord,
  NotificationStatusFilter,
  NotificationType,
} from "@/lib/notifications/types";

export function NotificationsPageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<NotificationStatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "ALL">("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const query = useQuery({
    queryKey: ["notifications", statusFilter, typeFilter],
    queryFn: () => getNotifications({ status: statusFilter, type: typeFilter }),
    refetchInterval: 15_000,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const visibleSelectedIds = useMemo(() => {
    if (!selectedIds.length) {
      return [];
    }

    const visibleIds = new Set(items.map((item) => item.id));
    return selectedIds.filter((id) => visibleIds.has(id));
  }, [items, selectedIds]);

  const bulkReadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => setNotificationReadState(id, true)));
    },
    onSuccess: async () => {
      setSelectedIds([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread"] }),
      ]);
      pushToast({ tone: "success", title: "Updated", description: "Selected notifications were marked as read." });
    },
    onError: (error) => {
      pushToast({
        tone: "error",
        title: "Bulk update failed",
        description: error instanceof Error ? error.message : "Unable to update notifications.",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => removeNotification(id)));
    },
    onSuccess: async () => {
      setSelectedIds([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread"] }),
      ]);
      pushToast({ tone: "success", title: "Deleted", description: "Selected notifications were removed." });
    },
    onError: (error) => {
      pushToast({
        tone: "error",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete notifications.",
      });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications-unread"] }),
      ]);
      pushToast({ tone: "success", title: "Inbox cleared", description: "All notifications were marked as read." });
    },
    onError: (error) => {
      pushToast({
        tone: "error",
        title: "Unable to mark all as read",
        description: error instanceof Error ? error.message : "Unable to update notifications.",
      });
    },
  });

  const selectedCount = visibleSelectedIds.length;
  const allSelected = useMemo(
    () => items.length > 0 && items.every((item) => visibleSelectedIds.includes(item.id)),
    [items, visibleSelectedIds],
  );

  async function refreshNotifications() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications-unread"] }),
    ]);
  }

  async function handleOpen(notification: NotificationRecord) {
    if (!notification.read) {
      await setNotificationReadState(notification.id, true).catch(() => null);
      await refreshNotifications();
    }

    if (notification.route) {
      router.push(notification.route);
    }
  }

  async function handleToggleRead(notification: NotificationRecord) {
    try {
      await setNotificationReadState(notification.id, !notification.read);
      await refreshNotifications();
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unable to update notification.",
      });
    }
  }

  async function handleDelete(notification: NotificationRecord) {
    try {
      await removeNotification(notification.id);
      await refreshNotifications();
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete notification.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(140deg,#fff8ee_0%,#f9fbff_48%,#eef4ff_100%)] shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <div className="grid gap-5 p-6 sm:p-7 xl:grid-cols-[minmax(0,1.1fr)_320px] xl:items-start">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Notifications</p>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[3.1rem] sm:leading-[0.98]">
              Inbox for approvals, contracts, and workspace updates
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Review actionable activity, jump into related contracts, and keep your workspace inbox under control.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/86 p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Inbox stats</p>
                <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">{query.data?.unreadCount ?? 0} unread</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <BellRing className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Total</p>
                <p className="mt-1.5 text-lg font-semibold text-[var(--foreground)]">{query.data?.totalCount ?? 0}</p>
              </div>
              <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Unread</p>
                <p className="mt-1.5 text-lg font-semibold text-[var(--foreground)]">{query.data?.unreadCount ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <NotificationFilters
              status={statusFilter}
              type={typeFilter}
              onStatusChange={setStatusFilter}
              onTypeChange={setTypeFilter}
              onClear={() => {
                setStatusFilter("ALL");
                setTypeFilter("ALL");
              }}
            />

            <button
              type="button"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending || !query.data?.unreadCount}
              className="inline-flex items-center gap-2 rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] disabled:opacity-60"
            >
              {markAllMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Mark all as read
            </button>
          </div>

          {selectedCount ? (
            <div className="flex flex-col gap-3 rounded-[24px] border border-[rgba(67,97,238,0.12)] bg-[linear-gradient(180deg,#f4f7ff_0%,#eef3ff_100%)] p-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm font-semibold text-[var(--foreground)]">{selectedCount} selected</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => bulkReadMutation.mutate(visibleSelectedIds)}
                  disabled={bulkReadMutation.isPending}
                  className="rounded-[16px] border border-[var(--border)] bg-white px-4 py-2.5 text-sm disabled:opacity-60"
                >
                  Mark read
                </button>
                <button
                  type="button"
                  onClick={() => bulkDeleteMutation.mutate(visibleSelectedIds)}
                  disabled={bulkDeleteMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-[16px] border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ) : null}

          {query.isLoading ? (
            <div className="h-24 animate-pulse rounded-[22px] bg-[var(--surface-soft)]" />
          ) : null}

          {!query.isLoading ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelectedIds(allSelected ? [] : items.map((item) => item.id))}
                  />
                  Select visible notifications
                </label>
                <p>{items.length} results</p>
              </div>

              {items.length ? (
                <NotificationList
                  items={items}
                  selectedIds={selectedIds}
                  onSelect={(id, selected) =>
                    setSelectedIds((current) =>
                      selected ? [...new Set([...current, id])] : current.filter((item) => item !== id),
                    )
                  }
                  onOpen={handleOpen}
                  onToggleRead={handleToggleRead}
                  onDelete={handleDelete}
                />
              ) : (
                <div className="rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-6 py-14 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[var(--surface-soft)] text-[var(--muted)]">
                    <BellRing className="h-6 w-6" />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold text-[var(--foreground)]">No notifications yet</h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">New approval, contract, and system events will appear here.</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
