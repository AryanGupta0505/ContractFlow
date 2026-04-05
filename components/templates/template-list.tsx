"use client";

import type { TemplatePermissions, TemplateRecord } from "@/lib/templates/types";

import { TemplateCard } from "./template-card";

function TemplateSkeleton() {
  return (
    <div className="animate-pulse rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
      <div className="h-6 w-24 rounded-full bg-[var(--surface-soft)]" />
      <div className="mt-4 h-8 w-2/3 rounded bg-[var(--surface-soft)]" />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="h-16 rounded-[20px] bg-[var(--surface-soft)]" />
        <div className="h-16 rounded-[20px] bg-[var(--surface-soft)]" />
        <div className="h-16 rounded-[20px] bg-[var(--surface-soft)]" />
      </div>
      <div className="mt-5 h-16 rounded bg-[var(--surface-soft)]" />
      <div className="mt-6 flex gap-3">
        <div className="h-11 w-32 rounded-2xl bg-[var(--surface-soft)]" />
        <div className="h-11 w-24 rounded-2xl bg-[var(--surface-soft)]" />
      </div>
    </div>
  );
}

export function TemplateList({
  templates,
  permissions,
  isLoading,
  deletingId,
  onUse,
  onEdit,
  onDelete,
}: {
  templates: TemplateRecord[];
  permissions: TemplatePermissions;
  isLoading: boolean;
  deletingId: string | null;
  onUse: (template: TemplateRecord) => void;
  onEdit: (template: TemplateRecord) => void;
  onDelete: (template: TemplateRecord) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-5 xl:grid-cols-2">
        <TemplateSkeleton />
        <TemplateSkeleton />
        <TemplateSkeleton />
        <TemplateSkeleton />
      </div>
    );
  }

  if (!templates.length) {
    return (
      <div className="rounded-[32px] border border-dashed border-[var(--border)] bg-[linear-gradient(180deg,#fffefb_0%,#f7faff_100%)] px-8 py-14 text-center">
        <p className="text-lg font-semibold text-[var(--foreground)]">No templates yet</p>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          Create a reusable template for NDAs, vendor agreements, employment offers,
          or custom contract flows.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          permissions={permissions}
          isDeleting={deletingId === template.id}
          onUse={() => onUse(template)}
          onEdit={() => onEdit(template)}
          onDelete={() => onDelete(template)}
        />
      ))}
    </div>
  );
}
