import type { ContractRole } from "@/lib/contracts/types";

export type WorkflowStepInput = {
  id?: string;
  order: number;
  role: ContractRole;
  condition: string;
};

export type WorkflowUsageContract = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  approvalProgressLabel: string;
};

export type WorkflowAnalytics = {
  totalContracts: number;
  activeApprovals: number;
  completionRate: number;
};

export type WorkflowRecord = {
  id: string;
  name: string;
  contractCount: number;
  createdAtLabel: string;
  lastUsedAt: string | null;
  lastUsedAtLabel: string;
  stepsPreview: string;
  steps: WorkflowStepInput[];
  analytics: WorkflowAnalytics;
  usageContracts: WorkflowUsageContract[];
};

export type WorkflowPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type WorkflowTemplateType = "VENDOR" | "NDA" | "EMPLOYMENT";

export type WorkflowTemplate = {
  type: WorkflowTemplateType;
  label: string;
  description: string;
  workflowName: string;
  steps: Array<{
    role: ContractRole;
    condition?: string;
  }>;
};

export type WorkflowsResponse = {
  items: WorkflowRecord[];
  permissions: WorkflowPermissions;
  stats: {
    totalWorkflows: number;
    activeContracts: number;
    activeApprovals: number;
    averageSteps: number;
    averageCompletionRate: number;
  };
  templates: WorkflowTemplate[];
};

export type WorkflowPayload = {
  name: string;
  steps: Array<{
    id?: string;
    role: ContractRole;
    condition?: string;
  }>;
};

export type WorkflowAIMode = "generate" | "suggest";

export type WorkflowAIInput = {
  prompt: string;
  mode: WorkflowAIMode;
  currentWorkflow?: WorkflowPayload;
  contractType?: WorkflowTemplateType | "CUSTOM";
};

export type WorkflowAIResponse = {
  workflow: WorkflowPayload;
  summary: string;
  suggestions: string[];
  suggestedType: WorkflowTemplateType | "CUSTOM";
};
