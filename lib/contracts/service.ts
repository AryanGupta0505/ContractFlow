import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import {
  inferContractTypeFromMetadata,
  inferContractTypeFromSignals,
  matchWorkflowByType,
} from "@/lib/contracts/workflow-matching";
import {
  notifyApprovalRequired,
  notifyContractApproved,
  notifyContractCreated,
  notifyContractRejected,
  notifySignatureRequired,
} from "@/lib/notifications/service";
import { listWorkflowStepsByWorkflowIds } from "@/lib/workflows/db-compat";

import type {
  BulkAction,
  ContractEditorContent,
  ContractFilters,
  ContractMutationAction,
  ContractRecord,
  ContractRole,
  ContractsResponse,
  CreateContractInput,
  UpdateContractInput,
  WorkflowSummary,
} from "@/lib/contracts/types";

type WorkflowStepSummary = {
  id: string;
  workflowId: string;
  order: number;
  role: string;
  condition: string | null;
};

type ContractWorkflowWithSteps = {
  id: string;
  name: string;
  steps: WorkflowStepSummary[];
};

type ContractWithRelations = Awaited<ReturnType<typeof fetchContractsForOrganization>>[number] & {
  workflow: ContractWorkflowWithSteps | null;
};

function getCurrentWorkflowStep(contract: ContractWithRelations) {
  if (!contract.workflow) {
    return null;
  }

  const pendingApproval = contract.approvals.find((approval) => approval.status === "PENDING");

  if (pendingApproval) {
    return (
      contract.workflow.steps.find((step) => step.id === pendingApproval.stepId) ?? null
    );
  }

  const approvedStepIds = new Set(
    contract.approvals
      .filter((approval) => approval.status === "APPROVED")
      .map((approval) => approval.stepId),
  );

  return (
    contract.workflow.steps.find((step) => !approvedStepIds.has(step.id)) ?? null
  );
}

function getCurrentApprovalSummary(contract: ContractWithRelations) {
  const currentStep = getCurrentWorkflowStep(contract);
  const currentApproval =
    currentStep
      ? contract.approvals.find((approval) => approval.stepId === currentStep.id) ?? null
      : null;

  return {
    currentStepId: currentStep?.id ?? null,
    currentStepOrder: currentStep?.order ?? null,
    currentStepRole: (currentStep?.role as ContractRole | undefined) ?? null,
    currentStepStatus: currentApproval?.status ?? null,
  } satisfies ContractRecord["approval"];
}

function canRoleApproveStep(actorRole: ContractRole, stepRole: ContractRole) {
  return actorRole === stepRole;
}

