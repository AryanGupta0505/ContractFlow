import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { updateNotificationReadState } from "@/lib/notifications/service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    read?: boolean;
  };

  if (typeof body.read !== "boolean") {
    return NextResponse.json({ error: "A boolean read value is required." }, { status: 400 });
  }

  const { id } = await params;

  try {
    const notification = await updateNotificationReadState(
      context.userId,
      id,
      body.read,
      context.organizationId,
    );
    return NextResponse.json(notification);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update notification." },
      { status: 404 },
    );
  }
}
