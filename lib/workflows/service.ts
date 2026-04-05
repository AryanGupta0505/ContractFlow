import prisma from "@/lib/prisma";
import {
  hasWorkflowStepConditionColumn,
  listWorkflowStepsByWorkflowIds,
} from "@/lib/workflows/db-compat";

import type { ApprovalStatus, ContractStatus, Prisma } from "@prisma/client";

import type { ContractRole } from "@/lib/contracts/types";
import type {
  WorkflowAnalytics,
  WorkflowPayload,
  WorkflowPermissions,
  WorkflowRecord,
  WorkflowTemplate,
  WorkflowUsageContract,
  WorkflowsResponse,
} from "@/lib/workflows/types";

const workflowInclude = {
  contracts: {
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      approvals: {
        select: {
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      versions: {
        select: {
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      signatures: {
        select: {
          signedAt: true,
        },
        orderBy: { signedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  },
} satisfies Prisma.WorkflowInclude;

type WorkflowWithRelations = Prisma.WorkflowGetPayload<{
  include: typeof workflowInclude;
}>;

type WorkflowWithStepRelations = WorkflowWithRelations & {
  steps: Array<{
    id: string;
    workflowId: string;
    order: number;
    role: string;
    condition: string | null;
  }>;
};

type NormalizedWorkflowStep = {
  id?: string;
  order: number;
  role: ContractRole;
  condition: string;
};

function getWorkflowPermissions(role: ContractRole): WorkflowPermissions {
  return {
    canCreate: role === "ADMIN",
    canEdit: role === "ADMIN",
    canDelete: role === "ADMIN",
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function isCompletedStatus(status: ContractStatus) {
  return status === "APPROVED" || status === "SIGNED" || status === "ARCHIVED";
}

function getLatestWorkflowActivity(workflow: WorkflowWithStepRelations) {
  const candidates = workflow.contracts.flatMap((contract) => {
    const latestApproval = contract.approvals[0]?.createdAt ?? null;
    const latestVersion = contract.versions[0]?.createdAt ?? null;
    const latestSignature = contract.signatures[0]?.signedAt ?? null;

    return [contract.createdAt, latestApproval, latestVersion, latestSignature].filter(
      Boolean,
    ) as Date[];
  });

  if (!candidates.length) {
    return null;
  }

  return candidates.reduce((latest, current) =>
    current.getTime() > latest.getTime() ? current : latest,
  );
}

function getWorkflowAnalytics(workflow: WorkflowWithStepRelations): WorkflowAnalytics {
  const totalContracts = workflow.contracts.length;
  const activeApprovals = workflow.contracts.reduce((sum, contract) => {
    return (
      sum +
      contract.approvals.filter((approval) => approval.status === "PENDING").length
    );
  }, 0);
  const completedContracts = workflow.contracts.filter((contract) =>
    isCompletedStatus(contract.status),
  ).length;

  return {
    totalContracts,
    activeApprovals,
    completionRate: totalContracts
      ? Math.round((completedContracts / totalContracts) * 100)
      : 0,
  };
}

function getApprovalProgressLabel(
  approvalStatuses: Array<{ status: ApprovalStatus }>,
  totalSteps: number,
) {
  if (!totalSteps) {
    return "No steps";
  }

  const approvedCount = approvalStatuses.filter(
    (approval) => approval.status === "APPROVED",
  ).length;

  return `${Math.min(approvedCount, totalSteps)}/${totalSteps} approved`;
}

function getUsageContracts(workflow: WorkflowWithStepRelations): WorkflowUsageContract[] {
  return workflow.contracts.slice(0, 5).map((contract) => ({
    id: contract.id,
    title: contract.title,
    status: contract.status,
    createdAt: contract.createdAt.toISOString(),
    approvalProgressLabel: getApprovalProgressLabel(
      contract.approvals,
      workflow.steps.length,
    ),
  }));
}

function toWorkflowRecord(workflow: WorkflowWithStepRelations): WorkflowRecord {
  const analytics = getWorkflowAnalytics(workflow);
  const lastUsedAt = getLatestWorkflowActivity(workflow);

  return {
    id: workflow.id,
    name: workflow.name,
    contractCount: workflow.contracts.length,
    createdAtLabel: lastUsedAt ? formatDate(lastUsedAt) : "Recently created",
    lastUsedAt: lastUsedAt?.toISOString() ?? null,
    lastUsedAtLabel: lastUsedAt ? formatDateTime(lastUsedAt) : "Not used yet",
    stepsPreview: workflow.steps.map((step) => step.role).join(" -> "),
    steps: workflow.steps.map((step) => ({
      id: step.id,
      order: step.order,
      role: step.role as ContractRole,
      condition: step.condition ?? "",
    })),
    analytics,
    usageContracts: getUsageContracts(workflow),
  };
}

function getWorkflowTemplates(): WorkflowTemplate[] {
  return [
    {
      type: "VENDOR",
      label: "Vendor workflow",
      description:
        "Good for procurement and commercial review where finance and admin need final visibility.",
      workflowName: "Vendor Approval Flow",
      steps: [
        { role: "MANAGER", condition: "vendor onboarding required" },
        { role: "EMPLOYEE", condition: "collect scope and pricing details" },
        { role: "ADMIN", condition: "if amount > 10000" },
      ],
    },
    {
      type: "NDA",
      label: "NDA workflow",
      description:
        "Lean review path for confidentiality documents with a quick managerial check and final admin review.",
      workflowName: "NDA Review Flow",
      steps: [
        { role: "MANAGER", condition: "if mutual NDA requested" },
        { role: "ADMIN", condition: "for final legal sign-off" },
      ],
    },
    {
      type: "EMPLOYMENT",
      label: "Employment workflow",
      description:
        "Best for offers and employment documents that need manager, people-ops, and admin coordination.",
      workflowName: "Employment Approval Flow",
      steps: [
        { role: "MANAGER", condition: "if compensation package is finalized" },
        { role: "EMPLOYEE", condition: "prepare onboarding obligations" },
        { role: "ADMIN", condition: "final compliance review" },
      ],
    },
  ];
}

function normalizeWorkflowPayload(payload: WorkflowPayload) {
  const name = payload.name.trim();
  const steps = payload.steps.map((step, index) => ({
    id: step.id,
    order: index + 1,
    role: step.role,
    condition: step.condition?.trim() || "",
  }));

  if (!name) {
    throw new Error("Workflow name is required.");
  }

  if (!steps.length) {
    throw new Error("Workflow must have at least one step.");
  }

  for (const [index, step] of steps.entries()) {
    if (!step.role) {
      throw new Error(`Step ${index + 1} must include a role.`);
    }

    if (step.order !== index + 1) {
      throw new Error("Workflow steps must remain sequential.");
    }
  }

  return { name, steps };
}

async function listWorkflowRows(organizationId: string) {
  const workflows = await prisma.workflow.findMany({
    where: { organizationId },
    include: workflowInclude,
    orderBy: [{ name: "asc" }],
  });

  const stepsByWorkflowId = await listWorkflowStepsByWorkflowIds(
    workflows.map((workflow) => workflow.id),
  );

  return workflows.map((workflow) => ({
    ...workflow,
    steps: stepsByWorkflowId.get(workflow.id) ?? [],
  }));
}

async function getWorkflowById(organizationId: string, workflowId: string) {
  const workflow = await prisma.workflow.findFirst({
    where: {
      id: workflowId,
      organizationId,
    },
    include: workflowInclude,
  });

  if (!workflow) {
    return null;
  }

  const stepsByWorkflowId = await listWorkflowStepsByWorkflowIds([workflow.id]);

  return {
    ...workflow,
    steps: stepsByWorkflowId.get(workflow.id) ?? [],
  };
}

async function buildStepCreateInput(steps: NormalizedWorkflowStep[]) {
  const hasCondition = await hasWorkflowStepConditionColumn();

  return steps.map((step) => ({
    order: step.order,
    role: step.role,
    ...(hasCondition ? { condition: step.condition || null } : {}),
  }));
}

async function createWorkflowAuditLog(input: {
  organizationId: string;
  actorId?: string;
  action: string;
  workflowId: string;
}) {
  if (!input.actorId) {
    return;
  }

  await prisma.auditLog.create({
    data: {
      organizationId: input.organizationId,
      userId: input.actorId,
      action: input.action,
      entityType: "WORKFLOW",
      entityId: input.workflowId,
    },
  });
}

export async function listWorkflows(
  organizationId: string,
  role: ContractRole,
): Promise<WorkflowsResponse> {
  const workflows = await listWorkflowRows(organizationId);
  const items = workflows.map(toWorkflowRecord);
  const totalSteps = items.reduce((sum, workflow) => sum + workflow.steps.length, 0);
  const totalCompletionRate = items.reduce(
    (sum, workflow) => sum + workflow.analytics.completionRate,
    0,
  );

  return {
    items,
    permissions: getWorkflowPermissions(role),
    stats: {
      totalWorkflows: items.length,
      activeContracts: items.reduce(
        (sum, workflow) => sum + workflow.analytics.totalContracts,
        0,
      ),
      activeApprovals: items.reduce(
        (sum, workflow) => sum + workflow.analytics.activeApprovals,
        0,
      ),
      averageSteps: items.length ? Number((totalSteps / items.length).toFixed(1)) : 0,
      averageCompletionRate: items.length
        ? Math.round(totalCompletionRate / items.length)
        : 0,
    },
    templates: getWorkflowTemplates(),
  };
}

export async function createWorkflow(input: {
  organizationId: string;
  actorId?: string;
  payload: WorkflowPayload;
}) {
  const normalized = normalizeWorkflowPayload(input.payload);
  const stepCreateInput = await buildStepCreateInput(normalized.steps);

  const workflow = await prisma.workflow.create({
    data: {
      organizationId: input.organizationId,
      name: normalized.name,
      steps: {
        create: stepCreateInput,
      },
    },
  });

  const hydratedWorkflow = await getWorkflowById(input.organizationId, workflow.id);

  if (!hydratedWorkflow) {
    throw new Error("Workflow was created but could not be loaded.");
  }

  await createWorkflowAuditLog({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: "workflow.created",
    workflowId: workflow.id,
  });

  return toWorkflowRecord(hydratedWorkflow);
}

export async function updateWorkflow(input: {
  organizationId: string;
  workflowId: string;
  actorId?: string;
  payload: WorkflowPayload;
}) {
  const normalized = normalizeWorkflowPayload(input.payload);
  const existing = await getWorkflowById(input.organizationId, input.workflowId);

  if (!existing) {
    throw new Error("Workflow not found.");
  }

  const stepCreateInput = await buildStepCreateInput(normalized.steps);

  await prisma.$transaction(async (tx) => {
    await tx.workflowStep.deleteMany({
      where: {
        workflowId: input.workflowId,
        workflow: {
          organizationId: input.organizationId,
        },
      },
    });

    return tx.workflow.update({
      where: { id: input.workflowId },
      data: {
        name: normalized.name,
        steps: {
          create: stepCreateInput,
        },
      },
    });
  });

  const workflow = await getWorkflowById(input.organizationId, input.workflowId);

  if (!workflow) {
    throw new Error("Workflow was updated but could not be loaded.");
  }

  await createWorkflowAuditLog({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: "workflow.updated",
    workflowId: workflow.id,
  });

  return toWorkflowRecord(workflow);
}

export async function deleteWorkflow(input: {
  organizationId: string;
  workflowId: string;
  actorId?: string;
}) {
  const workflow = await getWorkflowById(input.organizationId, input.workflowId);

  if (!workflow) {
    throw new Error("Workflow not found.");
  }

  const unlinkedContracts = workflow.contracts.length;

  await prisma.$transaction(async (tx) => {
    await tx.contract.updateMany({
      where: {
        organizationId: input.organizationId,
        workflowId: input.workflowId,
      },
      data: {
        workflowId: null,
      },
    });

    await tx.workflowStep.deleteMany({
      where: {
        workflowId: input.workflowId,
        workflow: {
          organizationId: input.organizationId,
        },
      },
    });

    await tx.workflow.delete({
      where: { id: input.workflowId },
    });
  });

  await createWorkflowAuditLog({
    organizationId: input.organizationId,
    actorId: input.actorId,
    action: "workflow.deleted",
    workflowId: input.workflowId,
  });

  return { success: true as const, unlinkedContracts };
}
