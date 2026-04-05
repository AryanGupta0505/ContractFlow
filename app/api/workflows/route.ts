import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { createWorkflow, listWorkflows } from "@/lib/workflows/service";
import type { WorkflowPayload } from "@/lib/workflows/types";

export async function GET() {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await listWorkflows(context.organizationId, context.role);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (context.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can create workflows." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as WorkflowPayload;

  try {
    const workflow = await createWorkflow({
      organizationId: context.organizationId,
      actorId: context.userId,
      payload: body,
    });
    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create workflow." },
      { status: 400 },
    );
  }
}
