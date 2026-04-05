import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { updateSecuritySettings } from "@/lib/settings/service";
import type { UpdateSecurityInput } from "@/lib/settings/types";

export async function PATCH(request: Request) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<UpdateSecurityInput>;

  try {
    const result = await updateSecuritySettings(context.userId, {
      currentPassword: body.currentPassword || "",
      newPassword: body.newPassword || "",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update password." },
      { status: 400 },
    );
  }
}
