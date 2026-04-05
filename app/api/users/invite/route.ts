import { NextResponse } from "next/server";

import { canManageMemberships, getContractAccessContext } from "@/lib/contracts/access";
import { createMembership } from "@/lib/memberships/service";
import type { CreateMembershipPayload } from "@/lib/memberships/types";

export async function POST(request: Request) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageMemberships(context.role)) {
    return NextResponse.json({ error: "Only admins can add users." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as CreateMembershipPayload;

  try {
    const membership = await createMembership(context.organizationId, body, context.userId);
    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to add user." },
      { status: 400 },
    );
  }
}
