import { redirect } from "next/navigation";

import { ContractCreationSwitcher } from "@/components/contracts/contract-creation-switcher";
import { getContractAccessContext } from "@/lib/contracts/access";
import prisma from "@/lib/prisma";
import { getTemplateForContractPrefill } from "@/lib/templates/service";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string }>;
}) {
  const context = await getContractAccessContext();

  if (!context) {
    redirect("/signin?callbackUrl=/contracts/new");
  }

  if (!context.permissions.canCreate) {
    redirect("/contracts");
  }

  const workflows = await prisma.workflow.findMany({
    where: {
      organizationId: context.organizationId,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const templates = await prisma.template.findMany({
    where: {
      organizationId: context.organizationId,
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const resolvedSearchParams = await searchParams;
  const initialTemplate =
    resolvedSearchParams.templateId
      ? await getTemplateForContractPrefill(context.organizationId, resolvedSearchParams.templateId)
      : null;

  return (
    <ContractCreationSwitcher
      workflows={workflows}
      templates={templates.map((template) => ({
        id: template.id,
        name: template.name,
        type: template.type,
      }))}
      initialTemplate={initialTemplate}
      permissions={context.permissions}
    />
  );
}
