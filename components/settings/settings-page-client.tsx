"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";

import { DangerZone } from "@/components/settings/danger-zone";
import { PreferencesSettings } from "@/components/settings/preferences-settings";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { SecuritySettings } from "@/components/settings/security-settings";
import { SettingsTabs, type SettingsTabId } from "@/components/settings/settings-tabs";
import { useToast } from "@/components/providers/toast-provider";
import {
  changeCurrentOrganization,
  deleteAccount,
  getSettings,
  leaveCurrentWorkspace,
  updatePreferences,
  updateProfile,
  updateSecurity,
} from "@/lib/settings/api";

export function SettingsPageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTabId>("profile");
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      pushToast({ tone: "success", title: "Profile updated", description: "Your profile changes were saved." });
    },
    onError: (error) => {
      pushToast({
        tone: "error",
        title: "Unable to update profile",
        description: error instanceof Error ? error.message : "Profile update failed.",
      });
    },
  });

  const securityMutation = useMutation({
    mutationFn: updateSecurity,
    onSuccess: () => {
      pushToast({ tone: "success", title: "Password updated", description: "Your password was changed successfully." });
    },
    onError: (error) => {
      pushToast({
        tone: "error",
        title: "Unable to update password",
        description: error instanceof Error ? error.message : "Password update failed.",
      });
    },
  });

  const preferencesMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
      pushToast({ tone: "success", title: "Preferences saved", description: "Your display preferences were updated." });
    },
    onError: (error) => {
      pushToast({
        tone: "error",
        title: "Unable to save preferences",
        description: error instanceof Error ? error.message : "Preference update failed.",
      });
    },
  });

  const leaveWorkspaceMutation = useMutation({
    mutationFn: leaveCurrentWorkspace,
    onSuccess: async () => {
      pushToast({ tone: "success", title: "Workspace left", description: "Your workspace membership has been updated." });
      await signOut({ callbackUrl: "/signin" });
    },
    onError: (error) => {
      pushToast({
        tone: "error",
        title: "Unable to leave workspace",
        description: error instanceof Error ? error.message : "Workspace leave failed.",
      });
    },
  });

  const changeOrganizationMutation = useMutation({
    mutationFn: changeCurrentOrganization,
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["settings"] }),
        queryClient.invalidateQueries({ queryKey: ["memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
      pushToast({
        tone: "success",
        title: "Organization changed",
        description: `You are now working inside ${result.organization.name}.`,
      });
      router.refresh();
    },
    onError: (error) => {
      pushToast({
        tone: "error",
        title: "Unable to change organization",
        description: error instanceof Error ? error.message : "Organization change failed.",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      pushToast({ tone: "success", title: "Account deleted", description: "Your account access has been removed." });
      await signOut({ callbackUrl: "/signin" });
    },
    onError: (error) => {
      pushToast({
        tone: "error",
        title: "Unable to delete account",
        description: error instanceof Error ? error.message : "Account deletion failed.",
      });
    },
  });

  const settings = settingsQuery.data;
  const settingsError =
    settingsQuery.error instanceof Error ? settingsQuery.error.message : "Unable to load settings right now.";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(135deg,#fffaf2_0%,#f8fbff_56%,#edf2ff_100%)] shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <div className="grid gap-5 p-6 sm:p-7 xl:grid-cols-[minmax(0,1.1fr)_320px] xl:items-start">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Settings</p>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[3.1rem] sm:leading-[0.98]">
              Manage your account, security, and workspace preferences
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Keep your profile current, set your preferred theme, and control high-impact account actions from one place.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/86 p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Workspace</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
              {settings?.account.workspaceName ?? "Loading..."}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Role: {settings?.account.workspaceRole ? settings.account.workspaceRole.toLowerCase() : "loading"}
            </p>
            <div className="mt-4 rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">Active section</p>
              <p className="mt-1.5 text-lg font-semibold text-[var(--foreground)]">
                {activeTab === "danger" ? "Danger Zone" : activeTab[0].toUpperCase() + activeTab.slice(1)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
        <div className="space-y-6">
          <SettingsTabs value={activeTab} onChange={setActiveTab} />

          {settingsQuery.isLoading ? (
            <div className="h-40 animate-pulse rounded-[26px] bg-[var(--surface-soft)]" />
          ) : null}

          {settingsQuery.isError ? (
            <div className="rounded-[26px] border border-[var(--danger-border)] bg-[var(--danger-soft)] p-5">
              <p className="text-sm font-semibold text-[var(--danger)]">Settings couldn&apos;t be loaded</p>
              <p className="mt-2 text-sm text-[var(--danger)]">{settingsError}</p>
              <button
                type="button"
                onClick={() => void settingsQuery.refetch()}
                className="mt-4 inline-flex items-center rounded-[16px] border border-[var(--danger-border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)]"
              >
                Try again
              </button>
            </div>
          ) : null}

          {settings ? (
            <>
              {activeTab === "profile" ? (
                <ProfileSettings
                  profile={settings.profile}
                  isSaving={profileMutation.isPending}
                  onSave={async (input) => {
                    await profileMutation.mutateAsync(input);
                  }}
                />
              ) : null}

              {activeTab === "security" ? (
                <SecuritySettings
                  hasPassword={settings.security.hasPassword}
                  isSaving={securityMutation.isPending}
                  onSave={async (input) => {
                    await securityMutation.mutateAsync(input);
                  }}
                />
              ) : null}

              {activeTab === "preferences" ? (
                <PreferencesSettings
                  theme={settings.preferences.theme}
                  isSaving={preferencesMutation.isPending}
                  onSave={async (theme) => {
                    await preferencesMutation.mutateAsync(theme);
                  }}
                />
              ) : null}

              {activeTab === "danger" ? (
                <DangerZone
                  canChangeOrganization={settings.account.canLeaveWorkspace}
                  canLeaveWorkspace={settings.account.canLeaveWorkspace}
                  canDeleteAccount={settings.account.canDeleteAccount}
                  workspaceName={settings.account.workspaceName}
                  isChangingOrganization={changeOrganizationMutation.isPending}
                  isDeletingAccount={deleteAccountMutation.isPending}
                  isLeavingWorkspace={leaveWorkspaceMutation.isPending}
                  onChangeOrganization={async (name) => {
                    await changeOrganizationMutation.mutateAsync(name);
                  }}
                  onDeleteAccount={async () => {
                    await deleteAccountMutation.mutateAsync();
                  }}
                  onLeaveWorkspace={async () => {
                    await leaveWorkspaceMutation.mutateAsync();
                  }}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
