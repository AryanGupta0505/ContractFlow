"use client";

import type {
  NotificationStatusFilter,
  NotificationType,
} from "@/lib/notifications/types";

export function NotificationFilters({
  status,
  type,
  onStatusChange,
  onTypeChange,
  onClear,
}: {
  status: NotificationStatusFilter;
  type: NotificationType | "ALL";
  onStatusChange: (value: NotificationStatusFilter) => void;
  onTypeChange: (value: NotificationType | "ALL") => void;
  onClear: () => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[180px_220px_max-content] lg:items-center">
      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value as NotificationStatusFilter)}
        className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
      >
        <option value="ALL">All notifications</option>
        <option value="UNREAD">Unread</option>
        <option value="READ">Read</option>
      </select>

      <select
        value={type}
        onChange={(event) => onTypeChange(event.target.value as NotificationType | "ALL")}
        className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
      >
        <option value="ALL">All types</option>
        <option value="CONTRACT_CREATED">Contract created</option>
        <option value="APPROVAL_REQUIRED">Approval required</option>
        <option value="CONTRACT_APPROVED">Contract approved</option>
        <option value="CONTRACT_REJECTED">Contract rejected</option>
        <option value="SIGNATURE_REQUIRED">Signature required</option>
        <option value="SYSTEM">System</option>
      </select>

      <button
        type="button"
        onClick={onClear}
        className="w-fit rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 text-sm"
      >
        Clear
      </button>
    </div>
  );
}
