import type { ContractEditorContent, ContractGenerationType } from "@/lib/contracts/types";

export const templateTypes = ["NDA", "VENDOR", "EMPLOYMENT", "CUSTOM"] as const;

export type TemplateType = (typeof templateTypes)[number];

export type TemplateRecord = {
  id: string;
  name: string;
  type: TemplateType;
  createdAt: string;
  createdAtLabel: string;
  usageCount: number;
  workflowId: string | null;
  workflowName: string | null;
  contentHtml: string;
  contentText: string;
  placeholders: string[];
};

export type TemplatePermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canUse: boolean;
};

export type TemplateStats = {
  totalTemplates: number;
  totalUsage: number;
  ndaTemplates: number;
  activeWorkflowDefaults: number;
};

export type TemplatesResponse = {
  items: TemplateRecord[];
  permissions: TemplatePermissions;
  stats: TemplateStats;
};

export type TemplatePayload = {
  name: string;
  type: TemplateType | ContractGenerationType;
  workflowId?: string;
  contentJson: ContractEditorContent;
};

export type TemplateDeleteResult = {
  success: true;
  usageCount: number;
};

export type TemplateAIInput = {
  mode: "generate" | "suggest" | "merge";
  prompt: string;
  type: TemplateType | ContractGenerationType;
  currentName?: string;
  currentContent?: string;
  mergeInstructions?: string;
};

export type TemplateAIResponse = {
  name?: string;
  contentHtml?: string;
  summary: string;
  suggestions: string[];
};
