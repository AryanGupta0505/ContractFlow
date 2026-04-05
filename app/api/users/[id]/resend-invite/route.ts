import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Invite actions are no longer supported." },
    { status: 410 },
  );
}
