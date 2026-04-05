"use client";

import { FileStack, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { htmlToPlainText } from "@/components/contracts/contract-editor";
import { useToast } from "@/components/providers/toast-provider";
import { TemplateForm, type TemplateFormState } from "@/components/templates/template-form";
import { TemplateList } from "@/components/templates/template-list";
import {
  createTemplate,
  deleteTemplate,
  generateTemplateWithAI,
  updateTemplate,
} from "@/lib/templates/api";
import type {
  TemplateAIResponse,
  TemplatePayload,
  TemplateRecord,
  TemplatesResponse,
} from "@/lib/templates/types";

const initialForm: TemplateFormState = {
  name: "",
  type: "NDA",
  workflowId: "",
  contentHtml: "<h1>Agreement</h1><p>This agreement is entered into by {{partyA}} and {{partyB}}.</p><p>Term: {{duration}}</p><p>Payment terms: {{paymentTerms}}</p>",
};

function toPayload(form: TemplateFormState): TemplatePayload {
  return {
    name: form.name,
    type: form.type,
    workflowId: form.workflowId,
    contentJson: {
      format: "html",
      html: form.contentHtml,
      text: "",
    },
  };
}

function toFormState(template: TemplateRecord): TemplateFormState {
  return {
    id: template.id,
    name: template.name,
    type: template.type,
    workflowId: template.workflowId || "",
    contentHtml: template.contentHtml,
  };
}

export function TemplatesPageClient({
  workflows,
  initialData,
}: {
  workflows: { id: string; name: string }[];
  initialData: TemplatesResponse;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [form, setForm] = useState<TemplateFormState>(initialForm);
  const [error, setError] = useState("");
  const [deletingTemplate, setDeletingTemplate] = useState<TemplateRecord | null>(null);
  const [templates, setTemplates] = useState<TemplateRecord[]>(initialData.items);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiPendingMode, setAiPendingMode] = useState<"generate" | "suggest" | "merge" | null>(null);
  const permissions = initialData.permissions;
  const stats = useMemo(
    () => ({
      totalTemplates: templates.length,
      totalUsage: templates.reduce((sum, template) => sum + template.usageCount, 0),
    }),
    [templates],
  );

  async function handleSubmit() {
    setIsSubmitting(true);
    setError("");

    try {
      const payload = toPayload(form);
      if (form.id) {
        const updated = await updateTemplate(form.id, payload);
        setTemplates((current) =>
          current.map((template) => (template.id === updated.id ? updated : template)),
        );
        pushToast({
          tone: "success",
          title: "Template updated",
          description: `${updated.name} has been saved.`,
        });
      } else {
        const created = await createTemplate(payload);
        setTemplates((current) => [created, ...current]);
        pushToast({
          tone: "success",
          title: "Template created",
          description: `${created.name} is ready to use for new contracts.`,
        });
      }

      setForm(initialForm);
    } catch (mutationError) {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : form.id
            ? "Unable to update template."
            : "Unable to create template.";
      setError(message);
      pushToast({
        tone: "error",
        title: form.id ? "Update failed" : "Create failed",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingTemplate) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteTemplate(deletingTemplate.id);
      setTemplates((current) =>
        current.filter((template) => template.id !== deletingTemplate.id),
      );
      pushToast({
        tone: "success",
        title: "Template deleted",
        description: `${deletingTemplate.name} has been removed.`,
      });
      setDeletingTemplate(null);
    } catch (mutationError) {
      const message =
        mutationError instanceof Error ? mutationError.message : "Unable to delete template.";
      pushToast({ tone: "error", title: "Delete failed", description: message });
    } finally {
      setIsDeleting(false);
    }
  }

  function focusTemplateStudio() {
    document.getElementById("template-studio")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.setTimeout(() => {
      const input = document.getElementById("template-name") as HTMLInputElement | null;
      input?.focus();
    }, 250);
  }

  async function handleGenerateAI() {
    setAiPendingMode("generate");
    setError("");

    try {
      const result: TemplateAIResponse = await generateTemplateWithAI({
        mode: "generate",
        prompt: aiPrompt,
        type: form.type,
        currentName: form.name,
      });

      setForm((current) => ({
        ...current,
        name: current.name.trim() ? current.name : (result.name ?? current.name),
        contentHtml: result.contentHtml ?? current.contentHtml,
      }));
      setAiPrompt("");
      setAiSummary(result.summary);
      setAiSuggestions(result.suggestions);
      pushToast({
        tone: "success",
        title: "AI template drafted",
        description: "Review the generated template and save it when it looks right.",
      });
      focusTemplateStudio();
    } catch (generationError) {
      const message =
        generationError instanceof Error
          ? generationError.message
          : "Unable to generate template.";
      setError(message);
      pushToast({ tone: "error", title: "AI generation failed", description: message });
    } finally {
      setAiPendingMode(null);
    }
  }

  async function handleSuggestAI() {
    setAiPendingMode("suggest");
    setError("");

    try {
      const result: TemplateAIResponse = await generateTemplateWithAI({
        mode: "suggest",
        prompt: aiPrompt,
        type: form.type,
        currentName: form.name,
        currentContent: htmlToPlainText(form.contentHtml),
      });

      setAiSummary(result.summary);
      setAiSuggestions(result.suggestions);
      pushToast({
        tone: "success",
        title: "AI suggestions ready",
        description: "Review the recommendations or merge them directly into the draft.",
      });
      focusTemplateStudio();
    } catch (generationError) {
      const message =
        generationError instanceof Error
          ? generationError.message
          : "Unable to suggest improvements for this template.";
      setError(message);
      pushToast({ tone: "error", title: "AI suggestion failed", description: message });
    } finally {
      setAiPendingMode(null);
    }
  }

  async function handleMergeAI() {
    setAiPendingMode("merge");
    setError("");

    try {
      const result: TemplateAIResponse = await generateTemplateWithAI({
        mode: "merge",
        prompt: aiPrompt,
        type: form.type,
        currentName: form.name,
        currentContent: htmlToPlainText(form.contentHtml),
        mergeInstructions: aiSuggestions.join("\n"),
      });

      setForm((current) => ({
        ...current,
        name: current.name.trim() ? current.name : (result.name ?? current.name),
        contentHtml: result.contentHtml ?? current.contentHtml,
      }));
      setAiSummary(result.summary);
      setAiSuggestions([]);
      pushToast({
        tone: "success",
        title: "Suggestions merged",
        description: "AI applied the suggested improvements into the current draft.",
      });
      focusTemplateStudio();
    } catch (generationError) {
      const message =
        generationError instanceof Error
          ? generationError.message
          : "Unable to merge suggestions into this template.";
      setError(message);
      pushToast({ tone: "error", title: "AI merge failed", description: message });
    } finally {
      setAiPendingMode(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1520px] space-y-8 px-1 pb-8">
      <section className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(140deg,var(--surface-soft)_0%,var(--surface)_52%,var(--surface-soft)_100%)] shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
        <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.35fr)_290px] xl:items-start">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_250px] xl:items-start">
            <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--muted)] sm:text-sm">
              Templates
            </p>
            <h1 className="max-w-[640px] text-[2.15rem] font-bold tracking-tight text-[var(--foreground)] sm:text-[2.65rem] sm:leading-[0.98]">
              Reusable contract templates with workflow-aware defaults
            </h1>
            <p className="max-w-[620px] text-sm leading-6 text-[var(--muted)]">
              Save structured legal drafts, reuse them across the organization, and
              launch new contracts with placeholders and default workflows already lined up.
            </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] px-3.5 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Reusable
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                  Structured drafts
                </p>
              </div>
              <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] px-3.5 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Linked
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                  Workflow defaults
                </p>
              </div>
              <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] px-3.5 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Launch
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                  Start from template
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  Library
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                  Template command space
                </p>
              </div>
              <div className="rounded-[18px] bg-[var(--primary-soft)] p-2.5 text-[var(--primary)]">
                <FileStack className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3.5 grid gap-2">
              <div className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-3.5 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  Total templates
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                  {stats.totalTemplates}
                </p>
              </div>
              <div className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-3.5 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  Total usage
                </p>
                <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                  {stats.totalUsage} contract{stats.totalUsage === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {permissions.canCreate ? (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setForm(initialForm);
                  setAiPrompt("");
                  setAiSummary("");
                  setAiSuggestions([]);
                  focusTemplateStudio();
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] hover:bg-[var(--primary-strong)]"
              >
                <Plus className="h-4 w-4" />
                New Template
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-8 2xl:grid-cols-[minmax(520px,0.9fr)_minmax(0,1.1fr)]">
        <section id="template-builder" className="scroll-mt-6">
          <TemplateForm
            form={form}
            error={error}
            isPending={isSubmitting}
            aiPrompt={aiPrompt}
            aiSummary={aiSummary}
            aiSuggestions={aiSuggestions}
            aiPendingMode={aiPendingMode}
            permissions={permissions}
            workflows={workflows}
            onAiPromptChange={setAiPrompt}
            onGenerateAI={handleGenerateAI}
            onSuggestAI={handleSuggestAI}
            onMergeAI={handleMergeAI}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={() => {
              setError("");
              setForm(initialForm);
              setAiPrompt("");
              setAiSummary("");
              setAiSuggestions([]);
            }}
          />
        </section>

        <section className="space-y-5">
          <div className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Template Library
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              Review your organization’s saved templates, jump into edit mode, or
              launch a new contract straight from a reusable draft.
            </p>
          </div>

          <TemplateList
            templates={templates}
            permissions={permissions}
            isLoading={false}
            deletingId={isDeleting ? deletingTemplate?.id ?? null : null}
            onUse={(template) => router.push(`/contracts/new?templateId=${template.id}`)}
            onEdit={(template) => {
              setError("");
              setForm(toFormState(template));
              setAiSummary("");
              setAiSuggestions([]);
              focusTemplateStudio();
            }}
            onDelete={(template) => setDeletingTemplate(template)}
          />
        </section>
      </div>

      {deletingTemplate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.34)] px-4">
          <div className="w-full max-w-md rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl p-3" style={{ backgroundColor: "var(--danger-soft)", color: "var(--danger)" }}>
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[var(--foreground)]">Delete template</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Remove <span className="font-semibold text-[var(--foreground)]">{deletingTemplate.name}</span>.
                  Templates already used by contracts cannot be deleted.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Confirm delete"}
              </button>
              <button
                type="button"
                onClick={() => setDeletingTemplate(null)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
