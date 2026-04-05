import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { markAllNotificationsAsRead } from "@/lib/notifications/service";

export async function PATCH() {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await markAllNotificationsAsRead(context.userId, context.organizationId);

  return NextResponse.json({ success: true });
}
