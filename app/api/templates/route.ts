import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { createTemplate, listTemplates } from "@/lib/templates/service";
import type { TemplatePayload } from "@/lib/templates/types";

export async function GET() {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await listTemplates(context.organizationId, context.role);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (context.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can create templates." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as TemplatePayload;

  try {
    const template = await createTemplate({
      organizationId: context.organizationId,
      actorId: context.userId,
      payload: body,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create template." },
      { status: 400 },
    );
  }
}
