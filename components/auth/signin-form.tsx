"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { signIn } from "next-auth/react";

import { OAuthButtons } from "@/components/auth/oauth-buttons";

export function SignInForm({
  providers,
}: {
  providers: Array<{
    id: string;
    label: string;
  }>;
}) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");
  const [error, setError] = useState(
    errorParam === "CredentialsSignin"
      ? "Incorrect email or password."
      : errorParam === "AccessDenied"
        ? "Your organization access has been removed. Contact an admin to be added again."
        : errorParam === "Configuration"
          ? "Unable to sign in right now."
        : "",
  );
  const [isPending, setIsPending] = useState(false);

  return (
    <div className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(24,32,51,0.06)] sm:p-8">
      <div className="mb-8">
        <p className="inline-flex rounded-full bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium uppercase tracking-[0.24em] text-[var(--primary)]">
          Welcome back
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Sign in to continue.
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          Use your email and password or continue with an available provider.
        </p>
      </div>

      <form
        method="post"
        className="grid gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsPending(true);
          setError("");

          const formData = new FormData(event.currentTarget);
          const safeCallbackUrl =
            callbackUrl && !callbackUrl.includes("/signin") && !callbackUrl.includes("/api/auth")
              ? callbackUrl
              : "/dashboard";

          const result = await signIn("credentials", {
            email: String(formData.get("email") || ""),
            password: String(formData.get("password") || ""),
            callbackUrl: safeCallbackUrl,
            redirect: false,
          });

          setIsPending(false);

          if (!result) {
            setError("Unable to sign in right now.");
            return;
          }

          if (result.error) {
            setError(
              result.error === "CredentialsSignin"
                ? "Incorrect email or password."
                : result.error === "AccessDenied"
                  ? "Your organization access has been removed. Contact an admin to be added again."
                  : result.error,
            );
            return;
          }

          const nextUrl =
            result.url &&
            !result.url.includes("/signin") &&
            !result.url.includes("/api/auth")
              ? result.url
              : safeCallbackUrl;

          window.location.assign(nextUrl);
        }}
      >
        <label className="grid gap-2 text-sm">
          <span className="text-[var(--muted)]">Email</span>
          <input
            name="email"
            type="email"
            required
            placeholder="you@company.com"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-[var(--muted)]">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Enter your password"
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
              Signing in
            </>
          ) : (
            "Sign in"
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
        New here?{" "}
        <Link
          href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-semibold text-[var(--primary)] hover:text-[var(--primary-strong)]"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
