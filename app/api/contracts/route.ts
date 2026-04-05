import { NextResponse } from "next/server";

import { getContractAccessContext } from "@/lib/contracts/access";
import { createContractRecord, listContracts } from "@/lib/contracts/service";
import {
  defaultContractFilters,
  type ContractFilters,
  type ContractStatus,
  type CreateContractInput,
} from "@/lib/contracts/types";

function parseListFilters(url: URL): ContractFilters {
  const statuses = (url.searchParams.get("statuses") || "")
    .split(",")
    .filter(Boolean) as ContractStatus[];

  return {
    ...defaultContractFilters,
    search: url.searchParams.get("search") || "",
    statuses,
    workflowIds: (url.searchParams.get("workflowIds") || "").split(",").filter(Boolean),
    createdByIds: (url.searchParams.get("createdByIds") || "").split(",").filter(Boolean),
    createdDateRange: (url.searchParams.get("createdDateRange") || "") as ContractFilters["createdDateRange"],
    createdFrom: url.searchParams.get("createdFrom") || "",
    createdTo: url.searchParams.get("createdTo") || "",
    sortBy: (url.searchParams.get("sortBy") || defaultContractFilters.sortBy) as ContractFilters["sortBy"],
    sortDirection: (url.searchParams.get("sortDirection") || defaultContractFilters.sortDirection) as ContractFilters["sortDirection"],
    page: Number(url.searchParams.get("page") || defaultContractFilters.page),
    pageSize: Number(url.searchParams.get("pageSize") || defaultContractFilters.pageSize),
  };
}

export async function GET(request: Request) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const filters = parseListFilters(url);
  const response = await listContracts(
    context.organizationId,
    context.role,
    filters,
    context.permissions,
  );

  return NextResponse.json(response);
}

export async function POST(request: Request) {
  const context = await getContractAccessContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!context.permissions.canCreate) {
    return NextResponse.json({ error: "You do not have permission to create contracts." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    content?: string;
    contentJson?: CreateContractInput["contentJson"];
    summary?: string;
    workflowId?: string;
    templateId?: string;
    fileUrl?: string;
    parties?: string[];
    metadata?: string[];
    aiPrompt?: string;
    aiResponse?: string;
  };

  try {
    if (body.workflowId && !context.permissions.canAssignWorkflow) {
      return NextResponse.json(
        { error: "You do not have permission to assign workflows to contracts." },
        { status: 403 },
      );
    }

    const contract = await createContractRecord({
      organizationId: context.organizationId,
      createdById: context.userId,
      createdByName: context.userName,
      data: {
        title: body.title || "",
        content: body.content || "",
        contentJson: body.contentJson,
        summary: body.summary || "",
        workflowId: context.permissions.canAssignWorkflow ? body.workflowId || "" : "",
        templateId: body.templateId || "",
        fileUrl: body.fileUrl || "",
        parties: Array.isArray(body.parties) ? body.parties : [],
        metadata: Array.isArray(body.metadata) ? body.metadata : [],
        aiPrompt: body.aiPrompt || "",
        aiResponse: body.aiResponse || "",
      } satisfies CreateContractInput,
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create contract.",
      },
      { status: 400 },
    );
  }
}
