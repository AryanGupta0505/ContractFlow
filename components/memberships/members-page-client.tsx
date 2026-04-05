"use client";

import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LoaderCircle, Search, Trash2, UserCheck, UserPlus, UserX2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useToast } from "@/components/providers/toast-provider";
import {
  createMembership,
  deleteMembership,
  getMemberships,
  updateMembership,
} from "@/lib/memberships/api";
import type { ContractRole } from "@/lib/contracts/types";
import type { MembershipRecord, UserStatus } from "@/lib/memberships/types";

const roles: ContractRole[] = ["ADMIN", "MANAGER", "EMPLOYEE"];
const roleFilters: Array<ContractRole | "ALL"> = ["ALL", ...roles];
const statusFilters: Array<UserStatus | "ALL"> = ["ALL", "ACTIVE", "DISABLED"];
const sortOptions = [
  { value: "joined-desc", label: "Newest joined" },
  { value: "joined-asc", label: "Oldest joined" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "role-asc", label: "Role" },
] as const;

type SortValue = (typeof sortOptions)[number]["value"];

function formatRoleLabel(role: ContractRole) {
  return role === "ADMIN" ? "Admin" : role === "MANAGER" ? "Manager" : "Employee";
}

function statusClasses(status: UserStatus) {
  if (status === "DISABLED") return "border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--info)]";
  if (status === "INVITED") return "border-[color:var(--warning)]/20 bg-[var(--warning-soft)] text-[var(--warning)]";
  return "border-[color:var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]";
}

function compareRole(a: ContractRole, b: ContractRole) {
  const order: Record<ContractRole, number> = { ADMIN: 0, MANAGER: 1, EMPLOYEE: 2 };
  return order[a] - order[b];
}

function formatTimelineDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getInitials(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "U";
}

