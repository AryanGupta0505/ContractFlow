"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Sparkles, Waypoints } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import {
  createWorkflow,
  deleteWorkflow,
  generateWorkflowWithAI,
  getWorkflows,
  updateWorkflow,
} from "@/lib/workflows/api";
import type {
  WorkflowAIResponse,
  WorkflowPayload,
  WorkflowRecord,
  WorkflowTemplate,
  WorkflowTemplateType,
} from "@/lib/workflows/types";

import { WorkflowDetail } from "./workflow-detail";
import { WorkflowForm, type WorkflowFormState } from "./workflow-form";
import { WorkflowList } from "./workflow-list";

const initialForm: WorkflowFormState = {
  name: "",
  steps: [{ role: "MANAGER", condition: "" }],
};

function StatsCard({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: string | number;
  tone: string;
  note: string;
}) {
  return (
    <article className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] p-4 shadow-[0_14px_32px_rgba(15,23,42,0.05)] sm:p-5">
      <span
        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tone}`}
      >
        {label}
      </span>
      <p className="mt-4 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-[2rem]">
        {value}
      </p>
      <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">{note}</p>
    </article>
  );
}

function toPayload(form: WorkflowFormState): WorkflowPayload {
  return {
    name: form.name,
    steps: form.steps.map((step) => ({
      id: step.id,
      role: step.role,
      condition: step.condition,
    })),
  };
}

function applyTemplateToForm(template: WorkflowTemplate): WorkflowFormState {
  return {
    name: template.workflowName,
    steps: template.steps.map((step) => ({
      role: step.role,
      condition: step.condition || "",
    })),
  };
}

function inferWorkflowType(value: string): WorkflowTemplateType | "CUSTOM" {
  const normalized = value.toLowerCase();

  if (/nda|non-disclosure|confidential|confidentiality/.test(normalized)) {
    return "NDA";
  }

  if (/vendor|procurement|supplier|purchase|services/.test(normalized)) {
    return "VENDOR";
  }

  if (/employment|offer|hiring|onboarding|people ops|hr|employee/.test(normalized)) {
    return "EMPLOYMENT";
  }

  return "CUSTOM";
}

function applyAIResultToForm(
  result: WorkflowAIResponse,
  currentForm: WorkflowFormState,
): WorkflowFormState {
  return {
    id: currentForm.id,
    name: result.workflow.name,
    steps: result.workflow.steps.map((step, index) => ({
      id: currentForm.steps[index]?.id,
      role: step.role,
      condition: step.condition || "",
    })),
  };
}

export function WorkflowsPageClient() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [form, setForm] = useState<WorkflowFormState>(initialForm);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState<WorkflowAIResponse | null>(null);
  const [aiPendingMode, setAiPendingMode] = useState<"generate" | "suggest" | null>(null);
  const [error, setError] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [showDetail, setShowDetail] = useState(true);

  const query = useQuery({
    queryKey: ["workflows"],
    queryFn: getWorkflows,
  });

  const workflows = query.data?.items ?? [];
  const permissions = query.data?.permissions;
  const templates = query.data?.templates ?? [];
  const effectiveSelectedWorkflowId =
    selectedWorkflowId && workflows.some((workflow) => workflow.id === selectedWorkflowId)
      ? selectedWorkflowId
      : (workflows[0]?.id ?? null);
  const selectedWorkflow =
    workflows.find((workflow) => workflow.id === effectiveSelectedWorkflowId) ?? null;

  const createMutation = useMutation({
    mutationFn: (payload: WorkflowPayload) => createWorkflow(payload),
    onSuccess: async (workflow) => {
      setForm(initialForm);
      setAiPrompt("");
      setAiResult(null);
      setError("");
      setSelectedWorkflowId(workflow.id);
      pushToast({
        tone: "success",
        title: "Workflow created",
        description: `${workflow.name} is ready to use on contracts.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error ? mutationError.message : "Unable to create workflow.";
      setError(message);
      pushToast({ tone: "error", title: "Create failed", description: message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WorkflowPayload }) =>
      updateWorkflow(id, payload),
    onSuccess: async (workflow) => {
      setForm(initialForm);
      setAiPrompt("");
      setAiResult(null);
      setError("");
      setSelectedWorkflowId(workflow.id);
      pushToast({
        tone: "success",
        title: "Workflow updated",
        description: `${workflow.name} has been saved with its new steps.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error ? mutationError.message : "Unable to update workflow.";
      setError(message);
      pushToast({ tone: "error", title: "Update failed", description: message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onMutate: (id) => {
      setDeletingIds((prev) => new Set([...prev, id]));
    },
    onSuccess: async (result, id) => {
      if (selectedWorkflowId === id) {
        setSelectedWorkflowId(null);
      }
      pushToast({
        tone: "success",
        title: "Workflow deleted",
        description: result.unlinkedContracts
          ? `The workflow was removed and ${result.unlinkedContracts} linked contract${
              result.unlinkedContracts === 1 ? " was" : "s were"
            } automatically unlinked.`
          : "The workflow has been removed from your organization.",
      });
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error ? mutationError.message : "Unable to delete workflow.";
      pushToast({ tone: "error", title: "Delete failed", description: message });
    },
    onSettled: (_, __, id) => {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  const workflowAIMutation = useMutation({
    mutationFn: ({
      mode,
      prompt,
    }: {
      mode: "generate" | "suggest";
      prompt: string;
    }) =>
      generateWorkflowWithAI({
        mode,
        prompt,
        currentWorkflow: toPayload(form),
        contractType: inferWorkflowType(`${form.name} ${prompt}`),
      }),
    onSuccess: (result, variables) => {
      setAiResult(result);
      pushToast({
        tone: "success",
        title: variables.mode === "generate" ? "AI workflow drafted" : "AI suggestions ready",
        description:
          variables.mode === "generate"
            ? "Review the proposed pipeline, then apply it to the builder when it looks right."
            : "A refined version of the current workflow is ready to review.",
      });
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to generate workflow suggestions.";
      pushToast({ tone: "error", title: "AI request failed", description: message });
    },
    onSettled: () => {
      setAiPendingMode(null);
    },
  });

  function startEdit(workflow: WorkflowRecord) {
    setError("");
    setSelectedWorkflowId(workflow.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setForm({
      id: workflow.id,
      name: workflow.name,
      steps: workflow.steps.map((step) => ({
        id: step.id,
        role: step.role,
        condition: step.condition || "",
      })),
    });
    setAiPrompt(`Improve the ${workflow.name} workflow with sharper routing and conditions.`);
    setAiResult(null);
  }

  function handleDelete(id: string) {
    if (form.id === id) {
      setForm(initialForm);
    }

    deleteMutation.mutate(id);
  }

  return (
    <div className="mx-auto max-w-[1520px] space-y-7 px-1 pb-8">
      <section className="overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,#fff7e9_0%,#f9fbff_38%,#edf4ff_100%)] shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
        <div className="space-y-3 p-4 sm:p-5 xl:p-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.95fr)] xl:items-center">
            <div className="max-w-[760px]">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--muted)] sm:text-sm">
                Workflows
              </p>
              <h1 className="mt-2.5 max-w-[760px] text-[1.9rem] font-bold tracking-tight text-[var(--foreground)] sm:text-[2.45rem] sm:leading-[0.95]">
                Approval systems with room to think, edit, and inspect
              </h1>
              <p className="mt-3 max-w-[720px] text-sm leading-6 text-[var(--muted)]">
                Create reusable approval paths, keep contract routing consistent, and
                inspect workflow health without digging through dense tables.
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  Focus
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">
                  Step-based approvals
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Clear ownership at every stage.
                </p>
              </div>
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  Routing
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">
                  Conditional paths ready
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Adapt approvals to contract details.
                </p>
              </div>
              <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  Insight
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">
                  Contract-linked analytics
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  Track usage and completion health.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
              <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[var(--primary-soft)] p-2.5 text-[var(--primary)]">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                      Studio
                    </p>
                    <p className="mt-1 text-base font-semibold text-[var(--foreground)] sm:text-lg">
                      Workflow command space
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Shape approval paths, launch a new build, and keep the current workflow context close by.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    Selected workflow
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">
                    {selectedWorkflow?.name || "Nothing selected yet"}
                  </p>
                </div>
                <div className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface)] px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    Builder mode
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">
                    {form.id ? "Editing existing workflow" : "Creating new workflow"}
                  </p>
                </div>
                </div>

                <div className="flex justify-center pt-1.5 sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(initialForm);
                      setAiPrompt("");
                      setAiResult(null);
                      setError("");
                      window.scrollTo({
                        top: document.getElementById("workflow-builder")?.offsetTop || 0,
                        behavior: "smooth",
                      });
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition-transform hover:bg-[var(--primary-strong)] hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Waypoints className="h-4 w-4" />
                    New Workflow
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Total Workflows"
          value={query.data?.stats.totalWorkflows ?? "-"}
          tone="border border-[rgba(67,97,238,0.18)] bg-[var(--primary-soft)] text-[var(--primary)]"
          note="Reusable process definitions across the organization."
        />
        <StatsCard
          label="Contracts Linked"
          value={query.data?.stats.activeContracts ?? "-"}
          tone="border bg-[var(--warning-soft)] text-[var(--warning)]"
          note="Contracts currently attached to saved workflows."
        />
        <StatsCard
          label="Active Approvals"
          value={query.data?.stats.activeApprovals ?? "-"}
          tone="border bg-[var(--danger-soft)] text-[var(--danger)]"
          note="In-flight approvals waiting inside workflow steps."
        />
        <StatsCard
          label="Avg Completion"
          value={
            typeof query.data?.stats.averageCompletionRate === "number"
              ? `${query.data.stats.averageCompletionRate}%`
              : "-"
          }
          tone="border bg-[var(--success-soft)] text-[var(--success)]"
          note="Average completion rate across linked contracts."
        />
      </section>

      <div className="grid gap-8 2xl:grid-cols-[minmax(0,1.04fr)_minmax(500px,0.96fr)]">
        <section id="workflow-builder" className="scroll-mt-6">
          <WorkflowForm
            form={form}
            error={error}
            isPending={createMutation.isPending || updateMutation.isPending}
            aiPrompt={aiPrompt}
            aiResult={aiResult}
            aiPendingMode={aiPendingMode}
            permissions={permissions}
            templates={templates}
            onApplyTemplate={(template) => {
              setForm((current) => ({
                ...applyTemplateToForm(template),
                id: current.id,
              }));
              setAiResult(null);
              setAiPrompt(
                `Create a ${template.label.toLowerCase()} with practical role handoffs and future-ready conditions.`,
              );
              pushToast({
                tone: "info",
                title: `${template.label} loaded`,
                description:
                  "Template steps were added to the builder for customization.",
              });
            }}
            onApplyAI={(result) => {
              setForm((current) => applyAIResultToForm(result, current));
              setAiPrompt(
                `Refine ${result.workflow.name} for ${result.suggestedType.toLowerCase()} approvals.`,
              );
              setAiResult(null);
              pushToast({
                tone: "success",
                title: "AI draft applied",
                description: "The builder has been updated with the suggested workflow.",
              });
            }}
            onAiPromptChange={setAiPrompt}
            onGenerateAI={() => {
              setAiPendingMode("generate");
              workflowAIMutation.mutate({
                mode: "generate",
                prompt: aiPrompt,
              });
            }}
            onSuggestAI={() => {
              setAiPendingMode("suggest");
              workflowAIMutation.mutate({
                mode: "suggest",
                prompt: aiPrompt,
              });
            }}
            onChange={setForm}
            onSubmit={() =>
              form.id
                ? updateMutation.mutate({ id: form.id, payload: toPayload(form) })
                : createMutation.mutate(toPayload(form))
            }
            onCancel={() => {
              setError("");
              setForm(initialForm);
              setAiPrompt("");
              setAiResult(null);
            }}
          />
        </section>

        <section className="space-y-8">
          <WorkflowList
            workflows={workflows}
            isLoading={query.isLoading}
            permissions={permissions}
            selectedWorkflowId={effectiveSelectedWorkflowId ?? undefined}
            onSelect={(workflow) => setSelectedWorkflowId(workflow.id)}
            onEdit={startEdit}
            onDelete={handleDelete}
            deletingIds={deletingIds}
          />

          <section className="rounded-[34px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  Inspector
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Keep the inspector tucked away when you want to browse, then
                  expand it for deeper pipeline context.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDetail((current) => !current)}
                className="inline-flex items-center gap-2 self-start rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
              >
                {showDetail ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {showDetail ? "Hide details" : "Show details"}
              </button>
            </div>

            {showDetail ? (
              <div className="mt-6">
                <WorkflowDetail workflow={selectedWorkflow} />
              </div>
            ) : selectedWorkflow ? (
              <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5">
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {selectedWorkflow.name}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {selectedWorkflow.contractCount} linked contract
                  {selectedWorkflow.contractCount !== 1 ? "s" : ""} •{" "}
                  {selectedWorkflow.steps.length} step
                  {selectedWorkflow.steps.length !== 1 ? "s" : ""}
                </p>
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
                Select a workflow to inspect it when needed.
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}
