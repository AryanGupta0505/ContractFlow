import { Prisma } from "@prisma/client";

import { hashPassword, verifyPassword } from "@/lib/password";
import prisma from "@/lib/prisma";

import type {
  SettingsResponse,
  ThemePreference,
  UpdatePreferencesInput,
  UpdateProfileInput,
  UpdateSecurityInput,
  UserPreferences,
} from "@/lib/settings/types";

type MembershipSummary = {
  id: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  organization: {
    id: string;
    name: string;
  };
};

const validThemes = new Set<ThemePreference>(["LIGHT", "DARK", "SYSTEM"]);
const deletedEmailDomain = "deleted.contractflow.local";
let cachedUserSettingsColumns: { avatarUrl: boolean; preferences: boolean } | null = null;

async function getUserSettingsColumns() {
  if (cachedUserSettingsColumns) {
    return cachedUserSettingsColumns;
  }

  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>(Prisma.sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'User'
      AND column_name IN ('avatarUrl', 'preferences')
  `);

  cachedUserSettingsColumns = {
    avatarUrl: columns.some((column) => column.column_name === "avatarUrl"),
    preferences: columns.some((column) => column.column_name === "preferences"),
  };

  return cachedUserSettingsColumns;
}

async function loadUserSettingsExtras(userId: string) {
  const columns = await getUserSettingsColumns();

  if (!columns.avatarUrl && !columns.preferences) {
    return {
      avatarUrl: null as string | null,
      preferences: null as Prisma.JsonValue | null,
    };
  }

  const result = await prisma.$queryRaw<
    Array<{ avatarUrl: string | null; preferences: Prisma.JsonValue | null }>
  >(Prisma.sql`
    SELECT
      ${columns.avatarUrl ? Prisma.sql`"avatarUrl"` : Prisma.sql`NULL::text`} AS "avatarUrl",
      ${columns.preferences ? Prisma.sql`preferences` : Prisma.sql`NULL::jsonb`} AS preferences
    FROM "User"
    WHERE id = ${userId}
    LIMIT 1
  `);

  return (
    result[0] ?? {
      avatarUrl: null,
      preferences: null,
    }
  );
}

async function persistAvatarUrl(userId: string, avatarUrl: string | null) {
  const columns = await getUserSettingsColumns();

  if (!columns.avatarUrl) {
    return;
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "User"
    SET "avatarUrl" = ${avatarUrl}
    WHERE id = ${userId}
  `);
}

async function persistPreferences(userId: string, preferences: UserPreferences) {
  const columns = await getUserSettingsColumns();

  if (!columns.preferences) {
    return;
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "User"
    SET preferences = ${JSON.stringify(preferences)}::jsonb
    WHERE id = ${userId}
  `);
}

async function clearOptionalUserSettings(userId: string) {
  const columns = await getUserSettingsColumns();

  if (!columns.avatarUrl && !columns.preferences) {
    return;
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "User"
    SET
      ${columns.avatarUrl ? Prisma.sql`"avatarUrl" = NULL,` : Prisma.sql``}
      ${columns.preferences ? Prisma.sql`preferences = NULL` : Prisma.sql`id = id`}
    WHERE id = ${userId}
  `);
}

function normalizePreferences(rawPreferences: Prisma.JsonValue | null | undefined): UserPreferences {
  if (!rawPreferences || typeof rawPreferences !== "object" || Array.isArray(rawPreferences)) {
    return { theme: "LIGHT" };
  }

  const theme = rawPreferences.theme;
  return {
    theme:
      typeof theme === "string" && validThemes.has(theme as ThemePreference)
        ? (theme as ThemePreference)
        : "LIGHT",
  };
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePasswordRequirements(password: string) {
  return password.trim().length >= 8;
}

async function getMembershipContext(userId: string, organizationId: string) {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      organizationId,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!membership) {
    throw new Error("Workspace membership not found.");
  }

  return membership as MembershipSummary;
}

async function ensureWorkspaceCanLoseMember(input: {
  userId: string;
  organizationId: string;
}) {
  const memberships = await prisma.membership.findMany({
    where: {
      organizationId: input.organizationId,
    },
    select: {
      userId: true,
      role: true,
    },
  });

  const admins = memberships.filter((membership) => membership.role === "ADMIN");
  const isOnlyAdmin =
    admins.length === 1 &&
    admins[0]?.userId === input.userId &&
    memberships.some((membership) => membership.userId !== input.userId);

  if (isOnlyAdmin) {
    throw new Error("Assign another admin before leaving or deleting this account.");
  }
}

async function canUserLeaveWorkspace(userId: string, organizationId: string) {
  try {
    await ensureWorkspaceCanLoseMember({ userId, organizationId });
    return true;
  } catch {
    return false;
  }
}

async function canUserDeleteAccount(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
    },
    select: {
      organizationId: true,
    },
  });

  for (const membership of memberships) {
    const canLeave = await canUserLeaveWorkspace(userId, membership.organizationId);

    if (!canLeave) {
      return false;
    }
  }

  return true;
}

