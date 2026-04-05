import { NextResponse } from "next/server";

import { canManageMemberships, getContractAccessContext } from "@/lib/contracts/access";
import { deleteMembership, updateMembershipUser } from "@/lib/memberships/service";
import type { UpdateMembershipPayload } from "@/lib/memberships/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageMemberships(context.role)) {
    return NextResponse.json({ error: "Only admins can update users." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as UpdateMembershipPayload;

  try {
    const membership = await updateMembershipUser(
      context.organizationId,
      id,
      body,
      context.userId,
    );
    return NextResponse.json(membership);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update user." },
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
    return NextResponse.json({ error: "Only admins can remove users." }, { status: 403 });
  }

  const { id } = await params;

  try {
    await deleteMembership(context.organizationId, id, context.userId, context.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove user." },
      { status: 400 },
    );
  }
}
