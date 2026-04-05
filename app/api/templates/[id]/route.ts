import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { deleteTemplate, updateTemplate } from "@/lib/templates/service";
import type { TemplatePayload } from "@/lib/templates/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (context.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can edit templates." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as TemplatePayload;

  try {
    const template = await updateTemplate({
      organizationId: context.organizationId,
      actorId: context.userId,
      templateId: id,
      payload: body,
    });

    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update template." },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (context.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can delete templates." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await deleteTemplate({
      organizationId: context.organizationId,
      actorId: context.userId,
      templateId: id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete template." },
      { status: 400 },
    );
  }
}
