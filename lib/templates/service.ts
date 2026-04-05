import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { extractTemplatePlaceholdersFromHtml } from "@/lib/templates/placeholders";

import type { ContractEditorContent, ContractGenerationType, ContractRole } from "@/lib/contracts/types";
import type {
  TemplateDeleteResult,
  TemplatePayload,
  TemplatePermissions,
  TemplateRecord,
  TemplateStats,
  TemplatesResponse,
  TemplateType,
} from "@/lib/templates/types";

function normalizeTemplateType(value: string): TemplateType {
  const normalized = value.trim().toUpperCase();

  if (
    normalized === "NDA" ||
    normalized === "VENDOR" ||
    normalized === "EMPLOYMENT" ||
    normalized === "CUSTOM"
  ) {
    return normalized;
  }

  throw new Error("Template type must be NDA, Vendor, Employment, or Custom.");
}

function htmlToPlainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|h1|h2|h3|li|section)>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

async function validateWorkflowAssignment(organizationId: string, workflowId?: string) {
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
      name: true,
    },
  });

  if (!workflow) {
    throw new Error("Selected default workflow was not found for this organization.");
  }

  return workflow;
}

function normalizeContentJson(contentJson: unknown): ContractEditorContent {
  const html =
    contentJson && typeof contentJson === "object" && "html" in contentJson
      ? contentJson.html
      : "";
  const text =
    contentJson && typeof contentJson === "object" && "text" in contentJson
      ? contentJson.text
      : "";

  const normalizedHtml = typeof html === "string" ? html.trim() : "";
  const normalizedText =
    typeof text === "string" && text.trim() ? text.trim() : htmlToPlainText(normalizedHtml);

  return {
    format: "html",
    html: normalizedHtml,
    text: normalizedText,
  };
}

type TemplateRow = Awaited<ReturnType<typeof listTemplateRows>>[number];

function toTemplateRecord(template: TemplateRow): TemplateRecord {
  const content = normalizeContentJson(template.contentJson);

  return {
    id: template.id,
    name: template.name,
    type: normalizeTemplateType(template.type),
    createdAt: template.createdAt.toISOString(),
    createdAtLabel: formatDateLabel(template.createdAt),
    usageCount: template._count.contracts,
    workflowId: template.workflow?.id ?? null,
    workflowName: template.workflow?.name ?? null,
    contentHtml: content.html,
    contentText: content.text,
    placeholders: extractTemplatePlaceholdersFromHtml(content.html),
  };
}

async function listTemplateRows(organizationId: string) {
  return prisma.template.findMany({
    where: {
      organizationId,
    },
    include: {
      workflow: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          contracts: true,
        },
      },
    },
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        name: "asc",
      },
    ],
  });
}

function getTemplatePermissions(role: ContractRole): TemplatePermissions {
  return {
    canCreate: role === "ADMIN",
    canEdit: role === "ADMIN",
    canDelete: role === "ADMIN",
    canUse: true,
  };
}

function getTemplateStats(items: TemplateRecord[]): TemplateStats {
  return {
    totalTemplates: items.length,
    totalUsage: items.reduce((sum, item) => sum + item.usageCount, 0),
    ndaTemplates: items.filter((item) => item.type === "NDA").length,
    activeWorkflowDefaults: items.filter((item) => item.workflowId).length,
  };
}

async function recordTemplateAuditLog(input: {
  organizationId: string;
  userId: string;
  action: string;
  entityId: string;
}) {
  const auditLogDelegate = (prisma as unknown as { auditLog?: { create: (args: unknown) => Promise<unknown> } })
    .auditLog;

  if (!auditLogDelegate?.create) {
    return;
  }

  try {
    await auditLogDelegate.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        action: input.action,
        entityType: "template",
        entityId: input.entityId,
      },
    });
  } catch (error) {
    console.error("Template audit log write failed", error);
  }
}

