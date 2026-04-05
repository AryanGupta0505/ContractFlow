"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FilePenLine,
  LoaderCircle,
  RefreshCcw,
  ScrollText,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ContractEditor, htmlToPlainText, textToHtml } from "@/components/contracts/contract-editor";
import { createContract, generateContractWithAI } from "@/lib/contracts/api";
import {
  contractGenerationTypes,
  type ContractGenerationType,
  type ContractPermissions,
} from "@/lib/contracts/types";

type AIContractFormProps = {
  workflows: { id: string; name: string }[];
  permissions: ContractPermissions;
  variant?: "standalone" | "embedded";
};

type FormState = {
  title: string;
  type: ContractGenerationType;
  partyA: string;
  partyB: string;
  description: string;
  duration: string;
  paymentTerms: string;
  additionalClauses: string;
  workflowId: string;
};

const initialForm: FormState = {
  title: "",
  type: "NDA",
  partyA: "",
  partyB: "",
  description: "",
  duration: "",
  paymentTerms: "",
  additionalClauses: "",
  workflowId: "",
};

function prettifyType(value: ContractGenerationType) {
  return value === "NDA" ? "NDA" : value.charAt(0) + value.slice(1).toLowerCase();
}

function buildMetadata(form: FormState) {
  return [
    `contract-type:${form.type.toLowerCase()}`,
    form.type.toLowerCase(),
    form.duration.trim() ? `duration:${form.duration.trim()}` : "",
    form.paymentTerms.trim() ? "payment-terms" : "",
    "ai-generated",
  ].filter(Boolean);
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

export function AIContractForm({
  workflows,
  permissions,
  variant = "standalone",
}: AIContractFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [editorHtml, setEditorHtml] = useState("");
  const [plainText, setPlainText] = useState("");
  const [summary, setSummary] = useState("");
  const [promptPreview, setPromptPreview] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const isStandalone = variant === "standalone";
  const suggestedWorkflow = useMemo(
    () => suggestWorkflowForType(form.type, workflows),
    [form.type, workflows],
  );

  async function handleGenerate(mode: "generate" | "improve") {
    setIsGenerating(true);
    setError("");

    try {
      const response = await generateContractWithAI({
        title: form.title,
        type: form.type,
        partyA: form.partyA,
        partyB: form.partyB,
        description: form.description,
        duration: form.duration,
        paymentTerms: form.paymentTerms,
        additionalClauses: form.additionalClauses,
        currentDraft: mode === "improve" ? plainText : "",
        mode,
      });

      setEditorHtml(response.html);
      setPlainText(response.content);
      setSummary(response.summary);
      setPromptPreview(response.promptPreview);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Unable to generate contract.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setError("");
    const effectiveWorkflowId =
      permissions.canAssignWorkflow && !form.workflowId ? suggestedWorkflow?.id || "" : form.workflowId;

    try {
      const normalizedPlainText = htmlToPlainText(editorHtml);
      const contract = await createContract({
        title: form.title,
        content: normalizedPlainText,
        contentJson: {
          format: "html",
          html: editorHtml,
          text: normalizedPlainText,
        },
        summary,
        workflowId: permissions.canAssignWorkflow ? effectiveWorkflowId : "",
        parties: [form.partyA, form.partyB].filter(Boolean),
        metadata: buildMetadata(form),
        aiPrompt: promptPreview,
        aiResponse: normalizedPlainText,
      });

      router.push(`/contracts/${contract.id}`);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save contract.",
      );
    } finally {
      setIsSaving(false);
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

      {isStandalone ? (
        <section className="rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,#fffdf8_0%,#f8fbff_48%,#f3f7ff_100%)] p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                AI Contract Studio
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
                Generate a polished first draft, then refine it before saving.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
                Fill in the business details on the left, generate a formal contract draft, and edit the result on the right before saving it as a draft.
              </p>
            </div>

            <div className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-sm text-[var(--muted)]">
              Employee can draft. Managers and admins can add workflows later.
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-8 2xl:grid-cols-[0.94fr_1.06fr]">
        <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8 lg:p-9">
          <div className="rounded-[24px] border border-[var(--border)] bg-[linear-gradient(135deg,#fffefb_0%,#f7faff_100%)] px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--muted)]">
              AI Contract Studio
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              AI can draft a full legal-style contract from your business inputs, then you can refine the result in the editor before saving it as a draft.
            </p>
          </div>

          <div className="mb-8 mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-[var(--border)] bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[var(--primary-soft)] p-3 text-[var(--primary)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                    AI Inputs
                  </p>
                  <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                    Business details in, formal draft out
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                The generator uses your parties, duration, purpose, payment terms, and custom clauses to draft a structured legal-style agreement.
              </p>
            </div>

            <div className="rounded-[24px] border border-[var(--border)] bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[#f7f1ff] p-3 text-[#7755d8]">
                  <ScrollText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                    Final Review
                  </p>
                  <p className="mt-1 text-base font-semibold text-[var(--foreground)]">
                    Edit before saving
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                Regenerate for a new draft, improve an existing one, then adjust the language manually in the editor before saving.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-[var(--primary-soft)] p-3 text-[var(--primary)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                Contract Details
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                Structured prompt inputs
              </h2>
            </div>
          </div>

          <div className="mt-8 grid gap-6">
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
              Contract title
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Mutual Non-Disclosure Agreement"
                className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-sm outline-none"
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
                className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-sm outline-none"
              >
                {contractGenerationTypes.map((type) => (
                  <option key={type} value={type}>
                    {prettifyType(type)}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                Party A
                <input
                  value={form.partyA}
                  onChange={(event) => setForm((current) => ({ ...current, partyA: event.target.value }))}
                  placeholder="Acme Legal Ops Pvt Ltd"
                  className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-sm outline-none"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                Party B
                <input
                  value={form.partyB}
                  onChange={(event) => setForm((current) => ({ ...current, partyB: event.target.value }))}
                  placeholder="John Doe Consulting"
                  className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-sm outline-none"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
              Description / purpose
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={5}
                placeholder="Describe the business intent, expected obligations, and legal context."
                className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-sm outline-none"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                Duration
                <input
                  value={form.duration}
                  onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))}
                  placeholder="12 months from effective date"
                  className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-sm outline-none"
                />
              </label>

              {permissions.canAssignWorkflow ? (
                <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
                  Workflow
                  <select
                    value={form.workflowId}
                    onChange={(event) => setForm((current) => ({ ...current, workflowId: event.target.value }))}
                    className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-sm outline-none"
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
                      className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-left text-xs text-[var(--muted)] transition hover:bg-[#eef3ff]"
                    >
                      Suggested for {form.type}:{" "}
                      <span className="font-semibold text-[var(--foreground)]">
                        {suggestedWorkflow.name}
                      </span>
                    </button>
                  ) : null}
                </label>
              ) : null}
            </div>

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
              Payment terms
              <textarea
                value={form.paymentTerms}
                onChange={(event) => setForm((current) => ({ ...current, paymentTerms: event.target.value }))}
                rows={3}
                placeholder="Optional. Example: Net 30 days from invoice date."
                className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-sm outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
              Additional clauses
              <textarea
                value={form.additionalClauses}
                onChange={(event) => setForm((current) => ({ ...current, additionalClauses: event.target.value }))}
                rows={4}
                placeholder="Optional. Add governing law, indemnity, IP ownership, dispute resolution, or custom business clauses."
                className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-sm outline-none"
              />
            </label>

            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => handleGenerate("generate")}
                disabled={isGenerating || isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-medium text-white shadow-[0_18px_40px_rgba(80,104,255,0.24)] hover:bg-[var(--primary-strong)] disabled:opacity-70"
              >
                {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                {editorHtml ? "Regenerate Contract" : "Generate Contract with AI"}
              </button>

              <button
                type="button"
                onClick={() => handleGenerate("improve")}
                disabled={isGenerating || isSaving || !editorHtml}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)] disabled:opacity-60"
              >
                <RefreshCcw className="h-4 w-4" />
                Improve Contract
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-[30px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8 lg:p-9">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                  AI Draft
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  Preview and edit
                </h2>
              </div>
              <div className="rounded-full bg-[var(--surface-soft)] px-4 py-2 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Rich text editor
              </div>
            </div>

            <div className="mt-6">
              <ContractEditor
                value={editorHtml || textToHtml("Generate a contract draft to start editing here.")}
                onChange={(nextValue) => {
                  setEditorHtml(nextValue);
                  setPlainText(htmlToPlainText(nextValue));
                }}
                disabled={isGenerating || isSaving}
              />
            </div>
          </section>

          <section className="rounded-[30px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8 lg:p-9">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
                  Draft Summary
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                  {summary || "AI-generated executive summary will appear here after generation."}
                </p>
              </div>
              {promptPreview ? (
                <div className="rounded-full bg-[var(--surface-soft)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                  Prompt prepared
                </div>
              ) : null}
            </div>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isGenerating || !editorHtml}
                className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-[24px] bg-[linear-gradient(135deg,var(--primary)_0%,#6f86ff_100%)] px-7 py-4 text-sm font-semibold text-white shadow-[0_22px_44px_rgba(80,104,255,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_26px_52px_rgba(80,104,255,0.34)] disabled:translate-y-0 disabled:opacity-70"
              >
                {isSaving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <FilePenLine className="h-4 w-4" />
                )}
                Save Contract
              </button>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
