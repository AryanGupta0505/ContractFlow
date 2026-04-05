import prisma from "@/lib/prisma";

import { contractRoles, type ContractRole } from "@/lib/contracts/types";
import type {
  CreateMembershipPayload,
  MembershipRecord,
  MembershipsResponse,
  UpdateMembershipPayload,
  UserStatus,
} from "@/lib/memberships/types";

type UserWithStatus = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
  status: UserStatus;
  lastActiveAt: Date | null;
  password?: string | null;
};

type MembershipWithUser = {
  id: string;
  userId: string;
  organizationId: string;
  role: ContractRole | string;
  user: UserWithStatus;
  organization?: {
    id: string;
    name: string;
  } | null;
};

type LegacyUser = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  createdAt: Date;
  status?: UserStatus;
  lastActiveAt?: Date | null;
  password?: string | null;
  accounts?: Array<{ id: string }>;
};

type UserStateAuditSnapshot = {
  status?: UserStatus;
  lastActiveAt?: Date | null;
};

const userStatusAuditAction = "USER_STATUS_CHANGED";
const userLastActiveAuditAction = "USER_LAST_ACTIVE";
const userStatusEntityPrefix = "user-status:";

function getUserStatusEntityType(status: UserStatus) {
  return `${userStatusEntityPrefix}${status}`;
}

function parseUserStatusEntityType(entityType: string): UserStatus | null {
  if (!entityType.startsWith(userStatusEntityPrefix)) {
    return null;
  }

  const status = entityType.slice(userStatusEntityPrefix.length);
  if (status === "DISABLED") {
    return "DISABLED";
  }

  if (status === "ACTIVE" || status === "INVITED") {
    return "ACTIVE";
  }

  return null;
}

function parseAuditDate(entityId: string, createdAt: Date) {
  const parsed = new Date(entityId);
  return Number.isNaN(parsed.getTime()) ? createdAt : parsed;
}

function normalizeUserWithStatus(user: LegacyUser): UserWithStatus {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    createdAt: user.createdAt,
    status: user.status ?? "ACTIVE",
    lastActiveAt: user.lastActiveAt ?? null,
  };
}

function normalizeMembershipWithUser(membership: {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  user: LegacyUser;
  organization?: {
    id: string;
    name: string;
  } | null;
}): MembershipWithUser {
  return {
    id: membership.id,
    userId: membership.userId,
    organizationId: membership.organizationId,
    role: membership.role,
    organization: membership.organization,
    user: normalizeUserWithStatus(membership.user),
  };
}

async function getUserStateAuditMap(organizationId: string, userIds: string[]) {
  if (!userIds.length) {
    return new Map<string, UserStateAuditSnapshot>();
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      userId: {
        in: userIds,
      },
      action: {
        in: [userStatusAuditAction, userLastActiveAuditAction],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const stateMap = new Map<string, UserStateAuditSnapshot>();

  for (const log of logs) {
    const current = stateMap.get(log.userId) ?? {};

    if (log.action === userStatusAuditAction && current.status === undefined) {
      const status = parseUserStatusEntityType(log.entityType);
      if (status) {
        current.status = status;
      }
    }

    if (log.action === userLastActiveAuditAction && current.lastActiveAt === undefined) {
      current.lastActiveAt = parseAuditDate(log.entityId, log.createdAt);
    }

    stateMap.set(log.userId, current);
  }

  return stateMap;
}

async function applyAuditUserState(
  organizationId: string,
  memberships: MembershipWithUser[],
) {
  const stateMap = await getUserStateAuditMap(
    organizationId,
    Array.from(new Set(memberships.map((membership) => membership.userId))),
  );

  if (!stateMap.size) {
    return memberships;
  }

  return memberships.map((membership) => {
    const state = stateMap.get(membership.userId);

    if (!state) {
      return membership;
    }

    return {
      ...membership,
      user: {
        ...membership.user,
        status: state.status ?? membership.user.status,
        lastActiveAt:
          state.lastActiveAt === undefined
            ? membership.user.lastActiveAt
            : state.lastActiveAt,
      },
    };
  });
}

async function findMembershipsWithUsers(organizationId: string) {
  try {
    const rows = (await prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            status: true,
            lastActiveAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { user: { email: "asc" } }],
    } as never)) as Array<{
      id: string;
      userId: string;
      organizationId: string;
      role: string;
      user: LegacyUser;
    }>;

    return applyAuditUserState(
      organizationId,
      rows.map(normalizeMembershipWithUser),
    );
  } catch {
    const rows = await prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { user: { email: "asc" } }],
    });

    return applyAuditUserState(
      organizationId,
      rows.map((membership) =>
        normalizeMembershipWithUser({
          ...membership,
          user: membership.user,
        }),
      ),
    );
  }
}

