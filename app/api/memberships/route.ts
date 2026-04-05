import { NextResponse } from "next/server";

import { canManageMemberships, getContractAccessContext } from "@/lib/contracts/access";
import { createMembership, listMemberships } from "@/lib/memberships/service";
import type { CreateMembershipPayload } from "@/lib/memberships/types";

export async function GET() {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await listMemberships(
    context.organizationId,
    context.userId,
    context.role,
  );

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageMemberships(context.role)) {
    return NextResponse.json({ error: "Only admins can manage membership." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as CreateMembershipPayload;

  try {
    const membership = await createMembership(context.organizationId, body);
    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to add member." },
      { status: 400 },
    );
  }
}
