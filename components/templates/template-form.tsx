"use client";

import { LoaderCircle, Save, Sparkles, WandSparkles } from "lucide-react";

import { TemplateEditor } from "@/components/templates/template-editor";
import type { ContractGenerationType } from "@/lib/contracts/types";
import type { TemplatePermissions } from "@/lib/templates/types";

export type TemplateFormState = {
  id?: string;
  name: string;
  type: ContractGenerationType;
  workflowId: string;
  contentHtml: string;
};

export function TemplateForm({
  form,
  error,
  isPending,
  aiPrompt,
  aiSummary,
  aiSuggestions,
  aiPendingMode,
  permissions,
  workflows,
  onAiPromptChange,
  onGenerateAI,
  onSuggestAI,
  onMergeAI,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: TemplateFormState;
  error: string;
  isPending: boolean;
  aiPrompt: string;
  aiSummary: string;
  aiSuggestions: string[];
  aiPendingMode: "generate" | "suggest" | "merge" | null;
  permissions: TemplatePermissions;
  workflows: { id: string; name: string }[];
  onAiPromptChange: (value: string) => void;
  onGenerateAI: () => void;
  onSuggestAI: () => void;
  onMergeAI: () => void;
  onChange: (nextForm: TemplateFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const canModify = form.id ? permissions.canEdit : permissions.canCreate;
  const isGeneratingAI = aiPendingMode === "generate";
  const isSuggestingAI = aiPendingMode === "suggest";
  const isMergingAI = aiPendingMode === "merge";
  const isAiBusy = aiPendingMode !== null;

  return (
    <section id="template-studio" className="rounded-[34px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] p-6 shadow-[0_22px_52px_rgba(15,23,42,0.05)] sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Template Studio
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">
            {form.id ? "Edit template" : "Create template"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Build reusable contract starting points with structured content, placeholders,
            and an optional default workflow.
          </p>
        </div>

        <div className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Mode</p>
          <p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">
            {form.id ? "Updating existing template" : "Creating new template"}
          </p>
        </div>
      </div>

      {!canModify ? (
        <p className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
          You can view and use templates here, but only admins can create, edit, or delete them.
        </p>
      ) : null}

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
          Template name
          <input
            id="template-name"
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            placeholder="Mutual NDA - Standard"
            disabled={!canModify}
            className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm outline-none"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
          Contract type
          <select
            value={form.type}
            onChange={(event) =>
              onChange({
                ...form,
                type: event.target.value as ContractGenerationType,
              })
            }
            disabled={!canModify}
            className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm outline-none"
          >
            <option value="NDA">NDA</option>
            <option value="VENDOR">Vendor</option>
            <option value="EMPLOYMENT">Employment</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-5">
        <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
          Default workflow
          <select
            value={form.workflowId}
            onChange={(event) => onChange({ ...form, workflowId: event.target.value })}
            disabled={!canModify}
            className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-sm outline-none"
          >
            <option value="">No default workflow</option>
            {workflows.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </option>
            ))}
          </select>
        </label>

        <div className="overflow-hidden rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,var(--surface-soft)_0%,var(--surface)_45%,var(--surface-soft)_100%)] shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <div className="border-b border-[rgba(15,23,42,0.08)] px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-[20px] bg-[var(--primary-soft)] p-3 text-[var(--primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                  <WandSparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                    AI Template Draft
                  </p>
                  <p className="mt-1.5 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                    Describe the reusable agreement you want, generate a first-pass draft,
                    then review or merge AI suggestions back into the editor.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[390px] lg:max-w-[450px]">
                <div className="rounded-[20px] border border-[rgba(67,97,238,0.12)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--primary-soft)_100%)] px-3.5 py-3 shadow-[0_10px_24px_rgba(67,97,238,0.08)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                    Drafting
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">
                    Prompt-driven
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Turn a short brief into a reusable draft.
                  </p>
                </div>
                <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] px-3.5 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    Review
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">
                    Editor-aware
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Suggest improvements from current content.
                  </p>
                </div>
                <div className="rounded-[20px] border border-[rgba(67,97,238,0.12)] bg-[linear-gradient(180deg,var(--surface-soft)_0%,var(--primary-soft)_100%)] px-3.5 py-3 shadow-[0_10px_24px_rgba(67,97,238,0.06)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                    Merge
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">
                    In-place updates
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Apply suggestions into the right sections.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-4">
              <textarea
                value={aiPrompt}
                onChange={(event) => onAiPromptChange(event.target.value)}
                rows={5}
                disabled={!canModify || isAiBusy}
                placeholder="Example: Draft a vendor services agreement template with confidentiality, payment terms placeholder, termination clauses, governing law, and a clean signature section."
                className="w-full resize-none rounded-[18px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] px-4 py-4 text-sm leading-7 outline-none"
              />
            </div>

            <div className="mt-4">
              <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] px-4 py-3">
                <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                    Studio note
                  </p>
                  <p className="text-sm leading-6 text-[var(--muted)] lg:max-w-[900px]">
                    {aiSummary ||
                      "Use Generate for a fresh draft, Suggest to review what is already written, and Merge to apply the new recommendations automatically."}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={onSuggestAI}
                  disabled={!canModify || isAiBusy || !form.contentHtml.trim()}
                  className="inline-flex min-h-[58px] items-center justify-center gap-2 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--foreground)] shadow-sm hover:bg-[var(--surface-soft)] disabled:opacity-60"
                >
                  {isSuggestingAI ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Suggest improvements
                </button>

                {aiSuggestions.length ? (
                  <button
                    type="button"
                    onClick={onMergeAI}
                    disabled={!canModify || isAiBusy || !form.contentHtml.trim()}
                    className="inline-flex min-h-[58px] items-center justify-center gap-2 rounded-[20px] border border-[rgba(67,97,238,0.18)] bg-[linear-gradient(180deg,var(--primary-soft)_0%,rgba(67,97,238,0.08)_100%)] px-5 py-3 text-sm font-semibold text-[var(--primary)] shadow-sm hover:opacity-95 disabled:opacity-60"
                  >
                    {isMergingAI ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <WandSparkles className="h-4 w-4" />
                    )}
                    Merge into draft
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={onGenerateAI}
                  disabled={!canModify || isAiBusy || !aiPrompt.trim()}
                  className="inline-flex min-h-[58px] items-center justify-center gap-2 rounded-[20px] bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(15,23,42,0.16)] hover:bg-[var(--primary-strong)] disabled:opacity-60"
                >
                  {isGeneratingAI ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <WandSparkles className="h-4 w-4" />
                  )}
                  Generate template
                </button>
              </div>
            </div>

            {aiSuggestions.length ? (
              <div className="mt-5 rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                      AI Suggestions
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Review the recommended improvements below, then merge them back into the draft when ready.
                    </p>
                  </div>
                  <div className="rounded-full border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                    {aiSuggestions.length} suggestion{aiSuggestions.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {aiSuggestions.map((suggestion, index) => (
                    <div
                      key={`${suggestion}-${index}`}
                      className="grid grid-cols-[30px_minmax(0,1fr)] items-start gap-3 rounded-[18px] border border-[rgba(15,23,42,0.07)] bg-[var(--surface)] px-3 py-3"
                    >
                      <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--primary-soft)] text-xs font-semibold text-[var(--primary)]">
                        {index + 1}
                      </div>
                      <p className="pt-1 text-sm leading-6 text-[var(--muted)]">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,var(--surface-soft)_0%,var(--surface)_100%)] p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[var(--primary-soft)] p-3 text-[var(--primary)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Template content
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Use the same formatting controls as the contract editor. Insert placeholders
                like <code>{"{{partyA}}"}</code> or <code>{"{{paymentTerms}}"}</code> where
                the final contract should fill values in.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <TemplateEditor
              value={form.contentHtml}
              onChange={(nextValue) => onChange({ ...form, contentHtml: nextValue })}
              disabled={!canModify}
            />
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-6 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "var(--danger-border)", backgroundColor: "var(--danger-soft)", color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}

      <div className={`mt-7 flex flex-wrap gap-3 ${form.id ? "" : "justify-center"}`}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending || !canModify || !form.name.trim() || !form.contentHtml.trim()}
          className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-[22px] bg-[var(--primary)] px-6 py-3.5 text-sm font-semibold text-white shadow hover:bg-[var(--primary-strong)] disabled:opacity-60"
        >
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {form.id ? "Save template" : "Create template"}
        </button>

        {form.id ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-6 py-3.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
          >
            Cancel edit
          </button>
        ) : null}
      </div>
    </section>
  );
}
