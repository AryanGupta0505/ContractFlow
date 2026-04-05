import { ArrowRight, LoaderCircle, Sparkles, Waypoints } from "lucide-react";

import type { WorkflowAIResponse, WorkflowTemplate } from "@/lib/workflows/types";
import { formatConditionForDisplay } from "@/lib/workflows/condition-display";

import { type StepDefinition, WorkflowStepsEditor } from "./workflow-steps-editor";

export type WorkflowFormState = {
  id?: string;
  name: string;
  steps: StepDefinition[];
};

export function WorkflowForm({
  form,
  error,
  isPending,
  aiPrompt,
  aiResult,
  aiPendingMode,
  permissions,
  templates,
  onApplyTemplate,
  onApplyAI,
  onAiPromptChange,
  onGenerateAI,
  onSuggestAI,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: WorkflowFormState;
  error: string;
  isPending: boolean;
  aiPrompt: string;
  aiResult: WorkflowAIResponse | null;
  aiPendingMode: "generate" | "suggest" | null;
  permissions?: { canCreate: boolean; canEdit: boolean };
  templates: WorkflowTemplate[];
  onApplyTemplate: (template: WorkflowTemplate) => void;
  onApplyAI: (result: WorkflowAIResponse) => void;
  onAiPromptChange: (prompt: string) => void;
  onGenerateAI: () => void;
  onSuggestAI: () => void;
  onChange: (form: WorkflowFormState) => void;
  onSubmit: () => void;
  onCancel?: () => void;
}) {
  const canModify = Boolean(form.id) ? permissions?.canEdit : permissions?.canCreate;
  const promptLength = aiPrompt.trim().length;

  return (
    <div className="space-y-8 rounded-[36px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-7 shadow-[0_22px_54px_rgba(15,23,42,0.05)] sm:p-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
            Builder
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {form.id ? "Edit workflow" : "Create workflow"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Build step-based approval pipelines with role ownership and optional
            conditions.
          </p>
        </div>
        <div className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-5 py-4 text-sm text-[var(--muted)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
            Editing state
          </p>
          <p className="mt-2 font-medium text-[var(--foreground)]">
            {form.id ? "Updating a live workflow" : "Starting a fresh approval path"}
          </p>
        </div>
      </div>

      {!canModify ? (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
          You can review workflow definitions here, but only admins can create,
          edit, or delete them.
        </p>
      ) : null}

      <section className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#fffefb_0%,#f7faff_100%)] p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--primary-soft)] p-3 text-[var(--primary)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Suggested Workflow Types
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Start from a vendor, NDA, or employment template and customize the
              approval path.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {templates.map((template) => (
            <button
              key={template.type}
              type="button"
              onClick={() => onApplyTemplate(template)}
              disabled={!canModify}
              className="rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary-soft)] hover:bg-[var(--surface-soft)] disabled:opacity-60"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                {template.label}
              </p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                {template.workflowName}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {template.description}
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                {template.steps.map((step) => step.role).join(" -> ")}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,#f6f9ff_0%,#ffffff_42%,#fff9ee_100%)]">
        <div className="border-b border-[rgba(15,23,42,0.08)] px-6 py-6 sm:px-7">
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="rounded-[22px] bg-[var(--primary-soft)] p-3 text-[var(--primary)] shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  AI Workflow Assistant
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  Draft workflows faster, then fold them into the builder
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                  Use AI for a first pass, ask for tighter sequencing, and apply only
                  the version you want to keep.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  Prompt
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                  {promptLength ? `${promptLength} chars` : "Waiting"}
                </p>
              </div>
              <div className="rounded-[20px] border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  Draft
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                  {aiResult ? `${aiResult.workflow.steps.length} steps` : "Empty"}
                </p>
              </div>
              <div className="rounded-[20px] border border-white/80 bg-white/85 px-4 py-3 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  Builder mode
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                  {form.id ? "Refining" : "Creating"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6 sm:p-7">
          <div className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white/90 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Prompt
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                  Describe the contract type, reviewers, thresholds, and any special
                  routing rules.
                </p>
              </div>
              <div className="self-start rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                AI-ready brief
              </div>
            </div>

            <textarea
              value={aiPrompt}
              onChange={(event) => onAiPromptChange(event.target.value)}
              placeholder="Example: Build an employment approval workflow for offers above 20k with hiring manager review, people ops checks, and final admin sign-off."
              disabled={!canModify || aiPendingMode !== null}
              rows={6}
              className="mt-5 min-h-[180px] w-full rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] px-5 py-4 text-sm leading-7 outline-none transition-colors placeholder:text-[var(--muted)] hover:border-[rgba(15,23,42,0.14)] focus:border-[var(--primary)]"
            />

            <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                AI can suggest naming, role order, and basic conditions
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onGenerateAI}
                  disabled={!canModify || !aiPrompt.trim() || aiPendingMode !== null}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-[var(--surface)] shadow hover:opacity-95 disabled:opacity-60"
                >
                  {aiPendingMode === "generate" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate workflow
                </button>
                <button
                  type="button"
                  onClick={onSuggestAI}
                  disabled={!canModify || !aiPrompt.trim() || aiPendingMode !== null}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)] disabled:opacity-60"
                >
                  {aiPendingMode === "suggest" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Suggest improvements
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white/92 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)] sm:p-6">
            {aiResult ? (
              <div>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      AI Draft
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                      {aiResult.workflow.name}
                    </h3>
                  </div>
                  <div className="self-start rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                    {aiResult.workflow.steps.length} steps
                  </div>
                </div>

                <p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--muted)]">
                  {aiResult.summary}
                </p>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {aiResult.workflow.steps.map((step, index) => (
                    <div
                      key={`${step.role}-${index}`}
                      className="rounded-[22px] border border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          Step {index + 1}
                        </p>
                        <span className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--foreground)]">
                          {step.role}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {formatConditionForDisplay(
                          step.condition,
                          "Runs whenever the workflow reaches this step.",
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                {aiResult.suggestions.length ? (
                  <div className="mt-5 rounded-[22px] border border-[var(--border)] bg-[linear-gradient(180deg,#fffefb_0%,#ffffff_100%)] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      Suggested improvements
                    </p>
                    <div className="mt-3 grid gap-2 lg:grid-cols-2">
                      {aiResult.suggestions.map((suggestion, index) => (
                        <p
                          key={`${suggestion}-${index}`}
                          className="text-sm leading-6 text-[var(--muted)]"
                        >
                          {suggestion}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => onApplyAI(aiResult)}
                  disabled={!canModify}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-white shadow hover:bg-[var(--primary-strong)] disabled:opacity-60"
                >
                  <Sparkles className="h-4 w-4" />
                  Apply to builder
                </button>
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] px-6 text-center">
                <div className="rounded-[22px] bg-[var(--primary-soft)] p-3 text-[var(--primary)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="mt-4 text-lg font-semibold text-[var(--foreground)]">
                  No AI draft yet
                </p>
                <p className="mt-2 max-w-sm text-sm leading-7 text-[var(--muted)]">
                  Generate a workflow or request improvements, and the draft will
                  appear here for review before it touches the builder.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="space-y-7">
        <section className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-white p-6">
          <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
            Workflow name
            <input
              value={form.name}
              onChange={(event) => onChange({ ...form, name: event.target.value })}
              placeholder="Vendor Approval Flow"
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] px-5 py-4 text-sm outline-none transition-colors hover:bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] focus:border-[var(--primary)] focus:bg-[var(--surface)]"
              disabled={!canModify}
            />
          </label>
        </section>

        <section className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-white p-6">
          <p className="mb-4 text-sm font-medium text-[var(--foreground)]">
            Pipeline steps
          </p>
          <WorkflowStepsEditor
            steps={form.steps}
            onChange={(steps) => onChange({ ...form, steps })}
            disabled={!canModify}
          />
        </section>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <div className={`flex flex-wrap gap-3 pt-2 ${form.id ? "" : "justify-center"}`}>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending || !canModify || !form.name.trim() || form.steps.length === 0}
            className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-6 py-3 text-sm font-medium text-white shadow hover:bg-[var(--primary-strong)] disabled:opacity-60"
          >
            {isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Waypoints className="h-4 w-4" />
            )}
            {form.id ? "Save workflow" : "Create workflow"}
          </button>

          {form.id && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-5 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-soft)]"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
