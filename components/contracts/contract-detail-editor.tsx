"use client";

import { useRouter } from "next/navigation";
import {
  FileEdit,
  Lightbulb,
  LoaderCircle,
  Merge,
  Save,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";

import {
  ContractEditor,
  htmlToPlainText,
  textToHtml,
} from "@/components/contracts/contract-editor";
import {
  getManualContractSuggestions,
  mergeManualContractSuggestions,
  updateContract,
} from "@/lib/contracts/api";
import { matchWorkflowByType } from "@/lib/contracts/workflow-matching";
import type {
  ContractGenerationType,
  ContractPermissions,
  ContractRecord,
} from "@/lib/contracts/types";

type ContractDetailEditorProps = {
  contract: ContractRecord;
  workflows: { id: string; name: string }[];
  permissions: ContractPermissions;
};

type FormState = {
  title: string;
  summary: string;
  contentHtml: string;
  parties: string;
  metadata: string;
  workflowId: string;
  fileUrl: string;
};

function inferContractType(contract: ContractRecord): ContractGenerationType {
  const signals = `${contract.title} ${contract.metadata.join(" ")} ${contract.content}`.toLowerCase();

  if (signals.includes("nda") || signals.includes("non-disclosure")) {
    return "NDA";
  }

  if (signals.includes("vendor") || signals.includes("service agreement")) {
    return "VENDOR";
  }

  if (signals.includes("employment") || signals.includes("employee")) {
    return "EMPLOYMENT";
  }

  return "CUSTOM";
}

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

export function ContractDetailEditor({
  contract,
  workflows,
  permissions,
}: ContractDetailEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    title: contract.title,
    summary: contract.summary || "",
    contentHtml: contract.contentHtml || textToHtml(contract.content),
    parties: contract.parties.join(", "),
    metadata: contract.metadata.join(", "),
    workflowId: contract.workflow?.id || "",
    fileUrl: contract.fileUrl || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isMergingSuggestions, setIsMergingSuggestions] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [generationType, setGenerationType] = useState<ContractGenerationType>(
    inferContractType(contract),
  );
  const suggestedWorkflow = matchWorkflowByType(generationType, workflows);

  async function handleSuggestions() {
    const plainTextDraft = htmlToPlainText(form.contentHtml);

    if (!plainTextDraft.trim()) {
      setError("Add some contract content before asking AI for suggestions.");
      return;
    }

    setIsSuggesting(true);
    setError("");

    try {
      const parties = parseCommaList(form.parties);
      const response = await getManualContractSuggestions({
        title: form.title,
        type: generationType,
        partyA: parties[0] || "Party A",
        partyB: parties[1] || "Party B",
        description: form.summary || "Manual contract drafting support.",
        duration: "As described in the draft",
        paymentTerms: "",
        additionalClauses: form.metadata,
        currentDraft: plainTextDraft,
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

    const plainTextDraft = htmlToPlainText(form.contentHtml);

    if (!plainTextDraft.trim()) {
      setError("Add some contract content before merging AI suggestions.");
      return;
    }

    setIsMergingSuggestions(true);
    setError("");

    try {
      const parties = parseCommaList(form.parties);
      const response = await mergeManualContractSuggestions({
        title: form.title,
        type: generationType,
        partyA: parties[0] || "Party A",
        partyB: parties[1] || "Party B",
        description: form.summary || "Manual contract drafting support.",
        duration: "As described in the draft",
        paymentTerms: "",
        additionalClauses: form.metadata,
        currentDraft: plainTextDraft,
        mergeInstructions: suggestions,
        mode: "merge",
      });

      setForm((current) => ({ ...current, contentHtml: response.html }));
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    const effectiveWorkflowId =
      permissions.canAssignWorkflow && !form.workflowId ? suggestedWorkflow?.id || "" : form.workflowId;

    try {
      await updateContract(contract.id, {
        title: form.title,
        summary: form.summary,
        content: htmlToPlainText(form.contentHtml),
        contentJson: {
          format: "html",
          html: form.contentHtml,
          text: htmlToPlainText(form.contentHtml),
        },
        workflowId: permissions.canAssignWorkflow ? effectiveWorkflowId : "",
        fileUrl: form.fileUrl,
        parties: parseCommaList(form.parties),
        metadata: buildMetadata(form.metadata, generationType),
      });

      router.push(`/contracts/${contract.id}`);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save changes.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 space-y-10">
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[28px] border border-[var(--border)] bg-white px-7 py-7 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--primary-soft)] p-3 text-[var(--primary)]">
              <FileEdit className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                Edit Contract
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                Update details in place
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-[34rem] text-sm leading-7 text-[var(--muted)]">
            Make changes here and save a new version without leaving the contract detail page.
          </p>
        </div>

        <div className="rounded-[28px] border border-[var(--border)] bg-white px-7 py-7 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[#eef9f1] p-3 text-[#1f8a52]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                Versioning
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--foreground)]">
                Safe contract update
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-[34rem] text-sm leading-7 text-[var(--muted)]">
            Saving your edits preserves the updated contract as a new version of the agreement.
          </p>
        </div>
      </div>

      <div className="rounded-[32px] border border-[var(--border)] bg-white px-8 py-8 shadow-[0_24px_54px_rgba(15,23,42,0.06)]">
        <div className="space-y-7">
          <div className="grid gap-6 md:grid-cols-2">
            <label className="flex flex-col gap-3 text-sm font-medium text-[var(--foreground)]">
              Contract title
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                className="rounded-[24px] border border-[var(--border)] bg-white px-5 py-4 text-sm outline-none transition focus:border-[var(--primary)]"
              />
            </label>

            <label className="flex flex-col gap-3 text-sm font-medium text-[var(--foreground)]">
              Workflow
              <select
                value={form.workflowId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, workflowId: event.target.value }))
                }
                disabled={!permissions.canAssignWorkflow}
                className="rounded-[24px] border border-[var(--border)] bg-white px-5 py-4 text-sm outline-none transition focus:border-[var(--primary)] disabled:opacity-60"
              >
                <option value="">No workflow</option>
                {workflows.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <label className="flex flex-col gap-3 text-sm font-medium text-[var(--foreground)]">
              Parties
              <input
                value={form.parties}
                onChange={(event) =>
                  setForm((current) => ({ ...current, parties: event.target.value }))
                }
                placeholder="Party A, Party B"
                className="rounded-[24px] border border-[var(--border)] bg-white px-5 py-4 text-sm outline-none transition focus:border-[var(--primary)]"
              />
            </label>

            <label className="flex flex-col gap-3 text-sm font-medium text-[var(--foreground)]">
              Metadata tags
              <input
                value={form.metadata}
                onChange={(event) =>
                  setForm((current) => ({ ...current, metadata: event.target.value }))
                }
                placeholder="vendor, ai-generated"
                className="rounded-[24px] border border-[var(--border)] bg-white px-5 py-4 text-sm outline-none transition focus:border-[var(--primary)]"
              />
            </label>
          </div>

          <label className="flex flex-col gap-3 text-sm font-medium text-[var(--foreground)]">
            Executive summary
            <textarea
              value={form.summary}
              onChange={(event) =>
                setForm((current) => ({ ...current, summary: event.target.value }))
              }
              rows={6}
              className="rounded-[24px] border border-[var(--border)] bg-white px-5 py-4 text-sm outline-none transition focus:border-[var(--primary)]"
            />
          </label>

          <label className="flex flex-col gap-3 text-sm font-medium text-[var(--foreground)]">
            File URL
            <input
              value={form.fileUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, fileUrl: event.target.value }))
              }
              className="rounded-[24px] border border-[var(--border)] bg-white px-5 py-4 text-sm outline-none transition focus:border-[var(--primary)]"
            />
          </label>

          {error ? (
            <p className="rounded-[22px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-[28px] border border-[var(--border)] bg-white px-7 py-7 shadow-[0_20px_46px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-[48rem]">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted)]">
                Contract body
              </p>
              <p className="mt-3 text-base font-medium text-[var(--foreground)]">
                Update the agreement in the same legal-document flow used during creation.
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Edit directly in the document editor below. Titles, clauses, numbering, and formatting stay intact when you save this revision.
              </p>
            </div>
            <div className="rounded-full bg-[var(--surface-soft)] px-5 py-2.5 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Legal document view
            </div>
          </div>
        </div>

        <div className="grid gap-6 2xl:grid-cols-[1.18fr_0.82fr]">
          <ContractEditor
            value={form.contentHtml}
            onChange={(nextValue) =>
              setForm((current) => ({ ...current, contentHtml: nextValue }))
            }
            disabled={isSaving || isSuggesting || isMergingSuggestions}
          />

          <div className="h-fit rounded-[28px] border border-[var(--border)] bg-white p-6 shadow-[0_20px_46px_rgba(15,23,42,0.05)]">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-[var(--primary-soft)] p-3 text-[var(--primary)]">
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted)]">
                  AI Suggestions
                </p>
                <p className="mt-1 text-sm leading-7 text-[var(--muted)]">
                  Review this saved draft, spot missing clauses, and merge improvements without leaving edit mode.
                </p>
              </div>
            </div>

            <label className="mt-6 flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
              Contract type for AI review
              <select
                value={generationType}
                onChange={(event) =>
                  setGenerationType(event.target.value as ContractGenerationType)
                }
                disabled={isSaving || isSuggesting || isMergingSuggestions}
                className="rounded-[22px] border border-[var(--border)] bg-white px-4 py-4 text-sm outline-none disabled:opacity-60"
              >
                <option value="CUSTOM">Custom</option>
                <option value="NDA">NDA</option>
                <option value="VENDOR">Vendor</option>
                <option value="EMPLOYMENT">Employment</option>
              </select>
            </label>

            <div className="mt-6 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={handleSuggestions}
                disabled={isSaving || isSuggesting || isMergingSuggestions}
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[#eef3ff] disabled:opacity-60"
              >
                {isSuggesting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Get AI Suggestions
              </button>

              <button
                type="button"
                onClick={handleMergeSuggestions}
                disabled={
                  isSaving ||
                  isSuggesting ||
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
                Merge Into Draft
              </button>
            </div>

            <div className="mt-5 rounded-[22px] border border-[var(--border)] bg-[linear-gradient(180deg,#fffefb_0%,#f8fbff_100%)] p-5 text-sm leading-7 text-[var(--muted)]">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Review Notes
              </p>
              <div className="mt-3 whitespace-pre-wrap">
                {suggestions ||
                  "Suggestions will appear here after AI reviews the current draft."}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 pt-3">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex min-w-[240px] items-center justify-center gap-2 rounded-[26px] bg-[linear-gradient(135deg,var(--primary)_0%,#6f86ff_100%)] px-8 py-4.5 text-sm font-semibold text-white shadow-[0_22px_44px_rgba(80,104,255,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_26px_52px_rgba(80,104,255,0.34)] disabled:translate-y-0 disabled:opacity-70"
        >
          {isSaving ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Changes
        </button>
        <button
          type="button"
          onClick={() => router.push(`/contracts/${contract.id}`)}
          className="inline-flex items-center gap-2 rounded-[22px] border border-[var(--border)] bg-white px-6 py-3.5 text-sm font-medium text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </form>
  );
}
