import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { deleteNotification } from "@/lib/notifications/service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteNotification(context.userId, id, context.organizationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete notification." },
      { status: 404 },
    );
  }
}
