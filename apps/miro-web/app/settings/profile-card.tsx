"use client";

import type { ChangeEvent, ReactElement } from "react";
import type { SettingsState, SettingsUpdateInput } from "../_settings-store";

interface ProfileCardProps {
  readonly profile: SettingsState["profile"];
  readonly onUpdate: (input: SettingsUpdateInput) => void;
}

function getProfileInitials(profile: SettingsState["profile"]): string {
  const displayName: string = profile.displayName.trim();
  const workspaceName: string = profile.workspaceName.trim();
  const source: string = displayName || workspaceName || "You";
  const parts: string[] = source.split(" ");
  const first: string = parts[0] ?? "";
  const second: string = parts.length > 1 ? parts[1] : "";
  const initials: string = `${first.charAt(0)}${second.charAt(0)}`.trim();
  const fallback: string = source.charAt(0) || "Y";
  const value: string = initials || fallback;
  return value.toUpperCase().slice(0, 2);
}

export default function ProfileCard(props: ProfileCardProps): ReactElement {
  const { profile, onUpdate } = props;
  const initials: string = getProfileInitials(profile);
  const displayName: string = profile.displayName.trim() || "You";
  const avatarStyle: { readonly backgroundColor: string } = { backgroundColor: profile.avatarColor };
  const avatarInputId: string = "profile-avatar-upload";

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>): void {
    const files: FileList | null = event.target.files;
    if (!files || files.length === 0) {
      return;
    }
    const file: File = files[0] as File;
    const reader: FileReader = new FileReader();
    reader.onload = (): void => {
      const result: string | ArrayBuffer | null = reader.result;
      if (typeof result === "string") {
        onUpdate({ profile: { avatarImage: result } });
      }
    };
    reader.readAsDataURL(file);
  }

  const avatarImage: string = profile.avatarImage;
  const hasAvatarImage: boolean = avatarImage.trim().length > 0;

  return (
    <div className="surface-panel mx-auto w-full rounded-2xl p-4 text-sm sm:p-5 md:p-6 lg:p-8">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-400">Profile</h3>
        <p className="text-sm text-muted-foreground">
          Manage your profile and workspace identity. Local to this device only.
        </p>
      </div>
      <div className="mt-4 rounded-2xl border border-surface bg-surface px-4 py-7 text-center md:px-8 md:py-8">
        <div className="flex flex-col items-center gap-4">
          <label
            htmlFor={avatarInputId}
            className="group relative inline-flex cursor-pointer items-center justify-center"
          >
            <div
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-surface-muted ring-2 ring-surface"
              style={avatarStyle}
            >
              {hasAvatarImage ? (
                <img
                  src={avatarImage}
                  alt="Profile avatar"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span className="text-base font-semibold text-sky-50">{initials}</span>
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 inline-flex h-7 items-center justify-center rounded-full bg-surface px-2.5 text-xs font-medium text-muted-foreground ring-2 ring-surface group-hover:text-foreground">
              Upload
            </span>
          </label>
          <input
            id={avatarInputId}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={handleAvatarChange}
          />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">{displayName}</span>
            <span className="text-xs text-muted-foreground">Profile picture is visible only on this device</span>
          </div>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Avatar color and name help you recognize this workspace at a glance.
          </p>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-surface bg-surface px-4 py-5 md:px-6 md:py-6">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Personal information</p>
            <p className="text-xs text-muted-foreground">Update how this workspace appears across the app.</p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:gap-4">
          <label className="block text-sm font-medium text-muted-foreground">
            Display name
            <input
              type="text"
              defaultValue={profile.displayName}
              onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                onUpdate({ profile: { displayName: event.target.value } })
              }
              className="mt-1 w-full rounded-xl border border-surface bg-surface-muted px-4 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            />
          </label>
          <label className="block text-sm font-medium text-muted-foreground">
            Workspace label
            <input
              type="text"
              defaultValue={profile.workspaceName}
              onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                onUpdate({ profile: { workspaceName: event.target.value } })
              }
              className="mt-1 w-full rounded-xl border border-surface bg-surface-muted px-4 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            />
          </label>
        </div>
        <div className="mt-4 border-t border-surface pt-4">
          <p className="text-sm font-semibold text-foreground">Account actions</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Authentication is not enabled yet. These controls will connect to your account in a future release.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-surface bg-surface-muted px-4 py-2 text-xs font-medium text-muted-foreground"
              disabled
            >
              Log out
            </button>
            <button
              type="button"
              className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-red-500/60 bg-transparent px-4 py-2 text-xs font-medium text-red-300/80"
              disabled
            >
              Delete account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
