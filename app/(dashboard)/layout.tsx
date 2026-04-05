import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNavbar } from "@/components/layout/top-navbar";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/signin?callbackUrl=/dashboard");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl gap-6 rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_20px_60px_rgba(24,32,51,0.06)] sm:p-6">
        <aside className="hidden w-72 shrink-0 md:block">
          <Sidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] px-5 py-5">
            <TopNavbar />
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
