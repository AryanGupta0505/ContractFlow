import {
  Activity,
  ArrowRight,
  Clock3,
  FolderKanban,
  Orbit,
  Radar,
  Sparkles,
  Target,
} from "lucide-react";
import { redirect } from "next/navigation";

import { getContractAccessContext } from "@/lib/contracts/access";
import { getDashboardData } from "@/lib/contracts/service";

function pulseToneClasses(tone: string) {
  if (tone.includes("emerald") || tone.includes("green")) {
    return "border-[color:var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]";
  }

  if (tone.includes("amber") || tone.includes("yellow")) {
    return "border-[color:var(--warning)]/20 bg-[var(--warning-soft)] text-[var(--warning)]";
  }

  if (tone.includes("rose") || tone.includes("red")) {
    return "border-[color:var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]";
  }

  return "border-[color:var(--primary)]/20 bg-[var(--primary-soft)] text-[var(--primary)]";
}

function statIcon(index: number) {
  if (index === 0) return <FolderKanban className="h-4 w-4" />;
  if (index === 1) return <Activity className="h-4 w-4" />;
  if (index === 2) return <Clock3 className="h-4 w-4" />;
  return <ArrowRight className="h-4 w-4" />;
}

export default async function DashboardPage() {
  const context = await getContractAccessContext();

  if (!context) {
    redirect("/signin?callbackUrl=/dashboard");
  }

  const data = await getDashboardData(context.organizationId);
  const featuredPipeline = data.pipeline[0] ?? null;

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[38px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(140deg,var(--surface)_0%,var(--surface-soft)_52%,rgba(67,97,238,0.08)_100%)] shadow-[0_22px_52px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(67,97,238,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_26%)]" />

        <div className="relative grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.35fr)_300px] xl:items-start">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(67,97,238,0.18)] bg-[var(--surface)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--primary)] shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
              <Radar className="h-4 w-4" />
              Mission Control
            </div>

            <div className="space-y-2.5">
              <h1 className="max-w-3xl text-[2rem] font-semibold tracking-tight text-[var(--foreground)] sm:text-[2.7rem] sm:leading-[0.98]">
                A sharper command view for contracts, approvals, and team momentum.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Scan what is moving, what is stuck, and what deserves attention next across your workspace.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {data.pulseCards.map((item) => (
                <article
                  key={item.label}
                  className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] px-3.5 py-3.5 shadow-[0_12px_24px_rgba(15,23,42,0.04)]"
                >
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${pulseToneClasses(item.tone)}`}
                  >
                    {item.label}
                  </span>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                    {item.value}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white p-4 text-[var(--foreground)] shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  Workspace Signal
                </p>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight">
                  {context.organizationName}
                </h2>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
            <div className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] p-3">
              <div className="flex items-center gap-2 text-[var(--muted)]">
                <Orbit className="h-3.5 w-3.5" />
                <p className="text-[10px] uppercase tracking-[0.2em]">Lead Contract</p>
              </div>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                {featuredPipeline?.contract ?? "No active contracts yet"}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                {featuredPipeline
                  ? `${featuredPipeline.stage} handled by ${featuredPipeline.owner}`
                  : "Once contracts are created, the highest-priority lane will surface here automatically."}
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Next ETA</p>
                <p className="mt-1.5 text-lg font-semibold text-[var(--foreground)]">
                  {featuredPipeline?.eta ?? "Waiting for work"}
                </p>
              </div>
              <div className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Focus Queue</p>
                <p className="mt-1.5 text-lg font-semibold text-[var(--foreground)]">{data.focus.length}</p>
              </div>
            </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        {data.stats.slice(0, 2).map((item, index) => (
          <article
            key={item.label}
            className="group relative overflow-hidden rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] p-4 shadow-[0_12px_24px_rgba(15,23,42,0.05)]"
          >
            <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-[28px] bg-[radial-gradient(circle_at_top_right,rgba(67,97,238,0.16),transparent_62%)]" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
                {statIcon(index)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  {item.label}
                </p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <p className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                    {item.value}
                  </p>
                  <p className="text-right text-sm leading-6 text-[var(--muted)]">
                    {item.note}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.24fr_0.76fr]">
        <div className="rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                Active Flow
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                Priority pipeline
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[var(--muted)]">
              Contracts moving through the current approval and execution sequence.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {data.pipeline.length ? (
              data.pipeline.slice(0, 4).map((item, index) => (
                <article
                  key={item.id}
                  className="grid gap-4 rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] p-4 shadow-[0_12px_26px_rgba(15,23,42,0.04)] md:grid-cols-[auto_minmax(0,1fr)_140px]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-sm font-semibold text-[var(--primary)]">
                    {index + 1}
                  </div>

                  <div className="min-w-0 space-y-3">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold leading-7 text-[var(--foreground)] break-words">
                        {item.contract}
                      </h3>
                      <span className="inline-flex rounded-full border border-[color:var(--primary)]/18 bg-[var(--primary-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
                        {item.stage}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                      <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                        Owner
                      </span>
                      <span>{item.owner}</span>
                    </div>
                  </div>

                  <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] px-4 py-3 md:ml-auto">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                      ETA
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-[var(--primary)]">
                      {item.eta}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] px-5 py-10 text-sm text-[var(--muted)]">
                No contracts have been created yet.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                  Recent Activity
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                  Team updates
                </h3>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {data.activity.length ? (
                data.activity.map((item, index) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] px-4 py-4"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[11px] font-semibold text-[var(--primary)]">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-7 text-[var(--muted)]">{item}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] px-4 py-4 text-sm leading-7 text-[var(--muted)]">
                  No recent approval activity yet.
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,rgba(67,97,238,0.08)_0%,var(--surface)_52%,var(--surface-soft)_100%)] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface)] text-[var(--primary)] shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                  Focus
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                  Today&apos;s action list
                </h3>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {data.focus.length ? (
                data.focus.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] px-4 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-sm font-semibold text-[var(--primary)]">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-7 text-[var(--muted)]">{item}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] px-4 py-4 text-sm leading-7 text-[var(--muted)]">
                  Create workflows and contracts to see focused action items here.
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
