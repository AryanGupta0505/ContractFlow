import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { leaveWorkspace } from "@/lib/settings/service";

export async function POST() {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await leaveWorkspace(context.userId, context.organizationId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to leave workspace." },
      { status: 400 },
    );
  }
}
