import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import {
  getEffectiveUserStatusForOrganization,
  markUserLastActive,
} from "@/lib/memberships/service";

const authSecret =
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV !== "production"
    ? "contractflow-dev-secret-change-this-before-production"
    : undefined);

type OAuthUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  organizationId?: string;
  organizationName?: string;
  role?: "ADMIN" | "MANAGER" | "EMPLOYEE";
};

const noOrganizationAccessMessage =
  "Your organization access has been removed. Contact an admin to be added again.";

const stableUserAuthSelect = {
  id: true,
  email: true,
  name: true,
  image: true,
  password: true,
} as const;

function normalizeSessionImage(image: string | null | undefined) {
  if (!image) {
    return null;
  }

  const trimmed = image.trim();

  if (!trimmed) {
    return null;
  }

  // Avoid storing large data URLs or oversized image payloads in the JWT cookie.
  if (trimmed.startsWith("data:") || trimmed.length > 2048) {
    return null;
  }

  return trimmed;
}

async function updateUserAuthActivity(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: "ACTIVE",
        lastActiveAt: new Date(),
      } as never,
      select: {
        id: true,
      },
    } as never);
    return;
  } catch {
    await prisma.user.update({
      where: { id: userId },
      data: {},
      select: {
        id: true,
      },
    });
  }
}

async function createOAuthUser(email: string, name: string, image?: string | null) {
  try {
    return await prisma.user.create({
      data: {
        email,
        name,
        image: image ?? undefined,
        emailVerified: new Date(),
        status: "ACTIVE",
        lastActiveAt: new Date(),
      } as never,
      select: stableUserAuthSelect,
    } as never);
  } catch {
    try {
      return await prisma.user.create({
        data: {
          email,
          name,
          image: image ?? undefined,
          emailVerified: new Date(),
        } as never,
        select: stableUserAuthSelect,
      } as never);
    } catch {
      return await prisma.user.create({
        data: {
          email,
          name,
          image: image ?? undefined,
        },
        select: stableUserAuthSelect,
      });
    }
  }
}

async function updateOAuthProfile(
  userId: string,
  data: { name?: string | null; image?: string | null; emailVerified?: Date | null },
) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name ?? undefined,
        image: data.image ?? undefined,
        emailVerified: data.emailVerified ?? undefined,
        status: "ACTIVE",
        lastActiveAt: new Date(),
      } as never,
      select: {
        id: true,
      },
    } as never);
    return;
  } catch {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name ?? undefined,
          image: data.image ?? undefined,
          emailVerified: data.emailVerified ?? undefined,
        } as never,
        select: {
          id: true,
        },
      } as never);
      return;
    } catch {
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name ?? undefined,
          image: data.image ?? undefined,
        },
        select: {
          id: true,
        },
      });
    }
  }
}

export const oauthProviderMeta = [
  {
    id: "google",
    label: "Continue with Google",
    enabled: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    ),
  },
  {
    id: "github",
    label: "Continue with GitHub",
    enabled: Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET),
  },
];

export const enabledOAuthProviders = oauthProviderMeta.filter(
  (provider) => provider.enabled,
).map((provider) => ({
  id: provider.id,
  label: provider.label,
}));

