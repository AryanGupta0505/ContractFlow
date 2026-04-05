export const contractStatuses = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "SIGNED",
  "ARCHIVED",
] as const;

export const contractRoles = ["ADMIN", "MANAGER", "EMPLOYEE"] as const;

export const createdDateRanges = ["7d", "30d", "custom"] as const;

export const sortFields = ["name", "status", "createdAt", "updatedAt"] as const;
export const sortDirections = ["asc", "desc"] as const;

export type ContractStatus = (typeof contractStatuses)[number];
export type ContractRole = (typeof contractRoles)[number];
export type CreatedDateRange = (typeof createdDateRanges)[number];
export type SortField = (typeof sortFields)[number];
export type SortDirection = (typeof sortDirections)[number];

export type WorkflowSummary = {
  id: string;
  name: string;
  totalSteps: number;
  completedSteps: number;
};

export type ContractApprovalSummary = {
  currentStepId: string | null;
  currentStepOrder: number | null;
  currentStepRole: ContractRole | null;
  currentStepStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
};

export type ContractUser = {
  id: string;
  name: string;
  email: string;
};

export type ContractRecord = {
  id: string;
  organizationId: string;
  title: string;
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: ContractUser;
  workflow: WorkflowSummary | null;
  parties: string[];
  metadata: string[];
  content: string;
  contentHtml: string | null;
  summary: string | null;
  fileUrl: string | null;
  version: number;
  approval: ContractApprovalSummary;
};

export const contractGenerationTypes = [
  "NDA",
  "VENDOR",
  "EMPLOYMENT",
  "CUSTOM",
] as const;

export type ContractGenerationType = (typeof contractGenerationTypes)[number];

export type ContractEditorContent = {
  format: "html";
  html: string;
  text: string;
};

export type ContractTemplatePrefill = {
  id: string;
  name: string;
  type: ContractGenerationType;
  workflowId: string | null;
  workflowName: string | null;
  contentHtml: string;
  placeholders: string[];
};

export type ContractFilters = {
  search: string;
  statuses: ContractStatus[];
  workflowIds: string[];
  createdByIds: string[];
  createdDateRange: CreatedDateRange | "";
  createdFrom: string;
  createdTo: string;
  sortBy: SortField;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
};

export type ContractStats = {
  totalContracts: number;
  pendingApprovals: number;
  signedThisMonth: number;
};

export type ContractsResponse = {
  items: ContractRecord[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  stats: ContractStats;
  workflows: WorkflowSummary[];
  creators: ContractUser[];
  permissions: ContractPermissions;
};

export type ContractPermissions = {
  canCreate: boolean;
  canEdit: boolean;
  canSendForApproval: boolean;
  canApprove: boolean;
  canArchive: boolean;
  canDelete: boolean;
  canAssignWorkflow: boolean;
};

export type ContractMutationAction =
  | "duplicate"
  | "send_for_approval"
  | "approve"
  | "reject"
  | "archive"
  | "unarchive";

export type BulkAction =
  | {
      action: "delete";
      ids: string[];
    }
  | {
      action: "archive";
      ids: string[];
    }
  | {
      action: "assignWorkflow";
      ids: string[];
      workflowId: string;
    };

export const defaultContractFilters: ContractFilters = {
  search: "",
  statuses: [],
  workflowIds: [],
  createdByIds: [],
  createdDateRange: "",
  createdFrom: "",
  createdTo: "",
  sortBy: "updatedAt",
  sortDirection: "desc",
  page: 1,
  pageSize: 8,
};

export type CreateContractInput = {
  title: string;
  content: string;
  contentJson?: ContractEditorContent;
  summary?: string;
  workflowId?: string;
  templateId?: string;
  fileUrl?: string;
  parties: string[];
  metadata: string[];
  aiPrompt?: string;
  aiResponse?: string;
};

export type UpdateContractInput = {
  title: string;
  content: string;
  contentJson?: ContractEditorContent;
  summary?: string;
  workflowId?: string;
  fileUrl?: string;
  parties: string[];
  metadata: string[];
};

export type GenerateContractInput = {
  title: string;
  type: ContractGenerationType;
  partyA: string;
  partyB: string;
  description: string;
  duration: string;
  paymentTerms?: string;
  additionalClauses?: string;
  currentDraft?: string;
  mergeInstructions?: string;
  mode?: "generate" | "improve" | "suggest" | "merge";
};

export type GenerateContractResponse = {
  content: string;
  html: string;
  summary: string;
  promptPreview: string;
  metadata: string[];
  parties: string[];
};
