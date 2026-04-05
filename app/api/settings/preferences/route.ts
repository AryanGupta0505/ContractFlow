import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { updatePreferenceSettings } from "@/lib/settings/service";
import type { ThemePreference } from "@/lib/settings/types";

export async function PATCH(request: Request) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { theme?: ThemePreference };

  try {
    const preferences = await updatePreferenceSettings(context.userId, {
      theme: body.theme || "SYSTEM",
    });
    return NextResponse.json(preferences);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update preferences." },
      { status: 400 },
    );
  }
}
