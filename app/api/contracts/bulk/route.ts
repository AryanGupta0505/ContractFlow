import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { runBulkContractAction } from "@/lib/contracts/service";
import type { BulkAction } from "@/lib/contracts/types";

export async function POST(request: Request) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as BulkAction;

  if (!body?.action || !Array.isArray(body.ids)) {
    return NextResponse.json({ error: "Invalid bulk action." }, { status: 400 });
  }

  if (body.action === "delete" && !context.permissions.canDelete) {
    return NextResponse.json({ error: "You do not have permission to delete contracts." }, { status: 403 });
  }

  if (body.action === "archive" && !context.permissions.canArchive) {
    return NextResponse.json({ error: "You do not have permission to archive contracts." }, { status: 403 });
  }

  if (body.action === "assignWorkflow" && !context.permissions.canAssignWorkflow) {
    return NextResponse.json({ error: "You do not have permission to assign workflows." }, { status: 403 });
  }

  await runBulkContractAction(context.organizationId, body);

  return NextResponse.json({ success: true });
}
