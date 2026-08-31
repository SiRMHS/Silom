import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@rahyad/db";
import { getCurrentUser } from "@/lib/auth";
import { readImageSize } from "@rahyad/core";

/**
 * Media uploads for the admin panel.
 *
 * Files land in public/uploads and are read back by app/uploads/[...path], not
 * by Next's static handler — that one enumerates public/ once at startup, so it
 * only ever serves uploads that predate the running container.
 *
 * The stored name is generated rather than taken from the client — an
 * attacker-chosen name is the whole path-traversal class of bug, and a
 * predictable one lets uploads clobber each other.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 24 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  // Silent looping clips stand in for a portrait on team cards, so the same
  // library holds them; a bigger ceiling because even a short clip outweighs
  // any still.
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

/** Keeps a readable trace of the original name without trusting any of it. */
function slugify(name: string) {
  return (
    path
      .parse(name)
      .name.toLowerCase()
      .replace(/[^a-z0-9؀-ۿ]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "file"
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "دسترسی ندارید" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const alt = String(form.get("alt") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "فایلی فرستاده نشد" }, { status: 400 });
  }

  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "فقط JPG، PNG، WebP، AVIF، GIF، SVG، MP4 و WebM پذیرفته می‌شود" },
      { status: 415 },
    );
  }

  const isVideo = file.type.startsWith("video/");
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    return NextResponse.json(
      { error: isVideo ? "حجم ویدیو بیشتر از ۲۴ مگابایت است" : "حجم فایل بیشتر از ۸ مگابایت است" },
      { status: 413 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // SVG is an executable document; serving one from our own origin hands the
  // uploader script execution on the site. Store it, but never inline-render it.
  const filename = `${slugify(file.name)}-${randomBytes(6).toString("hex")}${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);

  const size = readImageSize(bytes, file.type);

  const media = await db.media.create({
    data: {
      url: `/uploads/${filename}`,
      filename: file.name.slice(0, 120),
      mimeType: file.type,
      size: file.size,
      width: size?.width ?? null,
      height: size?.height ?? null,
      alt,
      uploadedBy: user.id,
    },
  });

  return NextResponse.json({ media });
}
