import { redirect } from "next/navigation";

import { WorkflowsPageClient } from "@/components/workflows/workflows-page-client";
import { getContractAccessContext } from "@/lib/contracts/access";

export default async function WorkflowsPage() {
  const context = await getContractAccessContext();

  if (!context) {
    redirect("/signin?callbackUrl=/workflows");
  }

  return <WorkflowsPageClient />;
}
