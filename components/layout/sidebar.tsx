"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
  Waypoints,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Contracts", href: "/contracts", icon: FileText },
  { name: "Workflows", href: "/workflows", icon: Waypoints },
  { name: "Templates", href: "/templates", icon: Sparkles },
  { name: "Users", href: "/users", icon: Users },
  { name: "Notifications", href: "/notifications", icon: BellRing },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="border-b border-[var(--border)] pb-5">
        <p className="text-lg font-semibold text-[var(--foreground)]">ContractFlow</p>
        <p className="mt-1 text-sm text-[var(--muted)]">Minimal contract workspace</p>
      </div>

      <p className="pt-6 text-xs font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
        Main Menu
      </p>

      <nav className="mt-4 flex flex-col gap-1.5">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm ${
                active
                  ? "bg-[var(--primary-soft)] font-medium text-[var(--primary)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4">
        <p className="text-sm font-medium text-[var(--foreground)]">Workspace status</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Approval turnaround is stable this week and contract flow is healthy.
        </p>
      </div>
    </div>
  );
}