async function validateWorkflowAssignment(
  organizationId: string,
  workflowId?: string | null,
) {
  const normalizedWorkflowId = workflowId?.trim() || "";

  if (!normalizedWorkflowId) {
    return null;
  }

  const workflow = await prisma.workflow.findFirst({
    where: {
      id: normalizedWorkflowId,
      organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!workflow) {
    throw new Error("Selected workflow was not found for this organization.");
  }

  return workflow.id;
}

async function validateTemplateAssignment(
  organizationId: string,
  templateId?: string | null,
) {
  const normalizedTemplateId = templateId?.trim() || "";

  if (!normalizedTemplateId) {
    return null;
  }

  const template = await prisma.template.findFirst({
    where: {
      id: normalizedTemplateId,
      organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!template) {
    throw new Error("Selected template was not found for this organization.");
  }

  return template.id;
}

function inferContractTypeFromRecord(contract: ContractWithRelations) {
  const latestVersion = contract.versions[0] || null;
  const normalizedContent = normalizeContentJson(latestVersion?.contentJson ?? null);
  const metadataType = inferContractTypeFromMetadata(normalizedContent.metadata);

  if (metadataType) {
    return metadataType;
  }

  const signals = [
    contract.title,
    normalizedContent.content,
    ...normalizedContent.metadata,
    ...normalizedContent.parties,
  ]
    .join(" ")
    .toLowerCase();

  return inferContractTypeFromSignals(signals);
}

async function autoAssignWorkflowForApproval(input: {
  organizationId: string;
  contract: ContractWithRelations;
  preferredWorkflowId?: string;
}) {
  if (input.contract.workflow) {
    return input.contract;
  }

  const preferredWorkflowId = input.preferredWorkflowId?.trim() || "";

  if (preferredWorkflowId) {
    const validatedWorkflowId = await validateWorkflowAssignment(
      input.organizationId,
      preferredWorkflowId,
    );

    if (validatedWorkflowId) {
      const updatedContract = await prisma.contract.update({
        where: {
          id: input.contract.id,
        },
        data: {
          workflowId: validatedWorkflowId,
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
          versions: {
            orderBy: { version: "desc" },
          },
          aiData: true,
          approvals: {
            orderBy: { createdAt: "desc" },
          },
          signatures: {
            orderBy: { signedAt: "desc" },
          },
        },
      });

      const [hydratedContract] = await attachWorkflowStepsToContracts([updatedContract]);

      return hydratedContract;
    }
  }

  const inferredType = inferContractTypeFromRecord(input.contract);

  if (inferredType === "CUSTOM") {
    throw new Error(
      "No workflow is attached to this contract, and its type could not be matched automatically.",
    );
  }

  const availableWorkflows = await prisma.workflow.findMany({
    where: {
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const matchedWorkflow = matchWorkflowByType(inferredType, availableWorkflows);

  if (!matchedWorkflow) {
    throw new Error(
      `No ${inferredType.toLowerCase()} workflow was found for this organization. Create one or assign a workflow manually first.`,
    );
  }

  const updatedContract = await prisma.contract.update({
    where: {
      id: input.contract.id,
    },
    data: {
      workflowId: matchedWorkflow.id,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      workflow: {
        select: {
          id: true,
          name: true,
        },
      },
      versions: {
        orderBy: { version: "desc" },
      },
      aiData: true,
      approvals: {
        orderBy: { createdAt: "desc" },
      },
      signatures: {
        orderBy: { signedAt: "desc" },
      },
    },
  });

  const [hydratedContract] = await attachWorkflowStepsToContracts([updatedContract]);

  return hydratedContract;
}

function getDefaultApprovalAssigneeId(contract: {
  creator: {
    id: string;
  };
}) {
  return contract.creator.id;
}

async function createWorkflowApprovalQueue(input: {
  organizationId: string;
  contract: ContractWithRelations;
  preferredWorkflowId?: string;
}) {
  const contract =
    input.contract.workflow
      ? input.contract
      : await autoAssignWorkflowForApproval(input);

  if (!contract.workflow) {
    throw new Error("Attach a workflow before sending this contract for approval.");
  }

  if (!contract.workflow.steps.length) {
    throw new Error("This workflow has no steps. Add at least one step before sending for approval.");
  }

  const firstStep = contract.workflow.steps[0];
  const assigneeId = getDefaultApprovalAssigneeId(contract);

  await prisma.$transaction([
    prisma.approval.deleteMany({
      where: {
        contractId: contract.id,
        contract: {
          organizationId: input.organizationId,
        },
      },
    }),
    prisma.contract.update({
      where: {
        id: contract.id,
      },
      data: {
        status: "PENDING",
      },
    }),
    prisma.approval.create({
      data: {
        contractId: contract.id,
        stepId: firstStep.id,
        userId: assigneeId,
        status: "PENDING",
      },
    }),
  ]);

  return contract.id;
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function getStatusWeight(status: ContractRecord["status"]) {
  const order = {
    DRAFT: 0,
    PENDING: 1,
    APPROVED: 2,
    SIGNED: 3,
    ARCHIVED: 4,
  } as const;

  return order[status];
}

function normalizeList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeContentJson(contentJson: unknown) {
  const html =
    contentJson && typeof contentJson === "object" && "html" in contentJson
      ? contentJson.html
      : "";
  const text =
    contentJson && typeof contentJson === "object" && "text" in contentJson
      ? contentJson.text
      : "";
  const content =
    contentJson && typeof contentJson === "object" && "content" in contentJson
      ? contentJson.content
      : "";
  const parties =
    contentJson && typeof contentJson === "object" && "parties" in contentJson
      ? contentJson.parties
      : [];
  const metadata =
    contentJson && typeof contentJson === "object" && "metadata" in contentJson
      ? contentJson.metadata
      : [];

  return {
    content:
      typeof text === "string" && text.trim()
        ? text
        : typeof content === "string"
          ? content
          : "",
    html: typeof html === "string" && html.trim() ? html : null,
    parties: normalizeList(parties),
    metadata: normalizeList(metadata),
  };
}

function toWorkflowSummary(contract: ContractWithRelations): WorkflowSummary | null {
  if (!contract.workflow) {
    return null;
  }

  const totalSteps = contract.workflow.steps.length;
  const completedSteps = contract.approvals.filter(
    (approval) => approval.status === "APPROVED",
  ).length;

  return {
    id: contract.workflow.id,
    name: contract.workflow.name,
    totalSteps,
    completedSteps: Math.min(totalSteps, completedSteps),
  };
}

function toContractRecord(contract: ContractWithRelations): ContractRecord {
  const latestVersion = contract.versions[0] || null;
  const latestApproval = contract.approvals[0] || null;
  const latestSignature = contract.signatures[0] || null;
  const normalizedContent = normalizeContentJson(latestVersion?.contentJson ?? null);
  const updatedCandidates = [
    contract.createdAt,
    latestVersion?.createdAt,
    latestApproval?.createdAt,
    latestSignature?.signedAt ?? null,
  ].filter(Boolean) as Date[];
  const updatedAt = updatedCandidates.reduce((latest, current) =>
    current.getTime() > latest.getTime() ? current : latest,
  );

  return {
    id: contract.id,
    organizationId: contract.organizationId,
    title: contract.title,
    status: contract.status,
    createdAt: contract.createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    createdBy: {
      id: contract.creator.id,
      name: contract.creator.name || contract.creator.email,
      email: contract.creator.email,
    },
    workflow: toWorkflowSummary(contract),
    parties: normalizedContent.parties,
    metadata: normalizedContent.metadata,
    content: normalizedContent.content,
    contentHtml: normalizedContent.html,
    summary: contract.aiData?.summary || null,
    fileUrl: latestVersion?.fileUrl || null,
    version: latestVersion?.version || 1,
    approval: getCurrentApprovalSummary(contract),
  };
}

async function fetchContractsForOrganization(organizationId: string) {
  const contracts = await prisma.contract.findMany({
    where: {
      organizationId,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      workflow: {
        select: {
          id: true,
          name: true,
        },
      },
      versions: {
        orderBy: {
          version: "desc",
        },
        take: 1,
      },
      aiData: true,
      approvals: {
        orderBy: {
          createdAt: "desc",
        },
      },
      signatures: {
        orderBy: {
          signedAt: "desc",
        },
      },
    },
  });

  return attachWorkflowStepsToContracts(contracts);
}

async function fetchContractWithRelationsById(organizationId: string, id: string) {
  const contract = await prisma.contract.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      workflow: {
        select: {
          id: true,
          name: true,
        },
      },
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
      aiData: true,
      approvals: {
        orderBy: { createdAt: "desc" },
      },
      signatures: {
        orderBy: { signedAt: "desc" },
      },
    },
  });

  if (!contract) {
    return null;
  }

  const [hydratedContract] = await attachWorkflowStepsToContracts([contract]);
  return hydratedContract;
}

async function getWorkflowCatalog(organizationId: string) {
  const workflows = await prisma.workflow.findMany({
    where: {
      organizationId,
    },
    include: {
      contracts: {
        include: {
          approvals: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const stepsByWorkflowId = await listWorkflowStepsByWorkflowIds(
    workflows.map((workflow) => workflow.id),
  );

  return workflows.map((workflow) => {
    const totalSteps = (stepsByWorkflowId.get(workflow.id) ?? []).length;
    const completedSteps = Math.min(
      totalSteps,
      workflow.contracts.reduce((sum, contract) => {
        return sum + contract.approvals.filter((approval) => approval.status === "APPROVED").length;
      }, 0),
    );

    return {
      id: workflow.id,
      name: workflow.name,
      totalSteps,
      completedSteps,
    };
  });
}

async function attachWorkflowStepsToContracts<
  T extends Array<{
    workflow: {
      id: string;
      name: string;
    } | null;
  }>,
>(contracts: T): Promise<Array<T[number] & { workflow: ContractWorkflowWithSteps | null }>> {
  const workflowIds = Array.from(
    new Set(
      contracts
        .map((contract) => contract.workflow?.id ?? null)
        .filter((workflowId): workflowId is string => Boolean(workflowId)),
    ),
  );
  const stepsByWorkflowId = await listWorkflowStepsByWorkflowIds(workflowIds);

  return contracts.map((contract) => ({
    ...contract,
    workflow: contract.workflow
      ? {
          ...contract.workflow,
          steps: stepsByWorkflowId.get(contract.workflow.id) ?? [],
        }
      : null,
  }));
}

function applyDateRangeFilters(items: ContractRecord[], filters: ContractFilters) {
  if (!filters.createdDateRange && !filters.createdFrom && !filters.createdTo) {
    return items;
  }

  const now = new Date();
  let fromDate: Date | null = null;
  let toDate: Date | null = null;

  if (filters.createdDateRange === "7d") {
    fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 7);
  }

  if (filters.createdDateRange === "30d") {
    fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 30);
  }

  if (filters.createdDateRange === "custom") {
    fromDate = filters.createdFrom ? new Date(`${filters.createdFrom}T00:00:00.000Z`) : null;
    toDate = filters.createdTo ? new Date(`${filters.createdTo}T23:59:59.999Z`) : null;
  }

  return items.filter((item) => {
    const createdAt = new Date(item.createdAt);

    if (fromDate && createdAt < fromDate) {
      return false;
    }

    if (toDate && createdAt > toDate) {
      return false;
    }

    return true;
  });
}

function sortContracts(items: ContractRecord[], filters: ContractFilters) {
  const direction = filters.sortDirection === "asc" ? 1 : -1;

  return [...items].sort((left, right) => {
    switch (filters.sortBy) {
      case "name":
        return compareStrings(left.title, right.title) * direction;
      case "status":
        return (getStatusWeight(left.status) - getStatusWeight(right.status)) * direction;
      case "createdAt":
        return (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) * direction;
      case "updatedAt":
      default:
        return (new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()) * direction;
    }
  });
}

function getStats(items: ContractRecord[]) {
  const today = new Date();
  const currentMonth = today.getUTCMonth();
  const currentYear = today.getUTCFullYear();

  return {
    totalContracts: items.length,
    pendingApprovals: items.filter((item) => item.status === "PENDING").length,
    signedThisMonth: items.filter((item) => {
      const updated = new Date(item.updatedAt);
      return (
        item.status === "SIGNED" &&
        updated.getUTCFullYear() === currentYear &&
        updated.getUTCMonth() === currentMonth
      );
    }).length,
  };
}

export async function listContracts(
  organizationId: string,
  _role: ContractRole,
  filters: ContractFilters,
  permissions: ContractsResponse["permissions"],
): Promise<ContractsResponse> {
  const contracts = await fetchContractsForOrganization(organizationId);
  const records = contracts.map(toContractRecord);

  let items = [...records];

  if (filters.search) {
    const term = filters.search.toLowerCase();
    items = items.filter((item) =>
      [item.title, item.content, item.summary || "", ...item.parties, ...item.metadata]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }

  if (filters.statuses.length) {
    items = items.filter((item) => filters.statuses.includes(item.status));
  }

  if (filters.workflowIds.length) {
    items = items.filter((item) => item.workflow && filters.workflowIds.includes(item.workflow.id));
  }

  if (filters.createdByIds.length) {
    items = items.filter((item) => filters.createdByIds.includes(item.createdBy.id));
  }

  items = applyDateRangeFilters(items, filters);
  items = sortContracts(items, filters);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / filters.pageSize));
  const page = Math.min(Math.max(filters.page, 1), totalPages);
  const start = (page - 1) * filters.pageSize;
  const pageItems = items.slice(start, start + filters.pageSize);
  const creators = Array.from(
    new Map(records.map((item) => [item.createdBy.id, item.createdBy])).values(),
  );

  return {
    items: pageItems,
    page,
    pageSize: filters.pageSize,
    totalItems,
    totalPages,
    stats: getStats(records),
    workflows: await getWorkflowCatalog(organizationId),
    creators,
    permissions,
  };
}

export async function createContractRecord(input: {
  organizationId: string;
  createdById: string;
  createdByName: string;
  data: CreateContractInput;
}) {
  const title = input.data.title.trim();
  const content = input.data.content.trim();

  if (!title) {
    throw new Error("Contract title is required.");
  }

  if (!content) {
    throw new Error("Contract content is required.");
  }

  const normalizedParties = input.data.parties.map((item) => item.trim()).filter(Boolean);
  const normalizedMetadata = input.data.metadata.map((item) => item.trim()).filter(Boolean);
  const workflowId = await validateWorkflowAssignment(
    input.organizationId,
    input.data.workflowId,
  );
  const templateId = await validateTemplateAssignment(
    input.organizationId,
    input.data.templateId,
  );
  const contentJson: ContractEditorContent = {
    format: "html",
    html: input.data.contentJson?.html?.trim() || `<p>${content.replace(/\n/g, "</p><p>")}</p>`,
    text: content,
  };
  const versionContentJson = {
    ...contentJson,
    content,
    parties: normalizedParties,
    metadata: normalizedMetadata,
  } satisfies Prisma.InputJsonObject;

  const createdContract = await prisma.contract.create({
    data: {
      organizationId: input.organizationId,
      title,
      status: "DRAFT",
      createdBy: input.createdById,
      workflowId,
      templateId,
      versions: {
        create: {
          version: 1,
          fileUrl: input.data.fileUrl?.trim() || null,
          contentJson: versionContentJson,
        },
      },
      aiData: input.data.summary?.trim()
        ? {
            create: {
              summary: input.data.summary.trim(),
            },
          }
        : undefined,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      workflow: {
        select: {
          id: true,
          name: true,
        },
      },
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
      aiData: true,
      approvals: {
        orderBy: { createdAt: "desc" },
      },
      signatures: {
        orderBy: { signedAt: "desc" },
      },
    },
  });

  const [contract] = await attachWorkflowStepsToContracts([createdContract]);

  await notifyContractCreated({
    organizationId: input.organizationId,
    actorName: input.createdByName,
    contractId: contract.id,
    contractTitle: contract.title,
  });

  const pendingSignatureEmails = contract.signatures
    .filter((signature) => signature.status === "PENDING")
    .map((signature) => signature.email.trim().toLowerCase())
    .filter(Boolean);

  await notifySignatureRequired({
    organizationId: input.organizationId,
    contractId: contract.id,
    contractTitle: contract.title,
    emails: pendingSignatureEmails,
  });

  return toContractRecord(contract);
}

export async function updateContractRecord(input: {
  organizationId: string;
  id: string;
  data: UpdateContractInput;
}) {
  const title = input.data.title.trim();
  const content = input.data.content.trim();

  if (!title) {
    throw new Error("Contract title is required.");
  }

  if (!content) {
    throw new Error("Contract content is required.");
  }

  const existing = await prisma.contract.findFirst({
    where: {
      id: input.id,
      organizationId: input.organizationId,
    },
    include: {
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
      aiData: true,
    },
  });

  if (!existing) {
    throw new Error("Contract not found.");
  }

  const latestVersion = existing.versions[0];
  const normalizedParties = input.data.parties.map((item) => item.trim()).filter(Boolean);
  const normalizedMetadata = input.data.metadata.map((item) => item.trim()).filter(Boolean);
  const workflowId = await validateWorkflowAssignment(
    input.organizationId,
    input.data.workflowId,
  );
  const contentJson: ContractEditorContent = {
    format: "html",
    html: input.data.contentJson?.html?.trim() || `<p>${content.replace(/\n/g, "</p><p>")}</p>`,
    text: content,
  };
  const versionContentJson = {
    ...contentJson,
    content,
    parties: normalizedParties,
    metadata: normalizedMetadata,
  } satisfies Prisma.InputJsonObject;

  const updatedContract = await prisma.contract.update({
    where: { id: input.id },
    data: {
      title,
      workflowId,
      versions: {
        create: {
          version: (latestVersion?.version || 0) + 1,
          fileUrl: input.data.fileUrl?.trim() || latestVersion?.fileUrl || null,
          contentJson: versionContentJson,
        },
      },
      aiData: {
        upsert: {
          create: {
            summary: input.data.summary?.trim() || "",
          },
          update: {
            summary: input.data.summary?.trim() || "",
          },
        },
      },
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      workflow: {
        select: {
          id: true,
          name: true,
        },
      },
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
      aiData: true,
      approvals: {
        orderBy: { createdAt: "desc" },
      },
      signatures: {
        orderBy: { signedAt: "desc" },
      },
    },
  });

  const [contract] = await attachWorkflowStepsToContracts([updatedContract]);

  return toContractRecord(contract);
}

export async function removeContract(organizationId: string, id: string) {
  const foundContract = await prisma.contract.findFirst({
    where: {
      id,
      organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!foundContract) {
    throw new Error("Contract not found.");
  }

  await prisma.$transaction([
    prisma.contractVersion.deleteMany({ where: { contractId: id } }),
    prisma.contractAI.deleteMany({ where: { contractId: id } }),
    prisma.approval.deleteMany({ where: { contractId: id } }),
    prisma.signature.deleteMany({ where: { contractId: id } }),
    prisma.contract.delete({ where: { id } }),
  ]);
}

export async function runAction(
  organizationId: string,
  id: string,
  action: ContractMutationAction,
  options?: {
    preferredWorkflowId?: string;
    actorId?: string;
    actorName?: string;
    actorRole?: ContractRole;
  },
) {
  const foundContract = await fetchContractWithRelationsById(organizationId, id);

  if (!foundContract) {
    throw new Error("Contract not found.");
  }
  const contract = foundContract;

  if (action === "duplicate") {
    const latestVersion = contract.versions[0];

    const createdDuplicate = await prisma.contract.create({
      data: {
        organizationId,
        title: `${contract.title} Copy`,
        status: "DRAFT",
        createdBy: contract.createdBy,
        workflowId: contract.workflowId,
        templateId: contract.templateId,
        versions: latestVersion
          ? {
              create: {
                version: 1,
                fileUrl: latestVersion.fileUrl,
                contentJson: latestVersion.contentJson as Prisma.InputJsonValue,
              },
            }
          : undefined,
        aiData: contract.aiData
          ? {
              create: {
                summary: contract.aiData.summary,
                riskScore: contract.aiData.riskScore,
                ...(contract.aiData.clauses !== null
                  ? { clauses: contract.aiData.clauses as Prisma.InputJsonValue }
                  : {}),
              },
            }
          : undefined,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        workflow: {
          select: {
            id: true,
            name: true,
          },
        },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
        aiData: true,
        approvals: {
          orderBy: { createdAt: "desc" },
        },
        signatures: {
          orderBy: { signedAt: "desc" },
        },
      },
    });

    const [duplicated] = await attachWorkflowStepsToContracts([createdDuplicate]);

    return toContractRecord(duplicated);
  }

  if (action === "send_for_approval") {
    const contractId = await createWorkflowApprovalQueue({
      organizationId,
      contract,
      preferredWorkflowId: options?.preferredWorkflowId,
    });

    const refreshedContract = await fetchContractWithRelationsById(organizationId, contractId);

    if (!refreshedContract) {
      throw new Error("Contract could not be reloaded after starting approval.");
    }

    const currentStep = getCurrentWorkflowStep(refreshedContract);

    if (currentStep) {
      await notifyApprovalRequired({
        organizationId,
        contractId: refreshedContract.id,
        contractTitle: refreshedContract.title,
        role: currentStep.role as ContractRole,
      });
    }

    return toContractRecord(refreshedContract);
  }

  if (action === "approve" || action === "reject") {
    if (!options?.actorId || !options.actorRole) {
      throw new Error("Approval actor context is required.");
    }

    if (!contract.workflow) {
      throw new Error("This contract does not have a workflow to approve.");
    }

    const currentApproval = contract.approvals.find((approval) => approval.status === "PENDING");
    const currentStep =
      currentApproval
        ? contract.workflow.steps.find((step) => step.id === currentApproval.stepId) ?? null
        : null;

    if (!currentApproval || !currentStep) {
      throw new Error("There is no pending workflow step to act on.");
    }

    const currentStepRole = currentStep.role as ContractRole;

    if (!canRoleApproveStep(options.actorRole, currentStepRole)) {
      throw new Error(
        `This step requires ${currentStepRole.toLowerCase()} approval.`,
      );
    }

    const nextStep =
      contract.workflow.steps.find((step) => step.order === currentStep.order + 1) ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.approval.update({
        where: {
          id: currentApproval.id,
        },
        data: {
          userId: options.actorId,
          status: action === "approve" ? "APPROVED" : "REJECTED",
        },
      });

      if (action === "reject") {
        await tx.contract.update({
          where: { id: contract.id },
          data: {
            status: "DRAFT",
          },
        });

        return;
      }

      if (nextStep) {
        await tx.approval.create({
          data: {
            contractId: contract.id,
            stepId: nextStep.id,
            userId: contract.creator.id,
            status: "PENDING",
          },
        });

        await tx.contract.update({
          where: { id: contract.id },
          data: {
            status: "PENDING",
          },
        });

        return;
      }

      await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: "APPROVED",
        },
      });
    });

    const refreshedContract = await fetchContractWithRelationsById(organizationId, contract.id);

    if (!refreshedContract) {
      throw new Error("Contract could not be reloaded after approval.");
    }

    if (action === "reject") {
      await notifyContractRejected({
        organizationId,
        actorName: options.actorName || refreshedContract.creator.name || refreshedContract.creator.email,
        contractId: refreshedContract.id,
        contractTitle: refreshedContract.title,
      });

      return toContractRecord(refreshedContract);
    }

    const upcomingStep = getCurrentWorkflowStep(refreshedContract);

    if (upcomingStep && refreshedContract.status === "PENDING") {
      await notifyApprovalRequired({
        organizationId,
        contractId: refreshedContract.id,
        contractTitle: refreshedContract.title,
        role: upcomingStep.role as ContractRole,
      });
    }

    if (refreshedContract.status === "APPROVED") {
      await notifyContractApproved({
        organizationId,
        actorName: options.actorName || refreshedContract.creator.name || refreshedContract.creator.email,
        contractId: refreshedContract.id,
        contractTitle: refreshedContract.title,
      });
    }

    return toContractRecord(refreshedContract);
  }

  const updatedContract = await prisma.contract.update({
    where: { id },
    data: {
      status: action === "unarchive" ? "DRAFT" : "ARCHIVED",
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      workflow: {
        select: {
          id: true,
          name: true,
        },
      },
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
      aiData: true,
      approvals: {
        orderBy: { createdAt: "desc" },
      },
      signatures: {
        orderBy: { signedAt: "desc" },
      },
    },
  });

  const [updated] = await attachWorkflowStepsToContracts([updatedContract]);

  return toContractRecord(updated);
}

export async function runBulkContractAction(
  organizationId: string,
  action: BulkAction,
) {
  if (!action.ids.length) {
    return;
  }

  if (action.action === "delete") {
    await prisma.$transaction([
      prisma.contractVersion.deleteMany({
        where: {
          contractId: { in: action.ids },
          contract: { organizationId },
        },
      }),
      prisma.contractAI.deleteMany({
        where: {
          contractId: { in: action.ids },
          contract: { organizationId },
        },
      }),
      prisma.approval.deleteMany({
        where: {
          contractId: { in: action.ids },
          contract: { organizationId },
        },
      }),
      prisma.signature.deleteMany({
        where: {
          contractId: { in: action.ids },
          contract: { organizationId },
        },
      }),
      prisma.contract.deleteMany({
        where: {
          id: { in: action.ids },
          organizationId,
        },
      }),
    ]);
    return;
  }

  if (action.action === "archive") {
    await prisma.contract.updateMany({
      where: {
        id: { in: action.ids },
        organizationId,
      },
      data: {
        status: "ARCHIVED",
      },
    });
    return;
  }

  await prisma.contract.updateMany({
    where: {
      id: { in: action.ids },
      organizationId,
    },
    data: {
      workflowId: action.workflowId,
    },
  });
}

export async function getContractById(organizationId: string, id: string) {
  const foundContract = await prisma.contract.findFirst({
    where: {
      id,
      organizationId,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      workflow: {
        select: {
          id: true,
          name: true,
        },
      },
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
      aiData: true,
      approvals: {
        orderBy: { createdAt: "desc" },
      },
      signatures: {
        orderBy: { signedAt: "desc" },
      },
    },
  });

  if (!foundContract) {
    return null;
  }

  const [contract] = await attachWorkflowStepsToContracts([foundContract]);

  return toContractRecord(contract);
}

export async function getDashboardData(organizationId: string) {
  const contracts = await fetchContractsForOrganization(organizationId);
  const records = contracts.map(toContractRecord);
  const totalActive = records.filter((item) => item.status !== "ARCHIVED").length;
  const pendingContracts = records.filter((item) => item.status === "PENDING").length;
  const today = new Date();
  const signedThisMonth = records.filter((item) => {
    const updated = new Date(item.updatedAt);
    return (
      item.status === "SIGNED" &&
      updated.getUTCFullYear() === today.getUTCFullYear() &&
      updated.getUTCMonth() === today.getUTCMonth()
    );
  }).length;
  const riskAlerts = contracts.filter((item) => {
    return item.aiData?.riskScore && item.aiData.riskScore !== "low";
  }).length;

  const recentContracts = [...records]
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      contract: item.title,
      stage: item.workflow?.name || item.status,
      owner: item.createdBy.name,
      eta: item.status === "PENDING" ? "Waiting" : item.status === "SIGNED" ? "Done" : "In progress",
    }));

  const recentApprovals = await prisma.approval.findMany({
    where: {
      contract: {
        organizationId,
      },
    },
    include: {
      contract: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 4,
  });

  const activity = recentApprovals.map((approval) => {
    return `${approval.contract.title} approval is ${approval.status.toLowerCase()}.`;
  });

  const workflows = await prisma.workflow.findMany({
    where: { organizationId },
    include: {
      _count: {
        select: {
          contracts: true,
          steps: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
    take: 3,
  });

  const focus = workflows.map((workflow) => {
    return `${workflow.name} has ${workflow._count.contracts} contract${workflow._count.contracts === 1 ? "" : "s"} across ${workflow._count.steps} steps.`;
  });

  return {
    pulseCards: [
      {
        label: "Contracts touched today",
        value: records.filter((item) => {
          const updated = new Date(item.updatedAt);
          return updated.toDateString() === today.toDateString();
        }).length,
        tone: "bg-[var(--primary-soft)] text-[var(--primary)]",
      },
      {
        label: "Approvals due today",
        value: pendingContracts,
        tone: "bg-[var(--warning-soft)] text-[var(--warning)]",
      },
      {
        label: "Workflow health",
        value:
          workflows.length === 0
            ? "0%"
            : `${Math.round((records.filter((item) => item.status !== "ARCHIVED").length / Math.max(records.length, 1)) * 100)}%`,
        tone: "bg-[var(--success-soft)] text-[var(--success)]",
      },
    ],
    stats: [
      {
        label: "Active contracts",
        value: String(totalActive),
        note: `${records.length} total in workspace`,
      },
      {
        label: "Pending approvals",
        value: String(pendingContracts),
        note: `${pendingContracts} currently need action`,
      },
      {
        label: "Signed this month",
        value: String(signedThisMonth),
        note: "Based on latest contract updates",
      },
      {
        label: "Risk alerts",
        value: String(riskAlerts),
        note: "Contracts with elevated AI risk signals",
      },
    ],
    pipeline: recentContracts,
    activity,
    focus,
  };
}
