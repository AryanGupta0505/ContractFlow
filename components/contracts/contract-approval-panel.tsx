"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, LoaderCircle, Send, XCircle } from "lucide-react";

import { runContractAction } from "@/lib/contracts/api";
import type {
  ContractPermissions,
  ContractRecord,
  ContractRole,
} from "@/lib/contracts/types";

function canActOnCurrentStep(role: ContractRole, contract: ContractRecord) {
  const currentStepRole = contract.approval.currentStepRole;

  if (!currentStepRole || contract.approval.currentStepStatus !== "PENDING") {
    return false;
  }

  return role === currentStepRole;
}

function getApprovalMessage(contract: ContractRecord) {
  if (!contract.workflow) {
    return "No workflow is attached yet.";
  }

  if (contract.status === "APPROVED") {
    return "All workflow steps are complete.";
  }

  if (contract.approval.currentStepRole && contract.approval.currentStepOrder) {
    return `Current step: ${contract.approval.currentStepRole} approval on step ${contract.approval.currentStepOrder}.`;
  }

  if (contract.status === "DRAFT") {
    return "This contract is ready to be sent into its workflow.";
  }

  return "Waiting for workflow activity.";
}

export function ContractApprovalPanel({
  contract,
  role,
  permissions,
}: {
  contract: ContractRecord;
  role: ContractRole;
  permissions: ContractPermissions;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const canApproveCurrentStep = canActOnCurrentStep(role, contract);

  async function handleAction(action: "send_for_approval" | "approve" | "reject") {
    setIsPending(true);
    setError("");

    try {
      await runContractAction(contract.id, action);
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Unable to update approval state.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
            Approval
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            {getApprovalMessage(contract)}
          </p>
        </div>

        <div className="rounded-full bg-[var(--surface-soft)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
          Your role: {role}
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        {contract.status === "DRAFT" && permissions.canSendForApproval ? (
          <button
            type="button"
            onClick={() => handleAction("send_for_approval")}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send for approval
          </button>
        ) : null}

        {canApproveCurrentStep ? (
          <>
            <button
              type="button"
              onClick={() => handleAction("approve")}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Approve step
            </button>
            <button
              type="button"
              onClick={() => handleAction("reject")}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" />
              Reject step
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
