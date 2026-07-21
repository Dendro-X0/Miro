"use client";

import type { ReactElement } from "react";
import { Trash2 } from "lucide-react";
import type { GalleryAsset } from "../lib/gallery";

interface GalleryViewProps {
  readonly assets: readonly GalleryAsset[];
  readonly encrypted: boolean;
  readonly onDelete: (assetId: string) => void;
}

export default function GalleryView(props: GalleryViewProps): ReactElement {
  const { assets, encrypted, onDelete } = props;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 pb-4">
      <div className="px-1">
        <p className="text-sm text-muted-foreground">
          {encrypted
            ? "Images are stored in the encrypted desktop vault."
            : "Images are stored in this browser (localStorage). Use desktop for an encrypted vault."}
        </p>
      </div>
      {assets.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center">
          <div className="max-w-md">
            <h2 className="text-lg font-semibold text-foreground">No images yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Switch assistant mode to Image and generate something — it will show up here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
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
              <figcaption className="flex items-start justify-between gap-2 p-3">
                <p className="line-clamp-2 text-xs text-muted-foreground">{asset.prompt}</p>
                <button
                  type="button"
                  onClick={() => onDelete(asset.id)}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground hover:bg-red-500/80 hover:text-slate-950"
                  aria-label="Delete image"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
