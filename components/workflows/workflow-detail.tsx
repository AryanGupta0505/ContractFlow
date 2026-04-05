import {
  ArrowRight,
  BarChart3,
  Clock3,
  FileText,
  GitBranch,
  ShieldCheck,
} from "lucide-react";

import type { WorkflowRecord, WorkflowStepInput } from "@/lib/workflows/types";
import { formatConditionForDisplay } from "@/lib/workflows/condition-display";

function formatStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function WorkflowPipeline({
  steps,
  compact = false,
}: {
  steps: WorkflowStepInput[];
  compact?: boolean;
}) {
  if (!steps.length) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-x-2 gap-y-2.5">
        {steps.map((step, index) => (
          <div key={step.id || step.order} className="inline-flex items-center gap-2">
            <div className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <span className="whitespace-nowrap">{step.role}</span>
            </div>
            {index < steps.length - 1 ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-[var(--muted)]">
                <span className="h-px w-3 rounded-full bg-[linear-gradient(90deg,rgba(148,163,184,0.18)_0%,rgba(99,102,241,0.55)_100%)]" />
                <span className="rounded-full border border-[rgba(99,102,241,0.16)] bg-[rgba(99,102,241,0.08)] p-1 text-[var(--primary)]">
                  <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </span>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {steps.map((step, index) => (
        <div key={step.id || step.order} className="flex gap-5">
          <div className="flex flex-col items-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--primary)] bg-[var(--primary-soft)] text-sm font-semibold text-[var(--foreground)] shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
              {step.order}
            </div>
            {index < steps.length - 1 ? (
              <div className="mt-2 h-full w-px bg-[linear-gradient(180deg,var(--primary-soft)_0%,var(--border)_100%)]" />
            ) : null}
          </div>

          <div className="flex-1 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Step {step.order}
              </span>
              <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
                {step.role}
              </span>
            </div>
            <p className="mt-4 text-sm leading-7 text-[var(--foreground)]">
              {formatConditionForDisplay(step.condition)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[var(--surface-soft)] p-3 text-[var(--foreground)]">
          {icon}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function WorkflowDetail({
  workflow,
}: {
  workflow?: WorkflowRecord | null;
}) {
  if (!workflow) {
    return (
      <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
          <GitBranch className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-xl font-semibold text-[var(--foreground)]">
          Select a workflow
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Pick a workflow from the list to inspect its full approval pipeline,
          usage, and analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 rounded-[34px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-7 shadow-[0_22px_54px_rgba(15,23,42,0.05)] sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            Workflow Detail
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {workflow.name}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Full approval pipeline with role ownership, conditional steps, and
            organization usage signals.
          </p>
        </div>

        <div className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--muted)] shadow-sm">
          Created {workflow.createdAtLabel}
          <div className="mt-1 font-medium text-[var(--foreground)]">
            Last used: {workflow.lastUsedAtLabel}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <MetricCard
          icon={<FileText className="h-5 w-5" />}
          label="Contracts using it"
          value={String(workflow.analytics.totalContracts)}
        />
        <MetricCard
          icon={<Clock3 className="h-5 w-5" />}
          label="Active approvals"
          value={String(workflow.analytics.activeApprovals)}
        />
        <MetricCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Completion rate"
          value={`${workflow.analytics.completionRate}%`}
        />
      </div>

      <section className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--primary-soft)] p-3 text-[var(--primary)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Approval Pipeline
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Role sequence stays explicit so SLA, escalation, and parallel
              branches can be added later.
            </p>
          </div>
        </div>

        <div className="mt-7">
          <WorkflowPipeline steps={workflow.steps} />
        </div>
      </section>

      <section className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Contracts Using This Workflow
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Most recent contracts attached to this workflow.
            </p>
          </div>
          <div className="rounded-full bg-[var(--surface-soft)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            {workflow.contractCount} total
          </div>
        </div>

        {workflow.usageContracts.length ? (
          <div className="mt-6 space-y-4">
            {workflow.usageContracts.map((contract) => (
              <div
                key={contract.id}
                className="flex flex-col gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-5 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {contract.title}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    {formatStatus(contract.status)} • {contract.approvalProgressLabel}
                  </p>
                </div>
                <p className="text-sm text-[var(--muted)]">
                  Added {new Date(contract.createdAt).toLocaleDateString("en-US")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[22px] border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-5 py-7 text-sm text-[var(--muted)]">
            No contracts are using this workflow yet.
          </div>
        )}
      </section>
    </div>
  );
}
