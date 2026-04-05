import { NextResponse } from "next/server";

import { isPrismaUniqueConstraintError } from "@/lib/auth";
import { contractRoles, type ContractRole } from "@/lib/contracts/types";
import { hashPassword } from "@/lib/password";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      organizationName?: string;
      role?: ContractRole;
      password?: string;
    };

    const name = body.name?.trim();
    const organizationName = body.organizationName?.trim();
    const role = body.role || "ADMIN";
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    if (!name || !organizationName || !email || !password) {
      return NextResponse.json(
        { error: "Name, organization, email, and password are required." },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    if (!contractRoles.includes(role)) {
      return NextResponse.json(
        { error: "Please select a valid role." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const passwordHash = hashPassword(password);

    if (existingUser) {
      if (existingUser.password) {
        return NextResponse.json(
          { error: "An account already exists for that email." },
          { status: 409 },
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            password: passwordHash,
          },
        });

        const existingMembership = await tx.membership.findFirst({
          where: { userId: existingUser.id },
        });

        if (!existingMembership) {
          const organization = await tx.organization.create({
            data: {
              name: organizationName,
            },
          });

          await tx.membership.create({
            data: {
              userId: existingUser.id,
              organizationId: organization.id,
              role,
            },
          });
        }
      });

      return NextResponse.json(
        {
          success: true,
          acceptedInvite: false,
          organizationName,
        },
        { status: 201 },
      );
    }

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: passwordHash,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: organizationName!,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role,
        },
      });
    });

    return NextResponse.json({ success: true, acceptedInvite: false }, { status: 201 });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "An account already exists for that email." },
        { status: 409 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unable to create your account right now." },
      { status: 500 },
    );
  }
}
