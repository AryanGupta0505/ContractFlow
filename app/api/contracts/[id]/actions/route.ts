import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { runAction } from "@/lib/contracts/service";
import type { ContractMutationAction } from "@/lib/contracts/types";

const supportedActions = new Set<ContractMutationAction>([
  "archive",
  "unarchive",
  "duplicate",
  "send_for_approval",
  "approve",
  "reject",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: ContractMutationAction;
    workflowId?: string;
  };

  if (!body.action || !supportedActions.has(body.action)) {
    return NextResponse.json({ error: "Unsupported contract action." }, { status: 400 });
  }

  if (
    (body.action === "approve" || body.action === "reject") &&
    !context.permissions.canApprove
  ) {
    return NextResponse.json({ error: "You do not have permission to approve contracts." }, { status: 403 });
  }

  if (
    body.action === "send_for_approval" &&
    !context.permissions.canSendForApproval
  ) {
    return NextResponse.json({ error: "You do not have permission to send contracts for approval." }, { status: 403 });
  }

  if (
    (body.action === "archive" ||
      body.action === "unarchive" ||
      body.action === "duplicate") &&
    !context.permissions.canEdit
  ) {
    return NextResponse.json({ error: "You do not have permission to update contracts." }, { status: 403 });
  }

  const { id } = await params;
  const contract = await runAction(context.organizationId, id, body.action, {
    preferredWorkflowId: body.workflowId || "",
    actorId: context.userId,
    actorName: context.userName,
    actorRole: context.role,
  });

  return NextResponse.json(contract);
}
