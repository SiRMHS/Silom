import "server-only";

import { db } from "@rahyad/db";
import { COLLECTIONS, type ModelKey } from "@rahyad/core/admin";
import type { MediaItem } from "./media-actions";
import type { Row } from "@/components/admin/CollectionEditor";

/**
 * Loads one collection plus, if any of its fields is an image, the media
 * library the pickers browse.
 */
export async function loadCollection(model: ModelKey): Promise<{ rows: Row[]; media: MediaItem[] }> {
  const def = COLLECTIONS[model];
  const delegate = (db as unknown as Record<ModelKey, { findMany(args: unknown): Promise<Row[]> }>)[
    model
  ];

  const needsMedia = def.fields.some((f) => f.type === "image");

  const [rows, media] = await Promise.all([
    delegate.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }),
    needsMedia
      ? db.media.findMany({
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            url: true,
            filename: true,
            alt: true,
            width: true,
            height: true,
            size: true,
            mimeType: true,
          },
        })
      : Promise.resolve([] as MediaItem[]),
  ]);

  return { rows, media };
}
