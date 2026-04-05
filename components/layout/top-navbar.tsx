"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { LogOut, Search, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { NotificationsNavButton } from "@/components/layout/notifications-nav-button";
import { getSettings } from "@/lib/settings/api";

export function TopNavbar() {
  const { data: session } = useSession();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    enabled: Boolean(session?.user),
  });
  const displayName = session?.user?.name || session?.user?.email || "Guest";
  const userImage = settingsQuery.data?.profile.avatarUrl || session?.user?.image || null;
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  return (
    <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
          Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
          Contract overview
        </h1>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 lg:min-w-[320px]">
          <Search className="h-4 w-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search contracts or workflows"
            className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
          />
        </div>

        <div className="flex items-center gap-3">
          <NotificationsNavButton />

          {session?.user ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              {userImage ? (
                <Image
                  src={userImage}
                  alt={`${displayName} avatar`}
                  width={36}
                  height={36}
                  unoptimized
                  className="h-9 w-9 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-sm font-semibold text-[var(--primary)]">
                  {initials}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {displayName}
                </p>
                <p className="text-xs text-[var(--muted)]">Signed in</p>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/signin" })}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/signin"
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)]"
            >
              <User className="h-4 w-4" />
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
