"use server";

import { unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { db } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";

export type MediaItem = {
  id: string;
  url: string;
  filename: string;
  alt: string;
  width: number | null;
  height: number | null;
  size: number;
  mimeType: string;
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function listMedia(): Promise<MediaItem[]> {
  await requireAdmin();
  return db.media.findMany({
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
  });
}

export async function updateMediaAlt(id: string, alt: string) {
  await requireAdmin();
  await db.media.update({ where: { id }, data: { alt: alt.slice(0, 300) } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function deleteMedia(id: string) {
  await requireAdmin();

  const media = await db.media.findUnique({ where: { id } });
  if (!media) return { ok: false as const, error: "پیدا نشد" };

  // Rows referencing this image are set to NULL by the schema, so the delete
  // is safe even while the picture is in use.
  await db.media.delete({ where: { id } });

  // Resolve before unlinking: the row is ours, but a stored path that climbs
  // out of public/uploads must never reach the filesystem call.
  const target = path.resolve(UPLOAD_DIR, path.basename(media.url));
  if (target.startsWith(UPLOAD_DIR + path.sep)) {
    await unlink(target).catch(() => {});
  }

  revalidatePath("/", "layout");
  revalidatePath("/projects");
  return { ok: true as const };
}
