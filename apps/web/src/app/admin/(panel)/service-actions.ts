"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";
import {
  normaliseSlug,
  readColor,
  readFaqs,
  readGalleryPicks,
  readSections,
  readTags,
  readText,
} from "@/lib/admin/form-fields";

/**
 * Services left the generic collection editor when they grew a page of their
 * own: a unique slug the route depends on, rich text to sanitise, a gallery and
 * a set of questions. They are edited like projects now, and for the same
 * reasons.
 */

export type ServiceResult = { ok: true; id?: string } | { ok: false; error: string };

function revalidateAll(slug?: string) {
  // The home page's accordion reads the same rows, so an edit here is an edit
  // to the front page as well.
  revalidatePath("/", "layout");
  revalidatePath("/services");
  if (slug) revalidatePath(`/services/${slug}`);
  // Case studies show their services as chips
  revalidatePath("/projects", "layout");
  revalidatePath("/admin/services");
}

/** First unused `slug`, `slug-2`, `slug-3`… ignoring the row being saved. */
async function freeSlug(base: string, ignoreId?: string) {
  for (let n = 1; n < 500; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const clash = await db.service.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash || clash.id === ignoreId) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/** The gallery as join rows, with every id checked against the library. */
async function readGallery(formData: FormData) {
  const picks = readGalleryPicks(formData);
  if (picks.length === 0) return [];

  const known = new Set(
    (
      await db.media.findMany({
        where: { id: { in: [...new Set(picks)] } },
        select: { id: true },
      })
    ).map((m) => m.id),
  );

  return picks.filter((id) => known.has(id)).map((mediaId, order) => ({ mediaId, order }));
}

export async function saveService(id: string, formData: FormData): Promise<ServiceResult> {
  await requireAdmin();

  const existing = await db.service.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) return { ok: false, error: "خدمت پیدا نشد" };

  const title = readText(formData, "title", 200);
  if (!title) return { ok: false, error: "عنوان را خالی نگذارید" };

  const rawSlug = readText(formData, "slug", 200) || title;
  const gallery = await readGallery(formData);

  try {
    const updated = await db.service.update({
      where: { id },
      data: {
        title,
        slug: await freeSlug(normaliseSlug(rawSlug, "service"), id),
        indexLabel: readText(formData, "indexLabel", 12),
        accent: readColor(formData, "accent", "#ef4444"),
        body: readText(formData, "body", 600),
        tags: readTags(formData, "tags"),
        headline: readText(formData, "headline", 200),
        excerpt: readText(formData, "excerpt", 600),
        ctaTitle: readText(formData, "ctaTitle", 200),
        ctaNote: readText(formData, "ctaNote", 400),
        sections: readSections(formData),
        faqs: readFaqs(formData),
        imageId: readText(formData, "imageId", 40) || null,
        filmId: readText(formData, "filmId", 40) || null,
        visible: formData.has("visible"),
        // Rewritten wholesale: the posted list is the gallery, and its rows
        // carry nothing worth preserving beyond their order.
        gallery: { deleteMany: {}, create: gallery },
      },
      select: { slug: true },
    });

    revalidateAll(updated.slug);
    // The old URL is gone if the slug moved, so drop its cached page too
    if (existing.slug !== updated.slug) revalidatePath(`/services/${existing.slug}`);
  } catch (e) {
    console.error("[admin] saveService", e);
    return { ok: false, error: "ذخیره نشد" };
  }

  return { ok: true, id };
}

/** Creates a blank service and drops the admin straight into its editor. */
export async function createService() {
  await requireAdmin();

  const max = await db.service.aggregate({ _max: { order: true } });
  const order = (max._max.order ?? -1) + 1;

  const service = await db.service.create({
    data: {
      slug: await freeSlug("service"),
      // The accordion numbers its rows by hand, so a new one continues the
      // sequence rather than starting over at ۰۱.
      indexLabel: (order + 1).toLocaleString("fa-IR").padStart(2, "۰"),
      title: "خدمت تازه",
      body: "",
      tags: [],
      accent: "#ef4444",
      sections: [],
      faqs: [],
      // New rows start hidden: an unwritten service should not appear on the
      // home page before anyone has described it.
      visible: false,
      order,
    },
    select: { id: true },
  });

  revalidateAll();
  redirect(`/admin/services/${service.id}`);
}

export async function duplicateService(id: string): Promise<ServiceResult> {
  await requireAdmin();

  const source = await db.service.findUnique({
    where: { id },
    include: {
      gallery: { orderBy: [{ order: "asc" }, { id: "asc" }], select: { mediaId: true } },
    },
  });
  if (!source) return { ok: false, error: "خدمت پیدا نشد" };

  const max = await db.service.aggregate({ _max: { order: true } });
  const copy = await db.service.create({
    data: {
      slug: await freeSlug(`${source.slug}-copy`),
      indexLabel: source.indexLabel,
      title: `${source.title} (رونوشت)`,
      body: source.body,
      tags: source.tags,
      accent: source.accent,
      headline: source.headline,
      excerpt: source.excerpt,
      ctaTitle: source.ctaTitle,
      ctaNote: source.ctaNote,
      sections: source.sections ?? [],
      faqs: source.faqs ?? [],
      imageId: source.imageId,
      filmId: source.filmId,
      visible: false,
      order: (max._max.order ?? -1) + 1,
      gallery: { create: source.gallery.map((g, order) => ({ mediaId: g.mediaId, order })) },
    },
    select: { id: true },
  });

  revalidateAll();
  return { ok: true, id: copy.id };
}

export async function deleteService(id: string): Promise<ServiceResult> {
  await requireAdmin();

  try {
    // The join rows to projects cascade, so a deleted service takes its chips
    // with it rather than leaving case studies pointing at nothing.
    const gone = await db.service.delete({ where: { id }, select: { slug: true } });
    revalidateAll(gone.slug);
  } catch (e) {
    console.error("[admin] deleteService", e);
    return { ok: false, error: "حذف نشد" };
  }

  return { ok: true };
}

export async function setServiceVisible(id: string, visible: boolean): Promise<ServiceResult> {
  await requireAdmin();

  const row = await db.service.update({
    where: { id },
    data: { visible },
    select: { slug: true },
  });

  revalidateAll(row.slug);
  return { ok: true };
}

/**
 * Moves a service one step in the list by rewriting positions from the
 * reordered array — neighbours can share an `order` value after a bulk insert,
 * so trading two numbers is not enough.
 */
export async function moveService(id: string, direction: "up" | "down"): Promise<ServiceResult> {
  await requireAdmin();

  const rows = await db.service.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return { ok: false, error: "خدمت پیدا نشد" };

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= rows.length) return { ok: true };

  const reordered = [...rows];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  for (const [i, row] of reordered.entries()) {
    await db.service.update({ where: { id: row.id }, data: { order: i } });
  }

  revalidateAll();
  return { ok: true };
}
