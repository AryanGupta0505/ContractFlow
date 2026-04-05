"use client";

import Link from "next/link";
import { Bot, FileText } from "lucide-react";
import { useState } from "react";

import { AIContractForm } from "@/components/contracts/ai-contract-form";
import { NewContractForm } from "@/components/contracts/new-contract-form";
import type { ContractPermissions, ContractTemplatePrefill } from "@/lib/contracts/types";

type ContractCreationSwitcherProps = {
  workflows: { id: string; name: string }[];
  templates: { id: string; name: string; type: string }[];
  initialTemplate: ContractTemplatePrefill | null;
  permissions: ContractPermissions;
};

type CreationMode = "manual" | "ai";

const modeContent: Record<
  CreationMode,
  { eyebrow: string; title: string; description: string }
> = {
  manual: {
    eyebrow: "Manual Drafting",
    title: "Draft directly, then ask AI for clause guidance when needed.",
    description:
      "Write the agreement yourself in a document-style editor, keep full control over wording, and pull in AI suggestions only when you want a second pass.",
  },
  ai: {
    eyebrow: "AI Contract Studio",
    title: "Generate a formal first draft, then refine it before saving.",
    description:
      "Switch into AI mode to generate a structured contract draft from business inputs, review the result in the editor, and save it into your workflow as a draft.",
  },
};

export function ContractCreationSwitcher({
  workflows,
  templates,
  initialTemplate,
  permissions,
}: ContractCreationSwitcherProps) {
  const [mode, setMode] = useState<CreationMode>(initialTemplate ? "manual" : "manual");
  const currentMode = modeContent[mode];

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-[36px] border border-[var(--border)] bg-[linear-gradient(140deg,#fdf7ec_0%,#f8fbff_52%,#edf5ff_100%)] shadow-sm">
        <div className="p-8 sm:p-12">
          <div className="max-w-4xl">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--muted)]">
              Contract Creation
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl sm:leading-[1.08]">
              {currentMode.title}
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--muted)]">
              {currentMode.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-full border border-[var(--border)] bg-white/85 px-4 py-2 text-sm text-[var(--muted)] shadow-sm">
                Draft in a legal-style editor
              </div>
              <div className="rounded-full border border-[var(--border)] bg-white/85 px-4 py-2 text-sm text-[var(--muted)] shadow-sm">
                Switch between manual and AI flows
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-[32px] border border-white/70 bg-white/82 p-4 shadow-[0_22px_46px_rgba(35,40,75,0.1)] backdrop-blur sm:p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`rounded-[28px] border px-6 py-6 text-left transition ${
                  mode === "manual"
                    ? "border-[var(--primary)] bg-[linear-gradient(180deg,#eef3ff_0%,#f7faff_100%)] shadow-[0_18px_36px_rgba(80,104,255,0.18)]"
                    : "border-[var(--border)] bg-white hover:bg-[var(--surface-soft)]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-[22px] bg-[var(--primary-soft)] p-4 text-[var(--primary)]">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                      Manual
                    </p>
                    <p className="mt-2 text-[1.35rem] font-semibold leading-8 text-[var(--foreground)]">
                      Write your own draft
                    </p>
                    <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                      Best when you already know the structure and want AI only for clause suggestions.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("ai")}
                className={`rounded-[28px] border px-6 py-6 text-left transition ${
                  mode === "ai"
                    ? "border-[var(--primary)] bg-[linear-gradient(180deg,#eef3ff_0%,#f7faff_100%)] shadow-[0_18px_36px_rgba(80,104,255,0.18)]"
                    : "border-[var(--border)] bg-white hover:bg-[var(--surface-soft)]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="rounded-[22px] bg-[var(--primary-soft)] p-4 text-[var(--primary)]">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                      AI
                    </p>
                    <p className="mt-2 text-[1.35rem] font-semibold leading-8 text-[var(--foreground)]">
                      Generate first draft
                    </p>
                    <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
                      Best when you want the platform to draft a formal agreement from business details.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {templates.length ? (
            <div className="mt-6 rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-[0_18px_42px_rgba(35,40,75,0.08)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                    Start From Template
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    Pick a saved template to prefill the manual contract editor with reusable structure.
                  </p>
                </div>
                <Link
                  href="/templates"
                  className="inline-flex items-center rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
                >
                  Manage templates
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {templates.slice(0, 4).map((template) => (
                  <Link
                    key={template.id}
                    href={`/contracts/new?templateId=${template.id}`}
                    className={`rounded-2xl border px-4 py-3 text-sm transition ${
                      initialTemplate?.id === template.id
                        ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
                    }`}
                  >
                    {template.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5">
        <div className="rounded-[28px] bg-[linear-gradient(180deg,#fffefc_0%,#f7faff_100%)] p-5 sm:p-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[var(--border)] bg-white px-6 py-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                {currentMode.eyebrow}
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                {mode === "manual"
                  ? "Manual mode keeps the page focused on drafting, with AI review available on demand."
                  : "AI mode generates a structured contract draft without replacing your ability to edit before saving."}
              </p>
            </div>
            <div className="rounded-full bg-[var(--surface-soft)] px-4 py-2 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              {mode === "manual" ? "Manual mode active" : "AI mode active"}
            </div>
          </div>

          {mode === "manual" ? (
            <NewContractForm
              workflows={workflows}
              availableTemplates={templates}
              initialTemplate={initialTemplate}
              permissions={permissions}
              variant="embedded"
            />
          ) : (
            <AIContractForm
              workflows={workflows}
              permissions={permissions}
              variant="embedded"
            />
          )}
        </div>
      </section>
    </div>
  );
}