async function findMembershipByIdWithUser(organizationId: string, membershipId: string) {
  try {
    const row = (await prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            status: true,
            lastActiveAt: true,
            createdAt: true,
          },
        },
      },
    } as never)) as {
      id: string;
      userId: string;
      organizationId: string;
      role: string;
      user: LegacyUser;
    } | null;

    if (!row) {
      return null;
    }

    const [membership] = await applyAuditUserState(organizationId, [
      normalizeMembershipWithUser(row),
    ]);

    return membership ?? null;
  } catch {
    const row = await prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        },
      },
    });

    if (!row) {
      return null;
    }

    const [membership] = await applyAuditUserState(organizationId, [
      normalizeMembershipWithUser({
        ...row,
        user: row.user,
      }),
    ]);

    return membership ?? null;
  }
}

async function findMembershipByUserOrgWithUser(userId: string, organizationId: string) {
  try {
    const row = (await prisma.membership.findFirst({
      where: { userId, organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            status: true,
            lastActiveAt: true,
            createdAt: true,
          },
        },
      },
    } as never)) as {
      id: string;
      userId: string;
      organizationId: string;
      role: string;
      user: LegacyUser;
    } | null;

    if (!row) {
      return null;
    }

    const [membership] = await applyAuditUserState(organizationId, [
      normalizeMembershipWithUser(row),
    ]);

    return membership ?? null;
  } catch {
    const row = await prisma.membership.findFirst({
      where: { userId, organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        },
      },
    });

    if (!row) {
      return null;
    }

    const [membership] = await applyAuditUserState(organizationId, [
      normalizeMembershipWithUser({
        ...row,
        user: row.user,
      }),
    ]);

    return membership ?? null;
  }
}

async function updateUserStatusIfSupported(userId: string, status: UserStatus) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { status } as never,
    } as never);
  } catch {
    return;
  }
}

async function recordUserStatusAudit(
  organizationId: string,
  userId: string,
  status: UserStatus,
) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: userStatusAuditAction,
        entityType: getUserStatusEntityType(status),
        entityId: userId,
      },
    });
  } catch (error) {
    console.error("Unable to record user status audit", error);
  }
}

async function recordUserLastActiveAudit(
  organizationId: string,
  userId: string,
  occurredAt: Date,
) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action: userLastActiveAuditAction,
        entityType: "user-last-active",
        entityId: occurredAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Unable to record user activity audit", error);
  }
}

async function setUserStatus(
  userId: string,
  organizationId: string,
  status: UserStatus,
) {
  await updateUserStatusIfSupported(userId, status);
  await recordUserStatusAudit(organizationId, userId, status);
}

async function createUserWithInviteFallback(email: string, name: string) {
  try {
    return (await prisma.user.create({
      data: {
        email,
        name,
        status: "ACTIVE",
      } as never,
    } as never)) as unknown as UserWithStatus;
  } catch {
    const user = await prisma.user.create({
      data: {
        email,
        name,
      },
    });

    return normalizeUserWithStatus(user);
  }
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatRelativeTime(value: Date | null) {
  if (!value) {
    return "No recent activity";
  }

  const diffMs = value.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absMinutes < 60) {
    return rtf.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) {
    return rtf.format(diffDays, "day");
  }

  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, "month");
  }

  const diffYears = Math.round(diffDays / 365);
  return rtf.format(diffYears, "year");
}

function formatStatusLabel(status: UserStatus) {
  if (status === "DISABLED") {
    return "Disabled";
  }

  return "Active member";
}

