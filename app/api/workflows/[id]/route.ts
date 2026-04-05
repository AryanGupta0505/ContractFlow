import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { deleteWorkflow, updateWorkflow } from "@/lib/workflows/service";
import type { WorkflowPayload } from "@/lib/workflows/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (context.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can edit workflows." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as WorkflowPayload;

  try {
    const workflow = await updateWorkflow({
      organizationId: context.organizationId,
      workflowId: id,
      actorId: context.userId,
      payload: body,
    });
    return NextResponse.json(workflow);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update workflow." },
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

  if (!context.permissions.canDelete) {
    return NextResponse.json({ error: "Only admins can delete workflows." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await deleteWorkflow({
      organizationId: context.organizationId,
      workflowId: id,
      actorId: context.userId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete workflow." },
      { status: 400 },
    );
  }
}