async function getPrimaryMembership(userId: string, preferredOrganizationId?: string) {
  const prismaDb = prisma as unknown as {
    membership: {
      findFirst: (args: unknown) => Promise<{
        organizationId: string;
        role: "ADMIN" | "MANAGER" | "EMPLOYEE";
        organization: { name: string };
      } | null>;
    };
  };
  const membership =
    (preferredOrganizationId
      ? await prismaDb.membership.findFirst({
          where: {
            userId,
            organizationId: preferredOrganizationId,
          },
          select: {
            organizationId: true,
            role: true,
            organization: {
              select: {
                name: true,
              },
            },
          },
        })
      : null) ??
    (await prismaDb.membership.findFirst({
      where: { userId },
      select: {
        organizationId: true,
        role: true,
        organization: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    }));

  return membership;
}

function getOAuthProviders() {
  const providers = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
    );
  }

  if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
    providers.push(
      GitHubProvider({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
      }),
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          throw new Error("Please enter your email and password.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: stableUserAuthSelect,
        });

        if (!user?.password) {
          throw new Error("No credentials account exists for this email.");
        }

        const isValid = verifyPassword(password, user.password);

        if (!isValid) {
          throw new Error("Incorrect email or password.");
        }

        const membership = await getPrimaryMembership(user.id);

        if (!membership) {
          throw new Error(noOrganizationAccessMessage);
        }

        const effectiveStatus = await getEffectiveUserStatusForOrganization(
          user.id,
          membership.organizationId,
          "ACTIVE",
        );

        if (effectiveStatus === "DISABLED") {
          throw new Error("This account has been disabled. Contact an admin.");
        }

        await markUserLastActive(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: normalizeSessionImage(user.image),
          organizationId: membership?.organizationId,
          organizationName: membership?.organization.name,
          role: membership?.role,
        };
      },
    }),
    ...getOAuthProviders(),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") {
        return true;
      }

      const oauthUser = user as OAuthUser;
      const email = oauthUser.email?.trim().toLowerCase();

      if (!email) {
        return false;
      }

      const accountWhere = {
        provider_providerAccountId: {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
      } as const;

      const existingAccount = await prisma.account.findUnique({
        where: accountWhere,
        include: {
          user: {
            select: stableUserAuthSelect,
          },
        },
      });

      if (existingAccount) {
        const membership = await getPrimaryMembership(existingAccount.userId);

        if (!membership) {
          return false;
        }

        const effectiveStatus = await getEffectiveUserStatusForOrganization(
          existingAccount.userId,
          membership.organizationId,
          "ACTIVE",
        );

        if (effectiveStatus === "DISABLED") {
          return false;
        }

        await updateUserAuthActivity(existingAccount.userId);

        oauthUser.id = existingAccount.userId;
        oauthUser.name = existingAccount.user.name;
        oauthUser.image = normalizeSessionImage(existingAccount.user.image);
        oauthUser.organizationId = membership.organizationId;
        oauthUser.organizationName = membership.organization.name;
        oauthUser.role = membership.role;
        return true;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: stableUserAuthSelect,
      });

      const dbUser =
        existingUser ??
        (await createOAuthUser(
          email,
          oauthUser.name ?? email.split("@")[0],
          oauthUser.image ?? undefined,
        ));

      const membership =
        (await getPrimaryMembership(dbUser.id)) ??
        (await prisma.$transaction(async (tx) => {
          const organization = await tx.organization.create({
            data: {
              name: `${dbUser.name || email.split("@")[0]}'s Workspace`,
            },
          });

          return tx.membership.create({
            data: {
              userId: dbUser.id,
              organizationId: organization.id,
              role: "ADMIN",
            },
            include: {
              organization: true,
            },
          });
        }));

      await prisma.account.create({
        data: {
          userId: dbUser.id,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state:
            typeof account.session_state === "string"
              ? account.session_state
              : null,
        },
      });

      if (!existingUser || !existingUser.image || !existingUser.name) {
        await updateOAuthProfile(dbUser.id, {
          name: existingUser?.name ?? oauthUser.name ?? dbUser.name,
          image: existingUser?.image ?? oauthUser.image ?? undefined,
          emailVerified: new Date(),
        });
      } else {
        await updateUserAuthActivity(dbUser.id);
      }

      oauthUser.id = dbUser.id;
      oauthUser.name = dbUser.name;
      oauthUser.image = normalizeSessionImage(dbUser.image);
      oauthUser.organizationId = membership.organizationId;
      oauthUser.organizationName = membership.organization.name;
      oauthUser.role = membership.role;

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.picture = normalizeSessionImage(user.image);
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.role = user.role;
      }

      if (token.id) {
        const membership = await getPrimaryMembership(
          token.id as string,
          token.organizationId as string | undefined,
        );

        token.organizationId = membership?.organizationId;
        token.organizationName = membership?.organization.name;
        token.role = membership?.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.image = token.picture as string | null | undefined;
        session.user.organizationId = token.organizationId as string | undefined;
        session.user.organizationName = token.organizationName as string | undefined;
        session.user.role = token.role as "ADMIN" | "MANAGER" | "EMPLOYEE" | undefined;
      }

      return session;
    },
  },
};

export function isPrismaUniqueConstraintError(
  error: unknown,
): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}
