"use client";

import { startTransition, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { signIn } from "next-auth/react";

type OAuthButtonsProps = {
  callbackUrl?: string;
  providers: Array<{
    id: string;
    label: string;
  }>;
};

export function OAuthButtons({
  callbackUrl = "/dashboard",
  providers,
}: OAuthButtonsProps) {
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  if (!providers.length) {
    return (
      <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
        Add Google or GitHub OAuth keys in your environment to enable social
        sign-in.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {providers.map((provider) => {
        const isLoading = activeProvider === provider.id;

        return (
          <button
            key={provider.id}
            type="button"
            onClick={() => {
              setActiveProvider(provider.id);
              startTransition(async () => {
                await signIn(provider.id, { callbackUrl });
              });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
          >
            {isLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin text-[var(--primary)]" />
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
            )}
            {provider.label}
          </button>
        );
      })}
    </div>
  );
}
