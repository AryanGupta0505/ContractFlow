import { NextResponse } from "next/server";

import { canManageMemberships, getContractAccessContext } from "@/lib/contracts/access";
import { deleteMembership, updateMembershipRole } from "@/lib/memberships/service";
import type { ContractRole } from "@/lib/contracts/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageMemberships(context.role)) {
    return NextResponse.json({ error: "Only admins can update roles." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { role?: ContractRole };

  try {
    const membership = await updateMembershipRole(
      context.organizationId,
      id,
      body.role || "EMPLOYEE",
    );
    return NextResponse.json(membership);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update member." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageMemberships(context.role)) {
    return NextResponse.json({ error: "Only admins can remove members." }, { status: 403 });
  }

  const { id } = await params;

  try {
    await deleteMembership(context.organizationId, id, context.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove member." },
      { status: 400 },
    );
  }
}
