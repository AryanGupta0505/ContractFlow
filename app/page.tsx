import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const highlights = [
  "Centralized contracts and approvals",
  "Credentials and OAuth-based access",
  "Clean audit visibility for every workflow",
];

const featureCards = [
  {
    title: "Approval routing",
    text: "Send documents through legal, finance, and signer stages with clear ownership.",
    tone: "bg-[var(--primary-soft)] text-[var(--primary)]",
  },
  {
    title: "Review visibility",
    text: "See where each contract is blocked and who needs to act next without chasing updates.",
    tone: "bg-[var(--warning-soft)] text-[var(--warning)]",
  },
  {
    title: "Completion tracking",
    text: "Keep sign-off and audit history visible from first draft to final signature.",
    tone: "bg-[var(--success-soft)] text-[var(--success)]",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_20px_60px_rgba(24,32,51,0.06)] sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-soft)_100%)] px-4 py-4 shadow-[0_12px_30px_rgba(24,32,51,0.04)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="ContractFlow logo"
              width={140}
              height={76}
              className="h-16 w-auto shrink-0 object-contain"
            />
            <div>
              <p className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                ContractFlow
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Contracts, approvals, signatures
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              className="rounded-full border border-transparent px-4 py-2 text-sm font-medium text-[var(--muted)] transition hover:border-[var(--border)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(80,104,255,0.2)] transition hover:bg-[var(--primary-strong)] hover:text-white"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <section className="grid gap-8 px-2 py-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-4 lg:py-10">
          <div className="max-w-xl">
            <p className="inline-flex rounded-full bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium uppercase tracking-[0.24em] text-[var(--primary)]">
              Contract operations made simple
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-[var(--foreground)] sm:text-5xl">
              Build a calmer workflow for contracts, approvals, and signatures.
            </h1>
            <p className="mt-5 text-base leading-8 text-[var(--muted)]">
              Bring drafting, reviews, approvals, and sign-off into one clean
              workspace that feels fast, clear, and easy to manage.
            </p>

            <div className="mt-8">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(80,104,255,0.22)] hover:bg-[var(--primary-strong)] hover:text-white"
              >
                Explore Platform
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 space-y-3">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 text-sm text-[var(--muted)]"
                >
                  <CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,#f8faff_0%,#eef1ff_100%)] p-4">
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_16px_40px_rgba(24,32,51,0.06)] sm:p-5">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
                <div>
                  <p className="text-sm font-medium text-[var(--muted)]">
                    Workspace preview
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                    Build and launch with confidence
                  </h2>
                </div>
                <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium text-[var(--primary)]">
                  Live
                </span>
              </div>

              <div className="grid gap-4 py-5 md:grid-cols-3">
                {[
                  { value: "128", label: "Active contracts" },
                  { value: "24", label: "Pending approvals" },
                  { value: "96%", label: "Completion rate" },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
                  >
                    <p className="text-2xl font-semibold text-[var(--foreground)]">
                      {card.value}
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">{card.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-[20px] border border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--muted)]">
                      Today&apos;s focus
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                      Keep high-value deals moving
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-medium text-[var(--primary)]">
                    Priority
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    "Review the enterprise MSA legal comments",
                    "Push 3 vendor renewals to finance approval",
                    "Prepare signature requests for today's closures",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 px-2 pb-2 pt-2 md:grid-cols-3 lg:px-4">
          {featureCards.map((item) => (
            <article
              key={item.title}
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
            >
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${item.tone}`}
              >
                {item.title}
              </span>
              <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                {item.text}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
