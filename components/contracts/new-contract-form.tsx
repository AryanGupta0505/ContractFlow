"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileEdit,
  Lightbulb,
  Merge,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ContractEditor, htmlToPlainText, textToHtml } from "@/components/contracts/contract-editor";
import {
  createContract,
  getManualContractSuggestions,
  mergeManualContractSuggestions,
} from "@/lib/contracts/api";
import { applyTemplatePlaceholders } from "@/lib/templates/placeholders";
import type {
  ContractGenerationType,
  ContractPermissions,
  ContractTemplatePrefill,
} from "@/lib/contracts/types";

type NewContractFormProps = {
  workflows: { id: string; name: string }[];
  availableTemplates?: { id: string; name: string; type: string }[];
  initialTemplate?: ContractTemplatePrefill | null;
  permissions: ContractPermissions;
  variant?: "standalone" | "embedded";
};

type FormState = {
  title: string;
  summary: string;
  content: string;
  parties: string;
  metadata: string;
  workflowId: string;
  fileUrl: string;
  type: ContractGenerationType;
};

type TemplateFieldState = {
  partyA: string;
  partyB: string;
  duration: string;
  paymentTerms: string;
};

const initialState: FormState = {
  title: "",
  summary: "",
  content: "",
  parties: "",
  metadata: "",
  workflowId: "",
  fileUrl: "",
  type: "CUSTOM",
};

function parseCommaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildMetadata(value: string, type: ContractGenerationType) {
  const items = parseCommaList(value).filter(
    (item) => !item.toLowerCase().startsWith("contract-type:"),
  );

  if (type !== "CUSTOM") {
    items.unshift(`contract-type:${type.toLowerCase()}`);
  }

  return Array.from(new Set(items));
}

function suggestWorkflowForType(
  type: ContractGenerationType,
  workflows: { id: string; name: string }[],
) {
  const keyword =
    type === "NDA"
      ? "nda"
      : type === "VENDOR"
        ? "vendor"
        : type === "EMPLOYMENT"
          ? "employment"
          : "";

  if (!keyword) {
    return null;
  }

  return (
    workflows.find((workflow) => workflow.name.toLowerCase().includes(keyword)) || null
  );
}

