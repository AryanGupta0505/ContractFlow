"use client";

import Link from "next/link";
import { startTransition, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { signIn } from "next-auth/react";

import { OAuthButtons } from "@/components/auth/oauth-buttons";

export function SignUpForm({
  providers,
}: {
  providers: Array<{
    id: string;
    label: string;
  }>;
}) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [role, setRole] = useState("ADMIN");

  return (
    <div className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(24,32,51,0.06)] sm:p-8">
      <div className="mb-8">
        <p className="inline-flex rounded-full bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium uppercase tracking-[0.24em] text-[var(--primary)]">
          Create account
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Start your workspace.
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          Set up credentials now, or use OAuth if a provider is available.
        </p>
      </div>

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setIsPending(true);
          setError("");

          const formData = new FormData(event.currentTarget);

          startTransition(async () => {
            const response = await fetch("/api/auth/signup", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: String(formData.get("name") || "").trim(),
                organizationName: String(formData.get("organizationName") || ""),
                role: String(formData.get("role") || "ADMIN"),
                email: String(formData.get("email") || "").trim(),
                password: String(formData.get("password") || ""),
              }),
            });

            const payload = (await response.json()) as { error?: string };

            if (!response.ok) {
              setError(payload.error || "Unable to create your account.");
              setIsPending(false);
              return;
            }

            const signInResult = await signIn("credentials", {
              email: String(formData.get("email") || ""),
              password: String(formData.get("password") || ""),
              callbackUrl,
              redirect: false,
            });

            setIsPending(false);

            if (signInResult?.error) {
              setError(signInResult.error);
              return;
            }

            window.location.href = signInResult?.url || callbackUrl;
          });
        }}
      >
        <label className="grid gap-2 text-sm">
          <span className="text-[var(--muted)]">Name</span>
          <input
            name="name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Alex Morgan"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-[var(--muted)]">Email</span>
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-[var(--muted)]">Organization</span>
          <input
            name="organizationName"
            type="text"
            required
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            placeholder="Acme Legal Ops"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-[var(--muted)]">Initial role</span>
          <select
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
          >
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Employee</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-[var(--muted)]">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Minimum 8 characters"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
          />
        </label>

        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(80,104,255,0.22)] hover:bg-[var(--primary-strong)] hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Creating account
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-[var(--muted)]">
        <span className="h-px flex-1 bg-[var(--border)]" />
        Or continue with
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <OAuthButtons callbackUrl={callbackUrl} providers={providers} />

      <p className="mt-6 text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link
          href={`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-semibold text-[var(--primary)] hover:text-[var(--primary-strong)]"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
