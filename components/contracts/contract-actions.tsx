"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type {
  ContractMutationAction,
  ContractPermissions,
  ContractRecord,
} from "@/lib/contracts/types";

type ContractActionsProps = {
  contract: ContractRecord;
  permissions: ContractPermissions;
  onAction: (contract: ContractRecord, action: ContractMutationAction | "delete") => void;
};

export function ContractActions({
  contract,
  permissions,
  onAction,
}: ContractActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const estimatedMenuHeight = 280;
      setOpenUpward(window.innerHeight - rect.bottom < estimatedMenuHeight);
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-[var(--muted)] hover:border-[var(--border)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open ? (
        <div
          className={`absolute right-0 z-30 w-52 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[0_18px_40px_rgba(24,32,51,0.14)] ${
            openUpward ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <Link
            href={`/contracts/${contract.id}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
          >
            <Eye className="h-4 w-4 text-[var(--muted)]" />
            View
          </Link>

          {permissions.canEdit ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push(`/contracts/${contract.id}?mode=edit`);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
            >
              <Pencil className="h-4 w-4 text-[var(--muted)]" />
              Edit
            </button>
          ) : null}

          {permissions.canEdit ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAction(contract, "duplicate");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
            >
              <Copy className="h-4 w-4 text-[var(--muted)]" />
              Duplicate
            </button>
          ) : null}

          {permissions.canSendForApproval ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAction(contract, "send_for_approval");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
            >
              <Send className="h-4 w-4 text-[var(--muted)]" />
              Send for Approval
            </button>
          ) : null}

          {permissions.canArchive ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAction(contract, contract.status === "ARCHIVED" ? "unarchive" : "archive");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
            >
              {contract.status === "ARCHIVED" ? (
                <RotateCcw className="h-4 w-4 text-[var(--muted)]" />
              ) : (
                <Archive className="h-4 w-4 text-[var(--muted)]" />
              )}
              {contract.status === "ARCHIVED" ? "Unarchive" : "Archive"}
            </button>
          ) : null}

          {permissions.canDelete ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAction(contract, "delete");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger-soft)]"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
