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
  readInt,
  readSections,
  readTags,
  readText,
} from "@/lib/admin/form-fields";

/**
 * Projects have their own actions rather than riding the generic collection
 * ones: a unique slug to keep URL-safe, rich text to sanitise, and a case-study
 * page whose route depends on the slug staying stable.
 */

export type ProjectResult = { ok: true; id?: string } | { ok: false; error: string };

function revalidateAll(slug?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/projects");
  if (slug) revalidatePath(`/projects/${slug}`);
  // A project's service chips are its own page, but the case studies listed on
  // a service page come from this row too.
  revalidatePath("/services", "layout");
  revalidatePath("/admin/projects");
}

/** First unused `slug`, `slug-2`, `slug-3`… ignoring the row being saved. */
async function freeSlug(base: string, ignoreId?: string) {
  for (let n = 1; n < 500; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const clash = await db.project.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!clash || clash.id === ignoreId) return candidate;
  }
  return `${base}-${Date.now()}`;
}

/**
 * The gallery, as join rows. Ids are checked against the library before they
 * are written, so a stale field from a deleted file can't break the save with a
 * foreign key error.
 */
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

/**
 * Which services this project is an example of — checkboxes named `service`,
 * one value per box. Checked against the table for the same reason the gallery
 * is, and stored in the order the panel lists services in.
 */
async function readServices(formData: FormData) {
  const picked = formData
    .getAll("service")
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (picked.length === 0) return [];

  const known = await db.service.findMany({
    where: { id: { in: [...new Set(picked)] } },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  return known.map((s, order) => ({ serviceId: s.id, order }));
}

export async function saveProject(id: string, formData: FormData): Promise<ProjectResult> {
  await requireAdmin();

  const existing = await db.project.findUnique({ where: { id }, select: { slug: true } });
  if (!existing) return { ok: false, error: "پروژه پیدا نشد" };

  const title = readText(formData, "title", 200);
  if (!title) return { ok: false, error: "عنوان را خالی نگذارید" };

  const rawSlug = readText(formData, "slug", 200) || title;
  const [gallery, services] = await Promise.all([
    readGallery(formData),
    readServices(formData),
  ]);

  try {
    const updated = await db.project.update({
      where: { id },
      data: {
        title,
        slug: await freeSlug(normaliseSlug(rawSlug, "project"), id),
        category: readText(formData, "category", 120),
        year: readText(formData, "year", 20),
        tags: readTags(formData, "tags"),
        color: readColor(formData, "color", "#3b6ef5"),
        client: readText(formData, "client", 200),
        role: readText(formData, "role", 200),
        summary: readText(formData, "summary", 600),
        sections: readSections(formData),
        faqs: readFaqs(formData),
        imageId: readText(formData, "imageId", 40) || null,
        filmId: readText(formData, "filmId", 40) || null,
        col: readInt(formData, "col", 0),
        row: readInt(formData, "row", 0),
        w: readInt(formData, "w", 2),
        h: readInt(formData, "h", 1),
        visible: formData.has("visible"),
        // Rewritten wholesale: the posted lists are the gallery and the service
        // links, and their rows carry nothing worth preserving beyond order.
        gallery: { deleteMany: {}, create: gallery },
        services: { deleteMany: {}, create: services },
      },
      select: { slug: true },
    });

    revalidateAll(updated.slug);
    // The old URL is gone if the slug moved, so drop its cached page too
    if (existing.slug !== updated.slug) revalidatePath(`/projects/${existing.slug}`);
  } catch (e) {
    console.error("[admin] saveProject", e);
    return { ok: false, error: "ذخیره نشد" };
  }

  return { ok: true, id };
}

/** Creates a blank project and drops the admin straight into its editor. */
export async function createProject() {
  await requireAdmin();

  const max = await db.project.aggregate({ _max: { order: true } });
  const project = await db.project.create({
    data: {
      slug: await freeSlug("project"),
      title: "پروژه‌ی تازه",
      category: "",
      year: new Date().toLocaleDateString("fa-IR-u-ca-persian", { year: "numeric" }),
      tags: [],
      color: "#3b6ef5",
      client: "",
      role: "",
      summary: "",
      sections: [],
      faqs: [],
      col: 0,
      row: 0,
      w: 2,
      h: 1,
      // New rows start hidden: an empty case study should not appear on the
      // canvas before anyone has written it.
      visible: false,
      order: (max._max.order ?? -1) + 1,
    },
    select: { id: true },
  });

  revalidateAll();
  redirect(`/admin/projects/${project.id}`);
}

export async function duplicateProject(id: string): Promise<ProjectResult> {
  await requireAdmin();

  const source = await db.project.findUnique({
    where: { id },
    include: {
      gallery: { orderBy: [{ order: "asc" }, { id: "asc" }], select: { mediaId: true } },
      services: { orderBy: [{ order: "asc" }], select: { serviceId: true } },
    },
  });
  if (!source) return { ok: false, error: "پروژه پیدا نشد" };

  const max = await db.project.aggregate({ _max: { order: true } });
  const copy = await db.project.create({
    data: {
      slug: await freeSlug(`${source.slug}-copy`),
      title: `${source.title} (رونوشت)`,
      category: source.category,
      year: source.year,
      tags: source.tags,
      color: source.color,
      client: source.client,
      role: source.role,
      summary: source.summary,
      sections: source.sections ?? [],
      faqs: source.faqs ?? [],
      imageId: source.imageId,
      filmId: source.filmId,
      col: source.col,
      row: source.row,
      w: source.w,
      h: source.h,
      visible: false,
      order: (max._max.order ?? -1) + 1,
      gallery: {
        create: source.gallery.map((g, order) => ({ mediaId: g.mediaId, order })),
      },
      services: {
        create: source.services.map((s, order) => ({ serviceId: s.serviceId, order })),
      },
    },
    select: { id: true },
  });

  revalidateAll();
  return { ok: true, id: copy.id };
}

export async function deleteProject(id: string): Promise<ProjectResult> {
  await requireAdmin();

  try {
    const gone = await db.project.delete({ where: { id }, select: { slug: true } });
    revalidateAll(gone.slug);
  } catch (e) {
    console.error("[admin] deleteProject", e);
    return { ok: false, error: "حذف نشد" };
  }

  return { ok: true };
}

export async function setProjectVisible(id: string, visible: boolean): Promise<ProjectResult> {
  await requireAdmin();

  const row = await db.project.update({
    where: { id },
    data: { visible },
    select: { slug: true },
  });

  revalidateAll(row.slug);
  return { ok: true };
}

/**
 * Moves a project one step in the canvas order by rewriting positions from the
 * reordered array — neighbours can share an `order` value after a bulk insert,
 * so trading two numbers is not enough.
 */
export async function moveProject(id: string, direction: "up" | "down"): Promise<ProjectResult> {
  await requireAdmin();

  const rows = await db.project.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return { ok: false, error: "پروژه پیدا نشد" };

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= rows.length) return { ok: true };

  const reordered = [...rows];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  for (const [i, row] of reordered.entries()) {
    await db.project.update({ where: { id: row.id }, data: { order: i } });
  }

  revalidateAll();
  return { ok: true };
}
