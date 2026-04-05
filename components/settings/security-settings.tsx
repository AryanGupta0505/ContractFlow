"use client";

import { LoaderCircle, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function SecuritySettings({
  hasPassword,
  isSaving,
  onSave,
}: {
  hasPassword: boolean;
  isSaving: boolean;
  onSave: (input: { currentPassword: string; newPassword: string }) => Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasPassword && !currentPassword.trim()) {
      setValidationError("Current password is required.");
      return;
    }

    if (newPassword.trim().length < 8) {
      setValidationError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError("New password and confirmation must match.");
      return;
    }

    setValidationError(null);
    await onSave({
      currentPassword,
      newPassword,
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Security</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Password and sign-in protection</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Keep your account secure with a strong password you do not reuse elsewhere.
            </p>
          </div>

          <div className="rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted)]">
            <p className="font-semibold text-[var(--foreground)]">Password requirements</p>
            <p className="mt-2">Use at least 8 characters. A mix of upper and lowercase letters, numbers, and symbols is recommended.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {hasPassword ? (
              <label className="grid gap-2 text-sm text-[var(--foreground)]">
                <span className="font-medium">Current password</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 outline-none"
                  placeholder="Enter current password"
                />
              </label>
            ) : (
              <div className="rounded-[18px] border border-dashed border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
                This account does not have a password yet. Saving here will set one for direct sign-in.
              </div>
            )}

            <label className="grid gap-2 text-sm text-[var(--foreground)]">
              <span className="font-medium">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 outline-none"
                placeholder="Create a new password"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm text-[var(--foreground)]">
            <span className="font-medium">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 outline-none"
              placeholder="Re-enter the new password"
            />
          </label>

          {validationError ? (
            <p className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {validationError}
            </p>
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-[18px] bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Update password
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
