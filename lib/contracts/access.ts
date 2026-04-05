import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getEffectiveUserStatusForOrganization } from "@/lib/memberships/service";
import prisma from "@/lib/prisma";

import type { ContractPermissions, ContractRole } from "@/lib/contracts/types";

export function getContractPermissions(role: ContractRole): ContractPermissions {
  return {
    canCreate: true,
    canEdit: role === "ADMIN" || role === "MANAGER",
    canSendForApproval: role === "ADMIN" || role === "MANAGER",
    canApprove: true,
    canArchive: role === "ADMIN" || role === "MANAGER",
    canDelete: role === "ADMIN",
    canAssignWorkflow: role === "ADMIN" || role === "MANAGER",
  };
}

export function canManageMemberships(role: ContractRole) {
  return role === "ADMIN";
}

export async function getContractAccessContext() {
  const session = await getServerSession(authOptions);
  const prismaDb = prisma as unknown as {
    membership: {
      findFirst: (args: unknown) => Promise<{
        userId: string;
        organizationId: string;
        role: string;
        organization: { name: string };
        user: { name?: string | null; email: string };
      } | null>;
    };
  };

  if (!session?.user?.id) {
    return null;
  }

  const membership =
    (session.user.organizationId
      ? await prismaDb.membership.findFirst({
          where: {
            userId: session.user.id,
            organizationId: session.user.organizationId,
          },
          select: {
            userId: true,
            organizationId: true,
            role: true,
            organization: {
              select: {
                name: true,
              },
            },
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        })
      : null) ??
    (await prismaDb.membership.findFirst({
      where: {
        userId: session.user.id,
      },
      select: {
        userId: true,
        organizationId: true,
        role: true,
        organization: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    }));

  if (!membership) {
    return null;
  }

  const effectiveStatus = await getEffectiveUserStatusForOrganization(
    membership.userId,
    membership.organizationId,
    "ACTIVE",
  );

  if (effectiveStatus === "DISABLED") {
    return null;
  }

  const role = membership.role as ContractRole;

  return {
    userId: membership.userId,
    userName: membership.user.name || membership.user.email,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    role,
    permissions: getContractPermissions(role),
  };
}
