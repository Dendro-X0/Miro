"use client";

import type { ReactElement } from "react";
import { Copy, MessageSquarePlus, Trash2 } from "lucide-react";
import type { GalleryAsset } from "../lib/gallery";
import PageFrame from "./page-frame";

interface GalleryViewProps {
  readonly assets: readonly GalleryAsset[];
  readonly encrypted: boolean;
  readonly onDelete: (assetId: string) => void;
  readonly onReuseInChat: (prompt: string) => void;
  readonly onGoToChat?: () => void;
}

export default function GalleryView(props: GalleryViewProps): ReactElement {
  const { assets, encrypted, onDelete, onReuseInChat, onGoToChat } = props;

  return (
    <PageFrame
      title="Gallery"
      description={
        encrypted
          ? "Images are stored in the encrypted desktop vault."
          : "Images are stored in this browser (localStorage). Use desktop for an encrypted vault."
      }
    >
      {assets.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center">
          <div className="max-w-md">
            <h3 className="text-base font-semibold text-foreground">No images yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Switch assistant mode to Image and generate something — it will show up here.
            </p>
            {onGoToChat ? (
              <button
                type="button"
                onClick={onGoToChat}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-sky-500/90 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-sky-400"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
                Generate in Chat
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto scroll-area chat-scroll-touch sm:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <figure
              key={asset.id}
              className="group relative overflow-hidden rounded-2xl border border-surface surface-bubble-muted"
            >
              <img
                src={asset.dataUrl}
                alt={asset.prompt || "Generated image"}
                className="aspect-square w-full object-cover"
              />
              <figcaption className="space-y-2 p-3">
                <p className="line-clamp-2 text-xs text-muted-foreground">{asset.prompt}</p>
                <div className="flex items-center justify-end gap-1.5">
                  {asset.prompt.trim() ? (
                    <button
                      type="button"
                      onClick={() => onReuseInChat(asset.prompt)}
                      className="inline-flex h-7 items-center gap-1 rounded-full bg-surface-muted px-2.5 text-[11px] font-medium text-foreground hover:bg-sky-500/90 hover:text-slate-950"
                      aria-label="Reuse prompt in Chat"
                    >
                      <Copy className="h-3 w-3" aria-hidden="true" />
                      Reuse in Chat
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onDelete(asset.id)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground hover:bg-red-500/80 hover:text-slate-950"
                    aria-label="Delete image"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
