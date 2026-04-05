import { redirect } from "next/navigation";

import { NotificationsPageClient } from "@/components/notifications/notifications-page-client";
import { getContractAccessContext } from "@/lib/contracts/access";

export default async function NotificationsPage() {
  const context = await getContractAccessContext();

  if (!context) {
    redirect("/signin?callbackUrl=/notifications");
  }

  return <NotificationsPageClient />;
}
