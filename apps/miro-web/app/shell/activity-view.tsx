"use client";

import type { ReactElement } from "react";
import { ImageIcon, MessageCircle } from "lucide-react";
import type { GalleryAsset } from "../lib/gallery";
import PageFrame from "./page-frame";

export interface ActivitySessionItem {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: number;
}

interface ActivityViewProps {
  readonly sessions: readonly ActivitySessionItem[];
  readonly assets: readonly GalleryAsset[];
  readonly onOpenChat: (sessionId: string) => void;
  readonly onOpenGallery: () => void;
  readonly onReuseImagePrompt: (prompt: string) => void;
}

function formatRelativeTime(timestamp: number): string {
  const deltaMs = Date.now() - timestamp;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (deltaMs < minute) {
    return "Just now";
  }
  if (deltaMs < hour) {
    const mins = Math.max(1, Math.floor(deltaMs / minute));
    return `${mins}m ago`;
  }
  if (deltaMs < day) {
    const hours = Math.floor(deltaMs / hour);
    return `${hours}h ago`;
  }
  const days = Math.floor(deltaMs / day);
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString();
}

export default function ActivityView(props: ActivityViewProps): ReactElement {
  const { sessions, assets, onOpenChat, onOpenGallery, onReuseImagePrompt } = props;
  const recentSessions = [...sessions]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 12);
  const recentAssets = [...assets]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8);
  const isEmpty = recentSessions.length === 0 && recentAssets.length === 0;

  return (
    <PageFrame
      title="Activity"
      description="Recent chats and generated images from this device."
    >
      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center">
          <div className="max-w-md">
            <h3 className="text-base font-semibold text-foreground">No recent activity yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Start a chat or generate an image — they will show up here.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto scroll-area chat-scroll-touch pr-1">
          <section aria-label="Recent chats">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent chats
            </h3>
            {recentSessions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No chats yet.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {recentSessions.map((session) => (
                  <li key={session.id}>
                    <button
                      type="button"
                      onClick={(): void => onOpenChat(session.id)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-surface hover:bg-surface-muted"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-muted-foreground">
                        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {session.title}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {formatRelativeTime(session.updatedAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Recent images">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recent images
              </h3>
              {recentAssets.length > 0 ? (
                <button
                  type="button"
                  onClick={onOpenGallery}
                  className="text-[11px] font-medium text-sky-400 hover:text-sky-300"
                >
                  Open Gallery
                </button>
              ) : null}
            </div>
            {recentAssets.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No images yet.</p>
            ) : (
              <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {recentAssets.map((asset) => (
                  <li
                    key={asset.id}
                    className="flex items-center gap-3 rounded-2xl border border-surface bg-surface-muted/40 p-2"
                  >
                    <button
                      type="button"
                      onClick={onOpenGallery}
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl"
                      aria-label="Open gallery"
                    >
                      <img
                        src={asset.dataUrl}
                        alt={asset.prompt || "Generated image"}
                        className="h-full w-full object-cover"
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs text-foreground">
                        {asset.prompt || "Untitled image"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatRelativeTime(asset.createdAt)}
                      </p>
                      {asset.prompt.trim() ? (
                        <button
                          type="button"
                          onClick={(): void => onReuseImagePrompt(asset.prompt)}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-sky-400 hover:text-sky-300"
                        >
                          <ImageIcon className="h-3 w-3" aria-hidden="true" />
                          Reuse in Chat
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </PageFrame>
  );
}
