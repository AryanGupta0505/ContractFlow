"use client";

import Image from "next/image";
import { Camera, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";

import type { SettingsResponse } from "@/lib/settings/types";

export function ProfileSettings({
  profile,
  isSaving,
  onSave,
}: {
  profile: SettingsResponse["profile"];
  isSaving: boolean;
  onSave: (input: { name: string; email: string; avatarUrl: string | null }) => Promise<void>;
}) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CF";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (name.trim().length < 2) {
      setValidationError("Name must be at least 2 characters long.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setValidationError("Enter a valid email address.");
      return;
    }

    setValidationError(null);
    await onSave({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      avatarUrl,
    });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setValidationError("Choose an image file for your avatar.");
      return;
    }

    if (file.size > 1_500_000) {
      setValidationError("Avatar files must be 1.5 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setValidationError(null);
      setAvatarUrl(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-col items-center gap-4 rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-[var(--surface-soft)] p-5 lg:w-[240px]">
          <div className="relative">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar preview"
                width={96}
                height={96}
                unoptimized
                className="h-24 w-24 rounded-[28px] object-cover shadow-[0_12px_24px_rgba(15,23,42,0.12)]"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-[var(--primary-soft)] text-2xl font-semibold text-[var(--primary)] shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-white text-[var(--foreground)] shadow-[0_10px_20px_rgba(15,23,42,0.08)]"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="space-y-2 text-center">
            <p className="text-sm font-semibold text-[var(--foreground)]">Profile photo</p>
            <p className="text-xs leading-5 text-[var(--muted)]">
              Upload a square image or clear it to return to initials.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAvatarUrl(null)}
            className="rounded-[16px] border border-[var(--border)] bg-white px-3 py-2 text-xs font-medium text-[var(--foreground)]"
          >
            Remove photo
          </button>
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Profile</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Your public account details</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Update your name, email address, and avatar used across the workspace.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-[var(--foreground)]">
              <span className="font-medium">Full name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 outline-none"
                placeholder="Enter your full name"
              />
            </label>

            <label className="grid gap-2 text-sm text-[var(--foreground)]">
              <span className="font-medium">Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-[18px] border border-[var(--border)] bg-white px-4 py-3 outline-none"
                placeholder="name@company.com"
              />
            </label>
          </div>

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
              Save profile
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
