import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { changeOrganization } from "@/lib/settings/service";

export async function POST(request: Request) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string };

  try {
    const result = await changeOrganization(context.userId, context.organizationId, {
      name: body.name ?? "",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to change organization." },
      { status: 400 },
    );
  }
}