function toMembershipRecord(
  membership: NonNullable<MembershipWithUser>,
  stats?: {
    contractsCreatedCount?: number;
    approvalsHandledCount?: number;
    latestContracts?: Array<{
      id: string;
      title: string;
      createdAt: Date;
    }>;
    latestApprovals?: Array<{
      id: string;
      contractTitle: string;
      status: string;
      createdAt: Date;
    }>;
  },
): MembershipRecord {
  return {
    id: membership.id,
    userId: membership.userId,
    name: membership.user.name || membership.user.email,
    email: membership.user.email,
    profileImageUrl: membership.user.image ?? null,
    role: membership.role as ContractRole,
    joinedAt: formatDateLabel(membership.user.createdAt),
    joinedAtValue: membership.user.createdAt.toISOString(),
    status: membership.user.status as UserStatus,
    statusLabel: formatStatusLabel(membership.user.status as UserStatus),
    lastActiveAt: membership.user.lastActiveAt?.toISOString() ?? null,
    lastActiveLabel: formatRelativeTime(membership.user.lastActiveAt),
    contractsCreatedCount: stats?.contractsCreatedCount ?? 0,
    approvalsHandledCount: stats?.approvalsHandledCount ?? 0,
    latestContracts: (stats?.latestContracts ?? []).map((contract) => ({
      id: contract.id,
      title: contract.title,
      createdAt: contract.createdAt.toISOString(),
    })),
    latestApprovals: (stats?.latestApprovals ?? []).map((approval) => ({
      id: approval.id,
      contractTitle: approval.contractTitle,
      status: approval.status,
      createdAt: approval.createdAt.toISOString(),
    })),
  };
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeOrganizationName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

const membershipAttachAuditAction = "MEMBERSHIP_ATTACHED_TO_TEAM";
const membershipOriginRolePrefix = "membership-origin-role:";

function getMembershipOriginRoleEntityType(role: ContractRole) {
  return `${membershipOriginRolePrefix}${role}`;
}

function parseMembershipOriginRole(entityType: string): ContractRole | null {
  if (!entityType.startsWith(membershipOriginRolePrefix)) {
    return null;
  }

  const role = entityType.slice(membershipOriginRolePrefix.length);

  return contractRoles.includes(role as ContractRole)
    ? (role as ContractRole)
    : null;
}

export async function markUserLastActive(userId: string) {
  const occurredAt = new Date();

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastActiveAt: occurredAt,
        status: "ACTIVE",
      } as never,
    } as never);
  } catch (error) {
    console.error("Unable to update user activity timestamp", error);
  }

  try {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      select: {
        organizationId: true,
      },
    });

    const organizationIds = Array.from(
      new Set(memberships.map((membership) => membership.organizationId)),
    );

    await Promise.all(
      organizationIds.map(async (organizationId) => {
        await recordUserStatusAudit(organizationId, userId, "ACTIVE");
        await recordUserLastActiveAudit(organizationId, userId, occurredAt);
      }),
    );
  } catch (error) {
    console.error("Unable to record user activity fallback state", error);
  }
}

