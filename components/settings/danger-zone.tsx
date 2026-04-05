"use client";

import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useState } from "react";

type ModalMode = "delete" | "leave" | "change-org" | null;

export function DangerZone({
  canChangeOrganization,
  canLeaveWorkspace,
  canDeleteAccount,
  workspaceName,
  isChangingOrganization,
  isDeletingAccount,
  isLeavingWorkspace,
  onChangeOrganization,
  onDeleteAccount,
  onLeaveWorkspace,
}: {
  canChangeOrganization: boolean;
  canLeaveWorkspace: boolean;
  canDeleteAccount: boolean;
  workspaceName: string;
  isChangingOrganization: boolean;
  isDeletingAccount: boolean;
  isLeavingWorkspace: boolean;
  onChangeOrganization: (name: string) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onLeaveWorkspace: () => Promise<void>;
}) {
  const [mode, setMode] = useState<ModalMode>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  const isDeleteMode = mode === "delete";
  const isChangeOrganizationMode = mode === "change-org";
  const busy = isDeleteMode
    ? isDeletingAccount
    : isChangeOrganizationMode
      ? isChangingOrganization
      : isLeavingWorkspace;
  const keyword = isDeleteMode ? "DELETE" : isChangeOrganizationMode ? "SWITCH" : "LEAVE";
  const title = isDeleteMode
    ? "Delete account"
    : isChangeOrganizationMode
      ? "Change organization"
      : "Leave workspace";
  const description = isDeleteMode
    ? "This will disable your account, remove your sign-in access, and clear personal account settings. Contract history will remain for audit continuity."
    : isChangeOrganizationMode
      ? `This creates a new organization, moves you out of ${workspaceName}, and disconnects you from the current team and workspace context.`
      : `You are about to leave ${workspaceName}. If this is your last workspace, a personal workspace will be created so you can still sign in.`;

  async function handleConfirm() {
    if (confirmationText !== keyword) {
      return;
    }

    if (isDeleteMode) {
      await onDeleteAccount();
    } else if (isChangeOrganizationMode) {
      await onChangeOrganization(organizationName);
    } else {
      await onLeaveWorkspace();
    }

    setConfirmationText("");
    setOrganizationName("");
    setMode(null);
  }

  return (
    <>
      <section className="rounded-[28px] border border-rose-200 bg-[linear-gradient(180deg,#fff8f8_0%,#ffffff_100%)] p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Danger Zone</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">High-impact account actions</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                These actions are intentionally hard to reverse. Double-check before continuing.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[22px] border border-sky-200 bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Change organization</h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Create a new organization and move this account out of the current team. You will become the admin of the new organization.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode("change-org")}
                    disabled={!canChangeOrganization}
                    className="rounded-[18px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Change organization
                  </button>
                </div>
                {!canChangeOrganization ? (
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    Move to a new organization becomes available when the current workspace can safely lose this member.
                  </p>
                ) : null}
              </div>

              <div className="rounded-[22px] border border-rose-200 bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Delete account</h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Disable this account, remove authentication methods, and erase profile-level settings.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode("delete")}
                    disabled={!canDeleteAccount}
                    className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete account
                  </button>
                </div>
                {!canDeleteAccount ? (
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    Reassign any workspace where this account is the only admin before deleting it.
                  </p>
                ) : null}
              </div>

              <div className="rounded-[22px] border border-amber-200 bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Leave workspace</h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Remove yourself from the current workspace. This is available when you belong to another workspace or can safely move to a fallback one.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode("leave")}
                    disabled={!canLeaveWorkspace}
                    className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Leave workspace
                  </button>
                </div>
                {!canLeaveWorkspace ? (
                  <p className="mt-3 text-xs text-[var(--muted)]">
                    Leave workspace becomes available when there is another workspace to move to, or when the workspace can safely lose this member.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {mode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.52)] p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">Confirm action</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{description}</p>

            <label className="mt-5 grid gap-2 text-sm text-[var(--foreground)]">
              {isChangeOrganizationMode ? (
                <>
                  <span className="font-medium">New organization name</span>
                  <input
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                    className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 outline-none"
                    placeholder="Acme Legal"
                  />
                </>
              ) : null}
              <span className="font-medium">Type {keyword} to confirm</span>
              <input
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
                className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 outline-none"
                placeholder={keyword}
              />
            </label>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setMode(null);
                  setConfirmationText("");
                  setOrganizationName("");
                }}
                className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 text-sm font-medium text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={
                  confirmationText !== keyword ||
                  busy ||
                  (isChangeOrganizationMode && organizationName.trim().length < 2)
                }
                className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-rose-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {isDeleteMode ? "Delete account" : isChangeOrganizationMode ? "Change organization" : "Leave workspace"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
