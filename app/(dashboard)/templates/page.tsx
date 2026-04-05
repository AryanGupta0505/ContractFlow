import { redirect } from "next/navigation";

import { TemplatesPageClient } from "@/components/templates/templates-page-client";
import { getContractAccessContext } from "@/lib/contracts/access";
import prisma from "@/lib/prisma";
import { listTemplates } from "@/lib/templates/service";

export default async function TemplatesPage() {
  const context = await getContractAccessContext();

  if (!context) {
    redirect("/signin?callbackUrl=/templates");
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

  const initialTemplatesData = await listTemplates(context.organizationId, context.role).catch(() => ({
    items: [],
    permissions: {
      canCreate: context.role === "ADMIN",
      canEdit: context.role === "ADMIN",
      canDelete: context.role === "ADMIN",
      canUse: true,
    },
    stats: {
      totalTemplates: 0,
      totalUsage: 0,
      ndaTemplates: 0,
      activeWorkflowDefaults: 0,
    },
  }));

  return (
    <TemplatesPageClient
      workflows={workflows}
      initialData={initialTemplatesData}
    />
  );
}
