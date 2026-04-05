export type ThemePreference = "LIGHT" | "DARK" | "SYSTEM";

export type UserPreferences = {
  theme: ThemePreference;
};

export type SettingsResponse = {
  profile: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  security: {
    hasPassword: boolean;
  };
  preferences: UserPreferences;
  account: {
    workspaceName: string;
    workspaceRole: "ADMIN" | "MANAGER" | "EMPLOYEE";
    canLeaveWorkspace: boolean;
    canDeleteAccount: boolean;
  };
};

export type UpdateProfileInput = {
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export type UpdateSecurityInput = {
  currentPassword?: string;
  newPassword: string;
};

export type UpdatePreferencesInput = {
  theme: ThemePreference;
};