export function NewContractForm({
  workflows,
  availableTemplates = [],
  initialTemplate = null,
  permissions,
  variant = "standalone",
}: NewContractFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => ({
    ...initialState,
    title: initialTemplate?.name || "",
    workflowId: initialTemplate?.workflowId || "",
    type: initialTemplate?.type || "CUSTOM",
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isMergingSuggestions, setIsMergingSuggestions] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [templateFields, setTemplateFields] = useState<TemplateFieldState>({
    partyA: "",
    partyB: "",
    duration: "",
    paymentTerms: "",
  });
  const [templateBaseHtml, setTemplateBaseHtml] = useState(initialTemplate?.contentHtml || "");
  const [lastAppliedTemplateHtml, setLastAppliedTemplateHtml] = useState("");
  const isStandalone = variant === "standalone";
  const suggestedWorkflow = useMemo(
    () => suggestWorkflowForType(form.type, workflows),
    [form.type, workflows],
  );

  useEffect(() => {
    setTemplateBaseHtml(initialTemplate?.contentHtml || "");
    setTemplateFields({
      partyA: "",
      partyB: "",
      duration: "",
      paymentTerms: "",
    });
    setLastAppliedTemplateHtml("");
    setForm((current) => ({
      ...current,
      title: initialTemplate?.name || current.title,
      workflowId: initialTemplate?.workflowId || current.workflowId,
      type: initialTemplate?.type || current.type,
      content: initialTemplate?.contentHtml || current.content,
    }));
  }, [initialTemplate]);

  useEffect(() => {
    if (!templateBaseHtml) {
      return;
    }

    const nextContent = applyTemplatePlaceholders(templateBaseHtml, templateFields);

    setForm((current) => {
      const shouldReplace = !current.content || current.content === lastAppliedTemplateHtml;

      if (!shouldReplace) {
        return current;
      }

      return {
        ...current,
        content: nextContent,
      };
    });

    setLastAppliedTemplateHtml(nextContent);
  }, [templateBaseHtml, templateFields, lastAppliedTemplateHtml]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    const effectiveWorkflowId =
      permissions.canAssignWorkflow && !form.workflowId ? suggestedWorkflow?.id || "" : form.workflowId;

    const placeholderParties = [templateFields.partyA, templateFields.partyB].filter(Boolean);
    const effectiveParties = Array.from(
      new Set([...placeholderParties, ...parseCommaList(form.parties)]),
    );

    try {
      const contract = await createContract({
        title: form.title,
        summary: form.summary,
        content: htmlToPlainText(form.content),
        contentJson: {
          format: "html",
          html: form.content,
          text: htmlToPlainText(form.content),
        },
        workflowId: permissions.canAssignWorkflow ? effectiveWorkflowId : "",
        templateId: initialTemplate?.id || "",
        fileUrl: form.fileUrl,
        parties: effectiveParties,
        metadata: [
          ...buildMetadata(form.metadata, form.type),
          templateFields.duration.trim() ? `duration:${templateFields.duration.trim()}` : "",
          templateFields.paymentTerms.trim() ? "payment-terms" : "",
          initialTemplate ? `template:${initialTemplate.name}` : "",
        ].filter(Boolean),
      });
      router.push(`/contracts/${contract.id}`);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create contract.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSuggestions() {
    setIsSuggesting(true);
    setError("");

    try {
      const parties = parseCommaList(form.parties);
      const response = await getManualContractSuggestions({
        title: form.title,
        type: form.type,
        partyA: parties[0] || "Party A",
        partyB: parties[1] || "Party B",
        description: form.summary || "Manual contract drafting support.",
        duration: "As described in the draft",
        paymentTerms: "",
        additionalClauses: form.metadata,
        currentDraft: htmlToPlainText(form.content),
        mode: "suggest",
      });

      setSuggestions(response.content);
    } catch (suggestionError) {
      setError(
        suggestionError instanceof Error
          ? suggestionError.message
          : "Unable to fetch AI suggestions.",
      );
    } finally {
      setIsSuggesting(false);
    }
  }

  async function handleMergeSuggestions() {
    if (!suggestions.trim()) {
      setError("Generate AI suggestions before merging them into the draft.");
      return;
    }

    setIsMergingSuggestions(true);
    setError("");

    try {
      const parties = parseCommaList(form.parties);
      const response = await mergeManualContractSuggestions({
        title: form.title,
        type: form.type,
        partyA: parties[0] || "Party A",
        partyB: parties[1] || "Party B",
        description: form.summary || "Manual contract drafting support.",
        duration: "As described in the draft",
        paymentTerms: "",
        additionalClauses: form.metadata,
        currentDraft: htmlToPlainText(form.content),
        mergeInstructions: suggestions,
        mode: "merge",
      });

      setForm((current) => ({ ...current, content: response.html }));
      setSuggestions("");
    } catch (mergeError) {
      setError(
        mergeError instanceof Error
          ? mergeError.message
          : "Unable to merge AI suggestions into the draft.",
      );
    } finally {
      setIsMergingSuggestions(false);
    }
  }

  return (
    <div className="space-y-6">
      {isStandalone ? (
        <button
          type="button"
          onClick={() => router.push("/contracts")}
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contracts
        </button>
      ) : null}

      <section
        className={
          isStandalone
            ? "rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,#fffef9_0%,#fbfcff_54%,#f5f9ff_100%)] p-6 shadow-sm sm:p-8"
            : ""
        }
      >
        {isStandalone ? (
          <>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
              Manual Drafting
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
              Write directly, with AI suggestions when you need them.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              Draft the contract yourself, shape the language in the editor, and use AI suggestions to strengthen clauses without switching into full AI generation.
            </p>
          </>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className={`${isStandalone ? "mt-10 " : "mt-2 "}grid gap-8 2xl:grid-cols-[0.78fr_1.22fr]`}
        >
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] border border-[var(--border)] bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[var(--primary-soft)] p-3 text-[var(--primary)]">
                    <FileEdit className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                      Drafting Style
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                      Formal document editor
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                  Write the agreement in the editor on the right. Titles, clauses, and lists are preserved when you save.
                </p>
              </div>

              <div className="rounded-[24px] border border-[var(--border)] bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-[#eef9f1] p-3 text-[#1f8a52]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                      AI Review Rail
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                      Suggestions without overwrite
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                  Ask AI for missing sections, stronger clauses, and risk notes while keeping your manual draft intact.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {availableTemplates.length ? (
                <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)] md:col-span-2">
                  Start from template
                  <select
                    value={initialTemplate?.id || ""}
                    onChange={(event) =>
                      router.push(
                        event.target.value
                          ? `/contracts/new?templateId=${event.target.value}`
                          : "/contracts/new",
                      )
                    }
                    className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 text-sm outline-none"
                  >
                    <option value="">No template</option>
                    {availableTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                Contract title
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Enterprise MSA 2026"
                  className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 text-sm outline-none"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                Contract type
                <select
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as ContractGenerationType,
                    }))
                  }
                  className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 text-sm outline-none"
                >
                  <option value="CUSTOM">Custom</option>
                  <option value="NDA">NDA</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="EMPLOYMENT">Employment</option>
                </select>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                Parties
                <input
                  value={form.parties}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, parties: event.target.value }))
                  }
                  placeholder="Acme Inc, ContractFlow"
                  className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 text-sm outline-none"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                Workflow
                {permissions.canAssignWorkflow ? (
                  <>
                    <select
                      value={form.workflowId}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, workflowId: event.target.value }))
                      }
                      className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 text-sm outline-none"
                    >
                      <option value="">No workflow</option>
                      {workflows.map((workflow) => (
                        <option key={workflow.id} value={workflow.id}>
                          {workflow.name}
                        </option>
                      ))}
                    </select>
                    {suggestedWorkflow ? (
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            workflowId: suggestedWorkflow.id,
                          }))
                        }
                        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-left text-xs text-[var(--muted)] transition hover:bg-[#eef3ff]"
                      >
                        Suggested for {form.type}:{" "}
                        <span className="font-semibold text-[var(--foreground)]">
                          {suggestedWorkflow.name}
                        </span>
                      </button>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-sm text-[var(--muted)]">
                    Workflow assignment is available for managers and admins.
                  </div>
                )}
              </label>
            </div>

            {initialTemplate ? (
              <div className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,#fffefb_0%,#f7faff_100%)] p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[var(--primary-soft)] p-3 text-[var(--primary)]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                      Template Inputs
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                      Replace placeholders inside <span className="font-semibold text-[var(--foreground)]">{initialTemplate.name}</span>.
                      The editor content updates automatically until you make direct edits.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                    Party A
                    <input
                      value={templateFields.partyA}
                      onChange={(event) =>
                        setTemplateFields((current) => ({ ...current, partyA: event.target.value }))
                      }
                      placeholder="Acme Inc"
                      className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 text-sm outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                    Party B
                    <input
                      value={templateFields.partyB}
                      onChange={(event) =>
                        setTemplateFields((current) => ({ ...current, partyB: event.target.value }))
                      }
                      placeholder="ContractFlow"
                      className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 text-sm outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                    Duration
                    <input
                      value={templateFields.duration}
                      onChange={(event) =>
                        setTemplateFields((current) => ({ ...current, duration: event.target.value }))
                      }
                      placeholder="12 months from effective date"
                      className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 text-sm outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                    Payment terms
                    <input
                      value={templateFields.paymentTerms}
                      onChange={(event) =>
                        setTemplateFields((current) => ({ ...current, paymentTerms: event.target.value }))
                      }
                      placeholder="Net 30 days"
                      className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 text-sm outline-none"
                    />
                  </label>
                </div>
              </div>
            ) : null}

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
              Executive summary
              <textarea
                value={form.summary}
                onChange={(event) =>
                  setForm((current) => ({ ...current, summary: event.target.value }))
                }
                rows={4}
                placeholder="Short summary of the agreement, obligations, and business context"
                className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 text-sm outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
              Metadata tags
              <input
                value={form.metadata}
                onChange={(event) =>
                  setForm((current) => ({ ...current, metadata: event.target.value }))
                }
                placeholder="msa, enterprise, renewal"
                className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 text-sm outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
              Source file URL
              <input
                value={form.fileUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fileUrl: event.target.value }))
                }
                placeholder="https://example.com/contracts/enterprise-msa.pdf"
                className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 text-sm outline-none"
              />
            </label>

            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <div className="rounded-[24px] border border-[var(--border)] bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[var(--primary-soft)] p-3 text-[var(--primary)]">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted)]">
                    AI Suggestions
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Get clause ideas, risks, and improvements while writing manually.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={handleSuggestions}
                  disabled={isSuggesting || isSubmitting || isMergingSuggestions}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[#eef3ff] disabled:opacity-60"
                >
                  {isSuggesting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Get AI Suggestions
                </button>

                <button
                  type="button"
                  onClick={handleMergeSuggestions}
                  disabled={
                    isSuggesting ||
                    isSubmitting ||
                    isMergingSuggestions ||
                    !suggestions.trim()
                  }
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)] disabled:opacity-60"
                >
                  {isMergingSuggestions ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Merge className="h-4 w-4" />
                  )}
                  Merge Suggestions Into Draft
                </button>
              </div>

              <div className="mt-5 rounded-[22px] border border-[var(--border)] bg-[linear-gradient(180deg,#fffefb_0%,#f8fbff_100%)] p-5 text-sm leading-7 text-[var(--muted)]">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                  Review Notes
                </p>
                <div className="mt-3 whitespace-pre-wrap">
                  {suggestions ||
                    "Suggestions will appear here after you ask AI to review the current draft."}
                </div>
              </div>
            </div>

          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-[var(--border)] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted)]">
                    Contract body
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    Draft directly in the editor. The saved contract preserves formatted HTML and plain text.
                  </p>
                </div>
                <div className="rounded-full bg-[var(--surface-soft)] px-4 py-2 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                  Legal document view
                </div>
              </div>
            </div>

              <ContractEditor
                value={form.content || textToHtml("1. Introduction\n\nStart drafting the formal agreement here.")}
                onChange={(nextValue) =>
                  setForm((current) => ({ ...current, content: nextValue }))
                }
              disabled={isSubmitting || isSuggesting || isMergingSuggestions}
            />

            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-[24px] bg-[linear-gradient(135deg,var(--primary)_0%,#6f86ff_100%)] px-7 py-4 text-sm font-semibold text-white shadow-[0_22px_44px_rgba(80,104,255,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_26px_52px_rgba(80,104,255,0.34)] disabled:translate-y-0 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                Create contract
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
