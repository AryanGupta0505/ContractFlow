import type { ContractRole } from "@/lib/contracts/types";

export type UserStatus = "ACTIVE" | "INVITED" | "DISABLED";

export type MembershipRecord = {
  id: string;
  userId: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
  role: ContractRole;
  joinedAt: string;
  joinedAtValue: string;
  status: UserStatus;
  statusLabel: string;
  lastActiveAt: string | null;
  lastActiveLabel: string;
  contractsCreatedCount: number;
  approvalsHandledCount: number;
  latestContracts: Array<{
    id: string;
    title: string;
    createdAt: string;
  }>;
  latestApprovals: Array<{
    id: string;
    contractTitle: string;
    status: string;
    createdAt: string;
  }>;
};

export type MembershipsResponse = {
  items: MembershipRecord[];
  currentUserId: string;
  permissions: {
    canManage: boolean;
  };
  organization: {
    id: string;
    name: string;
  };
};

export type CreateMembershipPayload = {
  name: string;
  email: string;
  role: ContractRole;
};

export type UpdateMembershipPayload = {
  role?: ContractRole;
  status?: UserStatus;
};
