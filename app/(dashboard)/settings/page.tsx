import { redirect } from "next/navigation";

import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { getContractAccessContext } from "@/lib/contracts/access";

export default async function SettingsPage() {
  const context = await getContractAccessContext();

  if (!context) {
    redirect("/signin?callbackUrl=/settings");
  }

  return <SettingsPageClient />;
}
