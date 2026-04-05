import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { updateProfileSettings } from "@/lib/settings/service";
import type { UpdateProfileInput } from "@/lib/settings/types";

export async function PATCH(request: Request) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<UpdateProfileInput>;

  try {
    const profile = await updateProfileSettings(context.userId, {
      name: body.name || "",
      email: body.email || "",
      avatarUrl: body.avatarUrl ?? null,
    });
    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update profile." },
      { status: 400 },
    );
  }
}
