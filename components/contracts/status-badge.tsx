import type { ContractStatus } from "@/lib/contracts/types";

const badgeStyles: Record<ContractStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  SIGNED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-stone-100 text-stone-500",
};

const badgeLabels: Record<ContractStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  SIGNED: "Signed",
  ARCHIVED: "Archived",
};

export function StatusBadge({ status }: { status: ContractStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyles[status]}`}
    >
      {badgeLabels[status]}
    </span>
  );
}
