import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { listMemberships } from "@/lib/memberships/service";

export async function GET() {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await listMemberships(context.organizationId, context.userId, context.role);
  return NextResponse.json(result);
}

export async function POST() {
  return NextResponse.json(
    { error: "Use /api/users/invite to invite a user." },
    { status: 405 },
  );
}
