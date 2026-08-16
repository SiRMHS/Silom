"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";
import { richTextToPlain, sanitizeRichText } from "@rahyad/core/admin/sanitize";

/**
 * Magazine posts get their own actions for the same reasons projects do: a
 * unique slug that a public URL depends on, and rich text that has to be
 * sanitised before it is stored.
 */

export type PostResult = { ok: true; id?: string } | { ok: false; error: string };

const HEX = /^#[0-9a-fA-F]{3,8}$/;

/** Persian and Latin both land near this once whitespace is normalised. */
const WORDS_PER_MINUTE = 220;

function revalidateAll(slug?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/magazine");
  if (slug) revalidatePath(`/magazine/${slug}`);
  revalidatePath("/admin/posts");
}

/** URL-safe, lowercase, no leading/trailing dashes; never empty. */
function normaliseSlug(raw: string) {
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "post"
  );
}

/** First unused `slug`, `slug-2`, `slug-3`… ignoring the row being saved. */
async function freeSlug(base: string, ignoreId?: string) {
  for (let n = 1; n < 500; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const clash = await db.post.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash || clash.id === ignoreId) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/**
 * FAQ rows arrive as faq.q.<i> / faq.a.<i>, index order being display order.
 * A row missing either half is dropped — a question with no answer is worse
 * than no question at all.
 */
function readFaqs(formData: FormData) {
  const rows: { index: number; q: string; a: string }[] = [];

  for (const [key, value] of formData.entries()) {
    const match = /^faq\.q\.(\d+)$/.exec(key);
    if (!match) continue;
    const index = Number(match[1]);
    rows.push({
      index,
      q: String(value).trim().slice(0, 300),
      a: String(formData.get(`faq.a.${index}`) ?? "").trim().slice(0, 2000),
    });
  }

  return rows
    .sort((a, b) => a.index - b.index)
    .filter((r) => r.q && r.a)
    .slice(0, 30)
    .map((r) => ({ q: r.q, a: r.a }));
}

/** At least a minute, so a short post never advertises "۰ دقیقه". */
function readingMinutes(html: string) {
  const words = richTextToPlain(html, 100_000).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export async function savePost(id: string, formData: FormData): Promise<PostResult> {
  await requireAdmin();

  const existing = await db.post.findUnique({
    where: { id },
    select: { slug: true, publishedAt: true },
  });
  if (!existing) return { ok: false, error: "نوشته پیدا نشد" };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "عنوان را خالی نگذارید" };

  const rawSlug = String(formData.get("slug") ?? "").trim() || title;
  const accent = String(formData.get("accent") ?? "").trim();
  const body = sanitizeRichText(String(formData.get("body") ?? ""));
  const visible = formData.has("visible");

  // The excerpt is what the archive card and the search description show, so
  // an empty one is filled from the opening of the article rather than left
  // blank.
  const excerpt =
    String(formData.get("excerpt") ?? "")
      .trim()
      .slice(0, 400) || richTextToPlain(body, 180);

  try {
    const updated = await db.post.update({
      where: { id },
      data: {
        title: title.slice(0, 200),
        slug: await freeSlug(normaliseSlug(rawSlug), id),
        excerpt,
        body,
        category: String(formData.get("category") ?? "").trim().slice(0, 120),
        tags: String(formData.get("tags") ?? "")
          .split(/[,،]/)
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 20),
        accent: HEX.test(accent) ? accent : "#ef4444",
        readMinutes: readingMinutes(body),
        faqs: readFaqs(formData),
        coverId: String(formData.get("coverId") ?? "").trim() || null,
        visible,
        // Stamped the first time a post goes live and then left alone, so
        // editing an old article doesn't move it to the top of the archive.
        publishedAt: existing.publishedAt ?? (visible ? new Date() : null),
      },
      select: { slug: true },
    });

    revalidateAll(updated.slug);
    if (existing.slug !== updated.slug) revalidatePath(`/magazine/${existing.slug}`);
  } catch (e) {
    console.error("[admin] savePost", e);
    return { ok: false, error: "ذخیره نشد" };
  }

  return { ok: true, id };
}

/** Creates a blank post and drops the admin straight into its editor. */
export async function createPost() {
  await requireAdmin();

  const post = await db.post.create({
    data: {
      slug: await freeSlug("post"),
      title: "نوشته‌ی تازه",
      excerpt: "",
      body: "",
      category: "",
      tags: [],
      accent: "#ef4444",
      readMinutes: 1,
      faqs: [],
      // New rows start hidden: an empty article should not appear in the
      // archive before anyone has written it.
      visible: false,
    },
    select: { id: true },
  });

  revalidateAll();
  redirect(`/admin/posts/${post.id}`);
}

export async function deletePost(id: string): Promise<PostResult> {
  await requireAdmin();

  try {
    const gone = await db.post.delete({ where: { id }, select: { slug: true } });
    revalidateAll(gone.slug);
  } catch (e) {
    console.error("[admin] deletePost", e);
    return { ok: false, error: "حذف نشد" };
  }

  return { ok: true };
}

export async function setPostVisible(id: string, visible: boolean): Promise<PostResult> {
  await requireAdmin();

  const current = await db.post.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!current) return { ok: false, error: "نوشته پیدا نشد" };

  const row = await db.post.update({
    where: { id },
    data: {
      visible,
      publishedAt: current.publishedAt ?? (visible ? new Date() : null),
    },
    select: { slug: true },
  });

  revalidateAll(row.slug);
  return { ok: true };
}
