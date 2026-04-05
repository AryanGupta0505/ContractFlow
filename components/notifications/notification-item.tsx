"use client";

import { BellRing, CheckCheck, Circle, Trash2 } from "lucide-react";

import type { NotificationRecord } from "@/lib/notifications/types";

function typeTone(type: NotificationRecord["type"]) {
  if (type === "APPROVAL_REQUIRED") return "border-transparent bg-[var(--warning-soft)] text-[var(--warning)]";
  if (type === "CONTRACT_APPROVED") return "border-transparent bg-[var(--success-soft)] text-[var(--success)]";
  if (type === "CONTRACT_REJECTED") return "border-transparent bg-[var(--danger-soft)] text-[var(--danger)]";
  if (type === "SIGNATURE_REQUIRED") return "border-transparent bg-[var(--info-soft)] text-[var(--info)]";
  return "bg-[var(--primary-soft)] text-[var(--primary)] border-[rgba(67,97,238,0.16)]";
}

export function NotificationItem({
  notification,
  selected,
  onSelect,
  onOpen,
  onToggleRead,
  onDelete,
}: {
  notification: NotificationRecord;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onOpen: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      onClick={onOpen}
      className={`group cursor-pointer rounded-[24px] border p-4 transition ${
        notification.read
          ? "border-[rgba(15,23,42,0.08)] bg-[var(--surface)] hover:bg-[var(--surface-soft)]"
          : "border-[rgba(67,97,238,0.18)] bg-[linear-gradient(180deg,var(--surface-soft)_0%,var(--surface)_100%)] shadow-[0_16px_32px_rgba(67,97,238,0.06)]"
      }`}
    >
      <div className="flex gap-4">
        <div className="pt-1">
          <input
            type="checkbox"
            checked={selected}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onSelect(event.target.checked)}
          />
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--primary)]">
          <BellRing className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {!notification.read ? <Circle className="h-2.5 w-2.5 fill-current text-[var(--primary)]" /> : null}
                <h3 className="text-base font-semibold text-[var(--foreground)]">{notification.title}</h3>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${typeTone(notification.type)}`}>
                  {notification.type.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{notification.message}</p>
            </div>

            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
              {notification.createdAtLabel}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {notification.route ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen();
                }}
                className="inline-flex items-center gap-2 rounded-[14px] border border-[rgba(67,97,238,0.16)] bg-[var(--primary-soft)] px-3 py-2 text-xs font-medium text-[var(--primary)] hover:opacity-90"
              >
                Open item
              </button>
            ) : null}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleRead();
              }}
              className="inline-flex items-center gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
            >
              <CheckCheck className="h-4 w-4" />
              {notification.read ? "Mark unread" : "Mark read"}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className="inline-flex items-center gap-2 rounded-[14px] border px-3 py-2 text-xs font-medium"
              style={{
                borderColor: "var(--danger-border)",
                backgroundColor: "var(--danger-soft)",
                color: "var(--danger)",
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
