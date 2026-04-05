"use client";

import { usePathname } from "next/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSignupPage = pathname === "/signup";

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_20px_60px_rgba(24,32,51,0.06)] sm:p-6 lg:grid-cols-[0.95fr_1.05fr] lg:p-8">
        <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,#f8faff_0%,#eef1ff_100%)] p-6 sm:p-8">
          <div className="max-w-xl">
            <p className="inline-flex rounded-full bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium uppercase tracking-[0.24em] text-[var(--primary)]">
              Secure access
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-[var(--foreground)] sm:text-5xl">
              {isSignupPage ? "Sign up to a cleaner contract workflow." : "Sign in to a cleaner contract workflow."}
            </h2>
            <p className="mt-5 text-base leading-8 text-[var(--muted)]">
              Review, approve, and sign contracts from one workspace designed to
              stay simple, clear, and fast for your team.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Approval routing",
                  text: "Move agreements through clear role-based approvals without leaving the workspace.",
                  tone: "bg-[var(--primary-soft)] text-[var(--primary)]",
                },
                {
                  title: "Contract visibility",
                  text: "Track drafts, approvals, and signatures from one organized contract command center.",
                  tone: "bg-[var(--success-soft)] text-[var(--success)]",
                },
                {
                  title: "Reusable workflows",
                  text: "Launch repeatable approval paths and template-driven processes for every team.",
                  tone: "bg-[var(--warning-soft)] text-[var(--warning)]",
                },
                {
                  title: "Team coordination",
                  text: "Keep members, notifications, and document activity aligned inside one application.",
                  tone: "bg-[var(--primary-soft)] text-[var(--primary)]",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[22px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
                >
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${item.tone}`}
                  >
                    {item.title}
                  </span>
                  <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">{children}</section>
      </div>
    </main>
  );
}
