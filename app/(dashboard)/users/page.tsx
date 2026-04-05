import { redirect } from "next/navigation";

import { MembersPageClient } from "@/components/memberships/members-page-client";
import { getContractAccessContext } from "@/lib/contracts/access";

export default async function UsersPage() {
  const context = await getContractAccessContext();

  if (!context) {
    redirect("/signin?callbackUrl=/users");
  }

  return <MembersPageClient />;
}
