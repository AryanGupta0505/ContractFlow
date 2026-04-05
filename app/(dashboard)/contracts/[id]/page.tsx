import Link from "next/link";
import { notFound } from "next/navigation";
import { FilePenLine, X } from "lucide-react";

import { ContractApprovalPanel } from "@/components/contracts/contract-approval-panel";
import { ContractDetailEditor } from "@/components/contracts/contract-detail-editor";
import { ContractShareActions } from "@/components/contracts/contract-share-actions";
import { ContractContentPreview } from "@/components/contracts/contract-content-preview";
import { StatusBadge } from "@/components/contracts/status-badge";
import { getContractAccessContext } from "@/lib/contracts/access";
import { getContractById } from "@/lib/contracts/service";
import prisma from "@/lib/prisma";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatMetadataLabel(rawLabel: string) {
  return rawLabel
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseMetadataTag(tag: string) {
  const separatorIndex = tag.indexOf(":");

  if (separatorIndex === -1) {
    return {
      label: "Tag",
      value: tag,
      isStructured: false,
    };
  }

  const label = tag.slice(0, separatorIndex).trim();
  const value = tag.slice(separatorIndex + 1).trim();

  if (!label || !value) {
    return {
      label: "Tag",
      value: tag,
      isStructured: false,
    };
  }

  return {
    label: formatMetadataLabel(label),
    value,
    isStructured: true,
  };
}

export default async function ContractDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const context = await getContractAccessContext();

  if (!context) {
    notFound();
  }

  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const contract = await getContractById(context.organizationId, id);

  if (!contract) {
    notFound();
  }

  const workflows = await prisma.workflow.findMany({
    where: {
      organizationId: context.organizationId,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const isEditing = resolvedSearchParams.mode === "edit" && context.permissions.canEdit;

  return (
    <div className="space-y-6">
      <Link
        href="/contracts"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        Back to contracts
      </Link>

      <section className="overflow-hidden rounded-[32px] border border-[var(--border)] bg-[linear-gradient(145deg,#f8f2e8_0%,#f8fbff_36%,#ffffff_100%)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">
              Contract Detail
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
              {contract.title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Formal workspace view with saved parties, metadata, workflow state, and document content.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 xl:items-end">
            <StatusBadge status={contract.status} />
            {context.permissions.canEdit ? (
              isEditing ? (
                <Link
                  href={`/contracts/${contract.id}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
                >
                  <X className="h-4 w-4" />
                  Exit Edit Mode
                </Link>
              ) : (
                <Link
                  href={`/contracts/${contract.id}?mode=edit`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
                >
                  <FilePenLine className="h-4 w-4" />
                  Edit Contract
                </Link>
              )
            ) : null}
            <ContractShareActions contractId={contract.id} />
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Created By</p>
            <p className="mt-3 font-medium text-[var(--foreground)]">{contract.createdBy.name}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{contract.createdBy.email}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Created At</p>
            <p className="mt-3 font-medium text-[var(--foreground)]">{formatDate(contract.createdAt)}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Last Updated</p>
            <p className="mt-3 font-medium text-[var(--foreground)]">{formatDate(contract.updatedAt)}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Workflow</p>
            <p className="mt-3 font-medium text-[var(--foreground)]">
              {contract.workflow?.name || "No workflow"}
            </p>
            {contract.workflow ? (
              <p className="mt-1 text-sm text-[var(--muted)]">
                {contract.workflow.completedSteps}/{contract.workflow.totalSteps} approvals completed
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          <ContractApprovalPanel
            contract={contract}
            role={context.role}
            permissions={context.permissions}
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[24px] border border-[var(--border)] bg-white p-5">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              Parties
            </p>
            <div className="mt-4 space-y-3">
              {contract.parties.length ? (
                contract.parties.map((party, index) => (
                  <div
                    key={party}
                    className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3"
                  >
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                      Party {index + 1}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                      {party}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">No parties saved yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-white p-5">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              Metadata
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {contract.metadata.length ? (
                contract.metadata.map((tag, index) => {
                  const parsedTag = parseMetadataTag(tag);

                  return (
                    <div
                      key={tag}
                      className={`max-w-full rounded-[20px] border px-4 py-4 ${
                        parsedTag.isStructured
                          ? "border-[rgba(80,104,255,0.12)] bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_100%)] md:col-span-2"
                          : index === 0
                            ? "border-[rgba(80,104,255,0.12)] bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_100%)]"
                            : "border-[var(--border)] bg-[var(--surface-soft)]"
                      }`}
                    >
                      {parsedTag.isStructured ? (
                        <>
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                            {parsedTag.label}
                          </p>
                          <p className="mt-3 break-words text-sm leading-7 text-[var(--foreground)]">
                            {parsedTag.value}
                          </p>
                        </>
                      ) : (
                        <p className="break-words text-sm leading-6 text-[var(--foreground)]">
                          {parsedTag.value}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[var(--muted)]">No metadata tags saved yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div className="rounded-[24px] border border-[var(--border)] bg-white p-5">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              Summary
            </p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
              {contract.summary || "No summary saved for this contract."}
            </p>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-white p-5">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
              Source
            </p>
            <p className="mt-4 text-sm text-[var(--foreground)]">
              {contract.fileUrl || "No file URL attached."}
            </p>
            <p className="mt-3 text-sm text-[var(--muted)]">Version {contract.version}</p>
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#fffefc_0%,#fff 16%,#fff 100%)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(15,23,42,0.08)] pb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                Contract Content
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Styled reading view for the latest saved contract version.
              </p>
            </div>
            <div className="rounded-full bg-[var(--surface-soft)] px-4 py-2 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Version {contract.version}
            </div>
          </div>

          <ContractContentPreview
            key={`${contract.id}-${contract.version}`}
            html={contract.contentHtml}
            text={contract.content}
          />
        </div>
        {isEditing ? (
          <div className="mt-6 rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8faff_100%)] p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Edit Contract
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Update this contract while staying in the same detail view.
                </p>
              </div>
              <div className="rounded-full bg-[var(--surface-soft)] px-4 py-2 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                Editing mode
              </div>
            </div>

            <ContractDetailEditor
              contract={contract}
              workflows={workflows}
              permissions={context.permissions}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
