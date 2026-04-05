import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { removeContract, updateContractRecord } from "@/lib/contracts/service";
import type { UpdateContractInput } from "@/lib/contracts/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!context.permissions.canEdit) {
    return NextResponse.json(
      { error: "You do not have permission to update contracts." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Partial<UpdateContractInput>;

  try {
    if (body.workflowId && !context.permissions.canAssignWorkflow) {
      return NextResponse.json(
        { error: "You do not have permission to assign workflows to contracts." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const contract = await updateContractRecord({
      organizationId: context.organizationId,
      id,
      data: {
        title: body.title || "",
        content: body.content || "",
        contentJson: body.contentJson,
        summary: body.summary || "",
        workflowId: context.permissions.canAssignWorkflow ? body.workflowId || "" : "",
        fileUrl: body.fileUrl || "",
        parties: Array.isArray(body.parties) ? body.parties : [],
        metadata: Array.isArray(body.metadata) ? body.metadata : [],
      },
    });

    return NextResponse.json(contract);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update contract.",
      },
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
    return NextResponse.json({ error: "You do not have permission to delete contracts." }, { status: 403 });
  }

  const { id } = await params;
  await removeContract(context.organizationId, id);

  return NextResponse.json({ success: true });
}