export function MembersPageClient() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", role: "EMPLOYEE" as ContractRole });
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<ContractRole | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<SortValue>("joined-desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkRole, setBulkRole] = useState<ContractRole>("MANAGER");
  const [bulkPending, setBulkPending] = useState(false);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [profileMember, setProfileMember] = useState<MembershipRecord | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const actionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const profilePanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;

      if (
        openActionsId &&
        target &&
        !actionsMenuRef.current?.contains(target) &&
        !actionsButtonRef.current?.contains(target)
      ) {
        setOpenActionsId(null);
      }

      if (profileMember && target && !profilePanelRef.current?.contains(target)) {
        setProfileMember(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openActionsId, profileMember]);

  const query = useQuery({ queryKey: ["memberships"], queryFn: getMemberships });

  const createMutation = useMutation({
    mutationFn: createMembership,
    onSuccess: async () => {
      setForm({ name: "", email: "", role: "EMPLOYEE" });
      setError("");
      pushToast({ tone: "success", title: "User added", description: "The user was added to the organization." });
      await queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unable to add user.";
      setError(message);
      pushToast({ tone: "error", title: "Add user failed", description: message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { role?: ContractRole; status?: UserStatus } }) =>
      updateMembership(id, payload),
    onSuccess: async () => {
      setOpenActionsId(null);
      await queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unable to update user.";
      setError(message);
      pushToast({ tone: "error", title: "Update failed", description: message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMembership,
    onSuccess: async () => {
      setOpenActionsId(null);
      await queryClient.invalidateQueries({ queryKey: ["memberships"] });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unable to remove user.";
      setError(message);
      pushToast({ tone: "error", title: "Remove failed", description: message });
    },
  });

  const data = query.data;
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const filteredItems = useMemo(() => {
    const next = items
      .filter((member) => !search || member.name.toLowerCase().includes(search) || member.email.toLowerCase().includes(search))
      .filter((member) => roleFilter === "ALL" || member.role === roleFilter)
      .filter((member) => statusFilter === "ALL" || member.status === statusFilter);

    next.sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "role-asc") return compareRole(a.role, b.role) || a.name.localeCompare(b.name);
      if (sortBy === "joined-asc") return new Date(a.joinedAtValue).getTime() - new Date(b.joinedAtValue).getTime();
      return new Date(b.joinedAtValue).getTime() - new Date(a.joinedAtValue).getTime();
    });
    return next;
  }, [items, roleFilter, search, sortBy, statusFilter]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => filteredItems.some((member) => member.id === id)));
  }, [filteredItems]);

  const selectableSelected = filteredItems.filter(
    (member) => selectedIds.includes(member.id) && member.userId !== data?.currentUserId,
  );

  async function runBulk(action: "disable" | "remove" | "role") {
    if (!selectableSelected.length) return;
    setBulkPending(true);
    try {
      const operations = selectableSelected.map(async (member) => {
        if (action === "disable") {
          await updateMembership(member.id, { status: "DISABLED" });
          return member.id;
        }

        if (action === "remove") {
          await deleteMembership(member.id);
          return member.id;
        }

        await updateMembership(member.id, { role: bulkRole });
        return member.id;
      });

      const results = await Promise.allSettled(operations);
      const succeededIds = results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
        .map((result) => result.value);
      const failures = results
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => result.reason instanceof Error ? result.reason.message : "Unknown error");

      setSelectedIds((current) => current.filter((id) => !succeededIds.includes(id)));
      await queryClient.invalidateQueries({ queryKey: ["memberships"] });

      if (!failures.length) {
        setError("");
        pushToast({
          tone: "success",
          title: "Bulk action complete",
          description: `${succeededIds.length} user${succeededIds.length === 1 ? "" : "s"} updated.`,
        });
        return;
      }

      const uniqueFailures = [...new Set(failures)];
      const failureSummary = uniqueFailures.slice(0, 2).join(" ");
      const detail =
        succeededIds.length > 0
          ? `${succeededIds.length} completed, ${failures.length} failed. ${failureSummary}`
          : failureSummary || "Bulk action failed.";

      setError(detail);
      pushToast({
        tone: succeededIds.length > 0 ? "info" : "error",
        title: succeededIds.length > 0 ? "Bulk action partially completed" : "Bulk action failed",
        description: detail,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bulk action failed.";
      setError(message);
      pushToast({ tone: "error", title: "Bulk action failed", description: message });
    } finally {
      setBulkPending(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[34px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(140deg,#fff8ee_0%,#f9fbff_48%,#eef4ff_100%)] shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <div className="grid gap-5 p-6 sm:p-7 xl:grid-cols-[minmax(0,1.15fr)_360px] xl:items-start">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Membership</p>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[3.1rem] sm:leading-[0.98]">Organization members</h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Manage workspace membership, review account status, and assign organization roles for approvals and contract access.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Members" value={String(items.length)} />
              <StatCard label="Admins" value={String(items.filter((item) => item.role === "ADMIN").length)} />
              <StatCard label="Managers" value={String(items.filter((item) => item.role === "MANAGER").length)} />
            </div>
          </div>
          <div className="rounded-[28px] border border-white/70 bg-white/86 p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Workspace</p>
                <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">{data?.organization.name || "Organization"}</p>
              </div>
              <div className="rounded-full border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">
                {data?.permissions.canManage ? "Admin access" : "Read only"}
              </div>
            </div>
            <div className="mt-4 rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Tracking</p>
              <p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">Status, access, last activity, filters, and bulk actions are all managed from this page.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Add Member</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Add a user</h2>
          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_auto] xl:items-end">
            <Field label="Full name"><input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-sm outline-none" placeholder="Jordan Rivera" disabled={!data?.permissions.canManage} /></Field>
            <Field label="Email address"><input value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-sm outline-none" placeholder="jordan@company.com" disabled={!data?.permissions.canManage} /></Field>
            <Field label="Role"><select value={form.role} onChange={(e) => setForm((c) => ({ ...c, role: e.target.value as ContractRole }))} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-4 text-sm outline-none" disabled={!data?.permissions.canManage}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></Field>
            <button type="button" onClick={() => createMutation.mutate(form)} disabled={!data?.permissions.canManage || createMutation.isPending} className="inline-flex min-h-[54px] min-w-[170px] items-center justify-center gap-2 rounded-[20px] bg-[var(--primary)] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_30px_rgba(67,97,238,0.22)] disabled:opacity-60">
              {createMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add member
            </button>
          </div>
          {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Team</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Membership roster</h2>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_160px]">
              <label className="relative xl:col-span-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search name or email" className="w-full rounded-[18px] border border-[var(--border)] bg-white px-10 py-3 text-sm outline-none" />
              </label>

              <div className="grid gap-3 sm:grid-cols-2 xl:col-span-2">
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as ContractRole | "ALL")} className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none">{roleFilters.map((option) => <option key={option} value={option}>{option === "ALL" ? "All roles" : formatRoleLabel(option)}</option>)}</select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as UserStatus | "ALL")} className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none">{statusFilters.map((option) => <option key={option} value={option}>{option === "ALL" ? "All statuses" : option === "ACTIVE" ? "Active" : "Disabled"}</option>)}</select>
              </div>

              <div className="grid gap-3 sm:grid-cols-[160px_max-content] xl:grid-cols-[160px_max-content] xl:justify-start">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortValue)} className="min-w-0 flex-1 rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none">{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setRoleFilter("ALL"); setStatusFilter("ALL"); setSortBy("joined-desc"); }} className="w-fit rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 text-sm">Clear</button>
              </div>
            </div>
          </div>

          {selectedIds.length ? (
            <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-[rgba(67,97,238,0.12)] bg-[linear-gradient(180deg,#f4f7ff_0%,#eef3ff_100%)] p-4 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm font-semibold text-[var(--foreground)]">{selectedIds.length} selected</p>
              <div className="flex flex-wrap gap-3">
                <select value={bulkRole} onChange={(e) => setBulkRole(e.target.value as ContractRole)} className="rounded-[16px] border border-[var(--border)] bg-white px-4 py-2.5 text-sm outline-none">{roles.map((role) => <option key={role} value={role}>Change role to {formatRoleLabel(role)}</option>)}</select>
                <button type="button" disabled={bulkPending || !selectableSelected.length} onClick={() => runBulk("role")} className="rounded-[16px] border border-[var(--border)] bg-white px-4 py-2.5 text-sm disabled:opacity-60">Change role</button>
                <button type="button" disabled={bulkPending || !selectableSelected.length} onClick={() => runBulk("disable")} className="rounded-[16px] border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm disabled:opacity-60">Disable users</button>
                <button type="button" disabled={bulkPending || !selectableSelected.length} onClick={() => runBulk("remove")} className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 disabled:opacity-60">Remove users</button>
              </div>
            </div>
          ) : null}

          {query.isLoading ? <div className="mt-6 h-24 animate-pulse rounded-[22px] bg-[var(--surface-soft)]" /> : null}
          {!query.isLoading ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={filteredItems.length > 0 && filteredItems.every((member) => selectedIds.includes(member.id))} onChange={() => setSelectedIds(filteredItems.length > 0 && filteredItems.every((member) => selectedIds.includes(member.id)) ? [] : filteredItems.map((member) => member.id))} />Select visible users</label>
                <p>{filteredItems.length} results</p>
              </div>
              {filteredItems.map((member) => {
                const isSelf = member.userId === data?.currentUserId;
                return (
                  <article key={member.id} className="rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                    <div className="grid gap-5 p-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-start">
                      <input type="checkbox" className="mt-1" checked={selectedIds.includes(member.id)} onChange={() => setSelectedIds((current) => current.includes(member.id) ? current.filter((id) => id !== member.id) : [...current, member.id])} />
                      <button type="button" onClick={() => setProfileMember(member)} className="grid gap-4 text-left">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-[1.35rem] font-semibold tracking-tight text-[var(--foreground)]">{member.name}</h3>
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusClasses(member.status)}`}>{member.statusLabel}</span>
                              <span className="rounded-full border border-[rgba(67,97,238,0.14)] bg-[linear-gradient(180deg,#ffffff_0%,#f2f5ff_100%)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">{formatRoleLabel(member.role)}</span>
                            </div>
                            <p className="mt-1 break-all text-sm text-[var(--muted)]">{member.email}</p>
                          </div>
                          <div className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-white/82 px-3.5 py-2.5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Last active</p>
                            <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{member.lastActiveLabel}</p>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-4">
                          <MiniStat label="Joined" value={member.joinedAt} />
                          <MiniStat label="Role" value={formatRoleLabel(member.role)} />
                          <MiniStat label="Contracts" value={String(member.contractsCreatedCount)} />
                          <MiniStat label="Approvals" value={String(member.approvalsHandledCount)} />
                        </div>
                      </button>
                      <div className="relative">
                        <button ref={openActionsId === member.id ? actionsButtonRef : null} type="button" onClick={() => setOpenActionsId((current) => current === member.id ? null : member.id)} className="inline-flex items-center gap-2 rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)]">Actions<ChevronDown className="h-4 w-4" /></button>
                        {openActionsId === member.id ? (
                          <div ref={actionsMenuRef} className="absolute right-0 top-[calc(100%+10px)] z-20 w-[260px] rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white p-3 shadow-[0_18px_44px_rgba(15,23,42,0.12)]">
                            <label className="block px-2 pb-2 text-xs font-medium text-[var(--muted)]">Edit role<select value={member.role} onChange={(e) => updateMutation.mutate({ id: member.id, payload: { role: e.target.value as ContractRole } })} disabled={!data?.permissions.canManage || isSelf || updateMutation.isPending} className="mt-2 w-full rounded-[16px] border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none disabled:opacity-60">{roles.map((role) => <option key={role} value={role}>{formatRoleLabel(role)}</option>)}</select></label>
                            <button type="button" onClick={() => updateMutation.mutate({ id: member.id, payload: { status: member.status === "DISABLED" ? "ACTIVE" : "DISABLED" } })} disabled={!data?.permissions.canManage || isSelf || updateMutation.isPending} className="mt-1 inline-flex w-full items-center gap-2 rounded-[16px] px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60">{member.status === "DISABLED" ? <UserCheck className="h-4 w-4" /> : <UserX2 className="h-4 w-4" />}{member.status === "DISABLED" ? "Enable account" : "Disable account"}</button>
                            <button type="button" onClick={() => deleteMutation.mutate(member.id)} disabled={!data?.permissions.canManage || isSelf || deleteMutation.isPending} className="mt-1 inline-flex w-full items-center gap-2 rounded-[16px] px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"><Trash2 className="h-4 w-4" />Remove user</button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      {profileMember ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-[rgba(15,23,42,0.28)]">
          <div ref={profilePanelRef} className="h-full w-full max-w-[420px] overflow-y-auto border-l border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {profileMember.profileImageUrl ? (
                  <Image
                    src={profileMember.profileImageUrl}
                    alt={`${profileMember.name} profile photo`}
                    width={72}
                    height={72}
                    unoptimized
                    className="h-[72px] w-[72px] rounded-[24px] object-cover shadow-[0_12px_28px_rgba(15,23,42,0.14)]"
                  />
                ) : (
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[var(--primary-soft)] text-xl font-semibold text-[var(--primary)] shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
                    {getInitials(profileMember.name)}
                  </div>
                )}
                <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">User profile</p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{profileMember.name}</h3>
                <p className="mt-2 break-all text-sm text-[var(--muted)]">{profileMember.email}</p>
                </div>
              </div>
              <button type="button" onClick={() => setProfileMember(null)} className="rounded-full border border-[var(--border)] p-2 text-[var(--muted)]"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 grid gap-3">
              <MiniDetail label="Role" value={formatRoleLabel(profileMember.role)} />
              <MiniDetail label="Status" value={profileMember.statusLabel} />
              <MiniDetail label="Joined" value={profileMember.joinedAt} />
              <MiniDetail label="Last active" value={profileMember.lastActiveLabel} />
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniDetail label="Contracts created" value={String(profileMember.contractsCreatedCount)} />
                <MiniDetail label="Approvals handled" value={String(profileMember.approvalsHandledCount)} />
              </div>
              <ProfileList
                label="Latest contracts"
                emptyLabel="No contracts created yet."
                items={profileMember.latestContracts.map((contract) => ({
                  id: contract.id,
                  title: contract.title,
                  meta: formatTimelineDate(contract.createdAt),
                }))}
              />
              <ProfileList
                label="Latest approvals"
                emptyLabel="No approvals handled yet."
                items={profileMember.latestApprovals.map((approval) => ({
                  id: approval.id,
                  title: approval.contractTitle,
                  meta: `${approval.status} • ${formatTimelineDate(approval.createdAt)}`,
                }))}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white/78 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p><p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{value}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">{label}{children}</label>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white/82 px-4 py-3 shadow-[0_8px_20px_rgba(15,23,42,0.04)]"><p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p><p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">{value}</p></div>;
}

function MiniDetail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-4 py-4"><p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p><p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">{value}</p></div>;
}

function ProfileList({
  label,
  emptyLabel,
  items,
}: {
  label: string;
  emptyLabel: string;
  items: Array<{
    id: string;
    title: string;
    meta: string;
  }>;
}) {
  return (
    <div className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <div className="mt-3 space-y-2.5">
        {items.length ? items.map((item) => (
          <div key={item.id} className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white px-3 py-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{item.meta}</p>
          </div>
        )) : <p className="text-sm text-[var(--muted)]">{emptyLabel}</p>}
      </div>
    </div>
  );
}