async function mergeOrganizations(targetOrganizationId: string, sourceOrganizationIds: string[]) {
  if (sourceOrganizationIds.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const sourceMemberships = await tx.membership.findMany({
      where: {
        organizationId: {
          in: sourceOrganizationIds,
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    for (const membership of sourceMemberships) {
      const duplicateMembership = await tx.membership.findFirst({
        where: {
          userId: membership.userId,
          organizationId: targetOrganizationId,
        },
      });

      if (duplicateMembership) {
        await tx.membership.delete({
          where: { id: membership.id },
        });
        continue;
      }

      await tx.auditLog.create({
        data: {
          organizationId: membership.organizationId,
          userId: membership.userId,
          action: membershipAttachAuditAction,
          entityType: getMembershipOriginRoleEntityType(membership.role as ContractRole),
          entityId: targetOrganizationId,
        },
      });

      await tx.membership.update({
        where: { id: membership.id },
        data: {
          organizationId: targetOrganizationId,
        },
      });
    }
  });
}

export async function listMemberships(
  organizationId: string,
  currentUserId: string,
  role: ContractRole,
): Promise<MembershipsResponse> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!organization) {
    throw new Error("Organization not found.");
  }

  const memberships = await findMembershipsWithUsers(organizationId);

  const userIds = memberships.map((membership) => membership.userId);
  const [contractCounts, approvalCounts, recentContracts, recentApprovals] = await Promise.all([
    userIds.length
      ? prisma.contract.groupBy({
          by: ["createdBy"],
          where: {
            organizationId,
            createdBy: {
              in: userIds,
            },
          },
          _count: {
            _all: true,
          },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.approval.groupBy({
          by: ["userId"],
          where: {
            userId: {
              in: userIds,
            },
          },
          _count: {
            _all: true,
          },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.contract.findMany({
          where: {
            organizationId,
            createdBy: {
              in: userIds,
            },
          },
          select: {
            id: true,
            title: true,
            createdBy: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.approval.findMany({
          where: {
            userId: {
              in: userIds,
            },
          },
          select: {
            id: true,
            userId: true,
            status: true,
            createdAt: true,
            contract: {
              select: {
                title: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        })
      : Promise.resolve([]),
  ]);

  const contractCountMap = new Map(contractCounts.map((item) => [item.createdBy, item._count._all]));
  const approvalCountMap = new Map(approvalCounts.map((item) => [item.userId, item._count._all]));
  const latestContractsMap = new Map<string, Array<{ id: string; title: string; createdAt: Date }>>();
  const latestApprovalsMap = new Map<string, Array<{ id: string; contractTitle: string; status: string; createdAt: Date }>>();

  for (const contract of recentContracts) {
    const current = latestContractsMap.get(contract.createdBy) ?? [];

    if (current.length < 2) {
      current.push({
        id: contract.id,
        title: contract.title,
        createdAt: contract.createdAt,
      });
      latestContractsMap.set(contract.createdBy, current);
    }
  }

  for (const approval of recentApprovals) {
    const current = latestApprovalsMap.get(approval.userId) ?? [];

    if (current.length < 2) {
      current.push({
        id: approval.id,
        contractTitle: approval.contract.title,
        status: approval.status,
        createdAt: approval.createdAt,
      });
      latestApprovalsMap.set(approval.userId, current);
    }
  }

  return {
    items: memberships.map((membership) =>
      toMembershipRecord(membership, {
        contractsCreatedCount: contractCountMap.get(membership.userId) ?? 0,
        approvalsHandledCount: approvalCountMap.get(membership.userId) ?? 0,
        latestContracts: latestContractsMap.get(membership.userId) ?? [],
        latestApprovals: latestApprovalsMap.get(membership.userId) ?? [],
      }),
    ),
    currentUserId,
    permissions: {
      canManage: role === "ADMIN",
    },
    organization,
  };
}

export async function createMembership(
  organizationId: string,
  payload: CreateMembershipPayload,
  actorId?: string,
) {
  const email = payload.email.trim().toLowerCase();
  const name = payload.name.trim();
  const role = payload.role;

  if (!email || !name) {
    throw new Error("Name and email are required.");
  }

  if (!emailPattern.test(email)) {
    throw new Error("Please enter a valid email address.");
  }

  if (!contractRoles.includes(role)) {
    throw new Error("Please select a valid role.");
  }

  const existingUser = (await prisma.user.findUnique({
    where: { email },
  })) as unknown as LegacyUser | null;

  const user = existingUser
    ? normalizeUserWithStatus(existingUser)
    : await createUserWithInviteFallback(email, name);

  if (
    user.name &&
    normalizeName(user.name) !== normalizeName(name)
  ) {
    throw new Error("Entered name does not match the existing user for this email.");
  }

  const existingMemberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  const sameOrganizationMembership = existingMemberships.find(
    (membership) => membership.organizationId === organizationId,
  );

  if (sameOrganizationMembership) {
    throw new Error("This user is already a member of your organization.");
  }

  if (existingMemberships.length > 0) {
    const targetOrganization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!targetOrganization) {
      throw new Error("Organization not found.");
    }

    const targetOrganizationName = normalizeOrganizationName(targetOrganization.name);
    const organizationsMatch = existingMemberships.every(
      (membership) =>
        normalizeOrganizationName(membership.organization.name) === targetOrganizationName,
    );

    if (!organizationsMatch) {
      throw new Error("This user already belongs to a different organization.");
    }

    const sourceOrganizationIds = Array.from(
      new Set(existingMemberships.map((membership) => membership.organizationId)),
    ).filter((id) => id !== organizationId);

    const existingRole = existingMemberships[0]?.role as ContractRole | undefined;

    if (existingRole && existingRole !== role) {
      throw new Error(
        `This user already exists with the ${existingRole} role. Use the same role while attaching, then change it separately if needed.`,
      );
    }

    await mergeOrganizations(organizationId, sourceOrganizationIds);

    const mergedMembership = await findMembershipByUserOrgWithUser(user.id, organizationId);

    if (!mergedMembership) {
      throw new Error("Unable to synchronize organization members.");
    }

    await setUserStatus(user.id, organizationId, "ACTIVE");

    if (actorId) {
      await markUserLastActive(actorId);
    }

    return listMembershipById(organizationId, mergedMembership.id);
  }

  const membership = await prisma.membership.create({
    data: {
      organizationId,
      userId: user.id,
      role,
    },
  });

  await setUserStatus(user.id, organizationId, "ACTIVE");

  if (actorId) {
    await markUserLastActive(actorId);
  }

  return listMembershipById(organizationId, membership.id);
}

export async function updateMembershipRole(
  organizationId: string,
  membershipId: string,
  role: ContractRole,
  actorId?: string,
) {
  if (!contractRoles.includes(role)) {
    throw new Error("Please select a valid role.");
  }

  const membership = await findMembershipByIdWithUser(organizationId, membershipId);

  if (!membership) {
    throw new Error("Member not found.");
  }

  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data: { role },
  });

  if (actorId) {
    await markUserLastActive(actorId);
  }

  return listMembershipById(organizationId, updated.id);
}

async function listMembershipById(organizationId: string, membershipId: string) {
  const membership = await findMembershipByIdWithUser(organizationId, membershipId);

  if (!membership) {
    throw new Error("Member not found.");
  }

  const [contractsCreatedCount, approvalsHandledCount, latestContracts, latestApprovals] = await Promise.all([
    prisma.contract.count({
      where: {
        organizationId,
        createdBy: membership.userId,
      },
    }),
    prisma.approval.count({
      where: {
        userId: membership.userId,
      },
    }),
    prisma.contract.findMany({
      where: {
        organizationId,
        createdBy: membership.userId,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 2,
    }),
    prisma.approval.findMany({
      where: {
        userId: membership.userId,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        contract: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 2,
    }),
  ]);

  return toMembershipRecord(membership, {
    contractsCreatedCount,
    approvalsHandledCount,
    latestContracts,
    latestApprovals: latestApprovals.map((approval) => ({
      id: approval.id,
      contractTitle: approval.contract.title,
      status: approval.status,
      createdAt: approval.createdAt,
    })),
  });
}

export async function updateMembershipUser(
  organizationId: string,
  membershipId: string,
  payload: UpdateMembershipPayload,
  actorId?: string,
) {
  const membership = await findMembershipByIdWithUser(organizationId, membershipId);

  if (!membership) {
    throw new Error("Member not found.");
  }

  if (payload.role && !contractRoles.includes(payload.role)) {
    throw new Error("Please select a valid role.");
  }

  if (payload.role) {
    await prisma.membership.update({
      where: { id: membershipId },
      data: { role: payload.role },
    });
  }

  if (payload.status) {
    await setUserStatus(membership.userId, organizationId, payload.status);
  }

  if (actorId) {
    await markUserLastActive(actorId);
  }

  return listMembershipById(organizationId, membershipId);
}

export async function deleteMembership(
  organizationId: string,
  membershipId: string,
  currentUserId: string,
  actorId?: string,
) {
  const membership = (await prisma.membership.findFirst({
    where: {
      id: membershipId,
      organizationId,
    },
    include: {
      organization: {
        select: {
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  } as never)) as unknown as MembershipWithUser | null;

  if (!membership) {
    throw new Error("Member not found.");
  }

  if (membership.userId === currentUserId) {
    throw new Error("You cannot remove yourself from the organization.");
  }

  await prisma.$transaction(async (tx) => {
    const previousTeamAttachment = await tx.auditLog.findFirst({
      where: {
        userId: membership.userId,
        action: membershipAttachAuditAction,
        entityId: organizationId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    await tx.membership.delete({
      where: { id: membershipId },
    });

    const remainingMembership = await tx.membership.findFirst({
      where: {
        userId: membership.userId,
      },
    });

    if (remainingMembership) {
      return;
    }

    const previousRole =
      (previousTeamAttachment
        ? parseMembershipOriginRole(previousTeamAttachment.entityType)
        : null) ?? (membership.role as ContractRole);

    if (previousTeamAttachment) {
      const previousOrganization = await tx.organization.findUnique({
        where: { id: previousTeamAttachment.organizationId },
        select: { id: true },
      });

      if (previousOrganization) {
        await tx.membership.create({
          data: {
            userId: membership.userId,
            organizationId: previousOrganization.id,
            role: previousRole,
          },
        });

        return;
      }
    }

    const fallbackOrganization = await tx.organization.create({
      data: {
        name: membership.organization?.name || `${membership.user.name || membership.user.email}'s Workspace`,
      },
    });

    await tx.membership.create({
      data: {
        userId: membership.userId,
        organizationId: fallbackOrganization.id,
        role: previousRole,
      },
    });
  });

  if (actorId) {
    await markUserLastActive(actorId);
  }
}

export async function getEffectiveUserStatusForOrganization(
  userId: string,
  organizationId: string,
  fallbackStatus: UserStatus = "ACTIVE",
) {
  try {
    const user = (await prisma.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
      },
    } as never)) as { status?: UserStatus | null } | null;

    if (user?.status) {
      return user.status;
    }
  } catch {
    // Fall back to audit-derived state when runtime Prisma metadata is behind schema.
  }

  const stateMap = await getUserStateAuditMap(organizationId, [userId]);
  const auditStatus = stateMap.get(userId)?.status;

  if (auditStatus) {
    return auditStatus;
  }

  return fallbackStatus;
}