export async function getSettings(userId: string, organizationId: string): Promise<SettingsResponse> {
  const [user, extras, membership, canLeaveCurrentWorkspace, canDeleteAccountFlag] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        password: true,
      },
    }),
    loadUserSettingsExtras(userId),
    getMembershipContext(userId, organizationId),
    canUserLeaveWorkspace(userId, organizationId),
    canUserDeleteAccount(userId),
  ]);

  if (!user) {
    throw new Error("User not found.");
  }

  return {
    profile: {
      id: user.id,
      name: user.name || "",
      email: user.email,
      avatarUrl: extras.avatarUrl || user.image || null,
    },
    security: {
      hasPassword: Boolean(user.password),
    },
    preferences: normalizePreferences(extras.preferences),
    account: {
      workspaceName: membership.organization.name,
      workspaceRole: membership.role,
      canLeaveWorkspace: canLeaveCurrentWorkspace,
      canDeleteAccount: canDeleteAccountFlag,
    },
  };
}

export async function updateProfileSettings(
  userId: string,
  input: UpdateProfileInput,
) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const avatarUrl =
    typeof input.avatarUrl === "string" ? input.avatarUrl.trim() || null : null;

  if (name.length < 2) {
    throw new Error("Name must be at least 2 characters long.");
  }

  if (!validateEmail(email)) {
    throw new Error("Enter a valid email address.");
  }

  try {
    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name,
        email,
        image: avatarUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    await persistAvatarUrl(userId, avatarUrl);

    return {
      id: user.id,
      name: user.name || "",
      email: user.email,
      avatarUrl: avatarUrl || user.image || null,
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new Error("That email address is already in use.");
    }

    throw error;
  }
}

export async function updateSecuritySettings(
  userId: string,
  input: UpdateSecurityInput,
) {
  const newPassword = input.newPassword.trim();

  if (!validatePasswordRequirements(newPassword)) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      password: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.password) {
    const currentPassword = input.currentPassword?.trim() || "";

    if (!currentPassword) {
      throw new Error("Current password is required.");
    }

    if (!verifyPassword(currentPassword, user.password)) {
      throw new Error("Current password is incorrect.");
    }

    if (verifyPassword(newPassword, user.password)) {
      throw new Error("Choose a different password.");
    }
  }

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      password: hashPassword(newPassword),
    },
  });

  return { success: true as const };
}

export async function updatePreferenceSettings(
  userId: string,
  input: UpdatePreferencesInput,
) {
  if (!validThemes.has(input.theme)) {
    throw new Error("Invalid theme preference.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const currentSettings = await loadUserSettingsExtras(userId);
  const preferences = {
    ...normalizePreferences(currentSettings.preferences),
    theme: input.theme,
  } satisfies UserPreferences;

  await persistPreferences(userId, preferences);

  return preferences;
}

export async function leaveWorkspace(userId: string, organizationId: string) {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!membership) {
    throw new Error("Workspace membership not found.");
  }

  await ensureWorkspaceCanLoseMember({ userId, organizationId });

  const otherMemberships = await prisma.membership.findMany({
    where: {
      userId,
      NOT: {
        organizationId,
      },
    },
    select: {
      id: true,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.membership.delete({
      where: {
        id: membership.id,
      },
    });

    if (otherMemberships.length > 0) {
      return;
    }

    const fallbackOrganization = await tx.organization.create({
      data: {
        name: "Personal Workspace",
      },
      select: {
        id: true,
      },
    });

    await tx.membership.create({
      data: {
        userId,
        organizationId: fallbackOrganization.id,
        role: "ADMIN",
      },
    });
  });

  return { success: true as const };
}

export async function changeOrganization(
  userId: string,
  currentOrganizationId: string,
  input: { name: string },
) {
  const organizationName = input.name.trim().replace(/\s+/g, " ");

  if (organizationName.length < 2) {
    throw new Error("Organization name must be at least 2 characters long.");
  }

  const currentMembership = await prisma.membership.findFirst({
    where: {
      userId,
      organizationId: currentOrganizationId,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!currentMembership) {
    throw new Error("Workspace membership not found.");
  }

  if (
    currentMembership.organization.name.trim().toLowerCase() ===
    organizationName.toLowerCase()
  ) {
    throw new Error("Enter a different organization name to continue.");
  }

  await ensureWorkspaceCanLoseMember({
    userId,
    organizationId: currentOrganizationId,
  });

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: organizationName,
      },
      select: {
        id: true,
        name: true,
      },
    });

    await tx.membership.delete({
      where: {
        id: currentMembership.id,
      },
    });

    await tx.membership.create({
      data: {
        userId,
        organizationId: organization.id,
        role: currentMembership.role,
      },
    });

    return organization;
  });

  return {
    success: true as const,
    organization: result,
  };
}

export async function deleteAccountSettings(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      organizationId: true,
    },
  });

  for (const membership of memberships) {
    await ensureWorkspaceCanLoseMember({
      userId,
      organizationId: membership.organizationId,
    });
  }

  const deletedEmail = `deleted-${Date.now()}-${userId}@${deletedEmailDomain}`;

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({
      where: {
        userId,
      },
    });

    await tx.account.deleteMany({
      where: {
        userId,
      },
    });

    await tx.membership.deleteMany({
      where: {
        userId,
      },
    });

    await tx.user.update({
      where: {
        id: userId,
      },
      data: {
        email: deletedEmail,
        name: "Deleted User",
        password: null,
        image: null,
        status: "DISABLED",
      },
    });
  });

  await clearOptionalUserSettings(userId);

  return { success: true as const };
}
