import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { deleteAccountSettings } from "@/lib/settings/service";

export async function DELETE() {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await deleteAccountSettings(context.userId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete account." },
      { status: 400 },
    );
  }
}