export async function listTemplates(
  organizationId: string,
  role: ContractRole,
): Promise<TemplatesResponse> {
  const items = (await listTemplateRows(organizationId)).map(toTemplateRecord);

  return {
    items,
    permissions: getTemplatePermissions(role),
    stats: getTemplateStats(items),
  };
}

export async function getTemplateForContractPrefill(
  organizationId: string,
  templateId: string,
) {
  const template = await prisma.template.findFirst({
    where: {
      id: templateId,
      organizationId,
    },
    include: {
      workflow: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!template) {
    return null;
  }

  const content = normalizeContentJson(template.contentJson);

  return {
    id: template.id,
    name: template.name,
    type: normalizeTemplateType(template.type) as ContractGenerationType,
    workflowId: template.workflow?.id ?? null,
    workflowName: template.workflow?.name ?? null,
    contentHtml: content.html,
    placeholders: extractTemplatePlaceholdersFromHtml(content.html),
  };
}

export async function createTemplate(input: {
  organizationId: string;
  actorId: string;
  payload: TemplatePayload;
}) {
  const name = input.payload.name.trim();
  const type = normalizeTemplateType(input.payload.type);
  const content = normalizeContentJson(input.payload.contentJson);

  if (!name) {
    throw new Error("Template name is required.");
  }

  if (!content.html) {
    throw new Error("Template content is required.");
  }

  const workflow = await validateWorkflowAssignment(input.organizationId, input.payload.workflowId);

  const template = await prisma.template.create({
    data: {
      organizationId: input.organizationId,
      name,
      type,
      workflowId: workflow?.id ?? null,
      contentJson: content as Prisma.InputJsonValue,
    },
    include: {
      workflow: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          contracts: true,
        },
      },
    },
  });

  await recordTemplateAuditLog({
    organizationId: input.organizationId,
    userId: input.actorId,
    action: "template.created",
    entityId: template.id,
  });

  return toTemplateRecord(template);
}

export async function updateTemplate(input: {
  organizationId: string;
  actorId: string;
  templateId: string;
  payload: TemplatePayload;
}) {
  const existing = await prisma.template.findFirst({
    where: {
      id: input.templateId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new Error("Template not found.");
  }

  const name = input.payload.name.trim();
  const type = normalizeTemplateType(input.payload.type);
  const content = normalizeContentJson(input.payload.contentJson);

  if (!name) {
    throw new Error("Template name is required.");
  }

  if (!content.html) {
    throw new Error("Template content is required.");
  }

  const workflow = await validateWorkflowAssignment(input.organizationId, input.payload.workflowId);

  const template = await prisma.template.update({
    where: {
      id: input.templateId,
    },
    data: {
      name,
      type,
      workflowId: workflow?.id ?? null,
      contentJson: content as Prisma.InputJsonValue,
    },
    include: {
      workflow: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          contracts: true,
        },
      },
    },
  });

  await recordTemplateAuditLog({
    organizationId: input.organizationId,
    userId: input.actorId,
    action: "template.updated",
    entityId: template.id,
  });

  return toTemplateRecord(template);
}

export async function deleteTemplate(input: {
  organizationId: string;
  actorId: string;
  templateId: string;
}): Promise<TemplateDeleteResult> {
  const template = await prisma.template.findFirst({
    where: {
      id: input.templateId,
      organizationId: input.organizationId,
    },
    include: {
      _count: {
        select: {
          contracts: true,
        },
      },
    },
  });

  if (!template) {
    throw new Error("Template not found.");
  }

  if (template._count.contracts > 0) {
    throw new Error("This template is already used by contracts and cannot be deleted.");
  }

  await prisma.template.delete({
    where: {
      id: input.templateId,
    },
  });

  await recordTemplateAuditLog({
    organizationId: input.organizationId,
    userId: input.actorId,
    action: "template.deleted",
    entityId: input.templateId,
  });

  return {
    success: true,
    usageCount: template._count.contracts,
  };
}
