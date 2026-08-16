import { notFound } from "next/navigation";
import { db } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";
import ProjectEditor from "@/components/admin/ProjectEditor";
import { toFaqs } from "@rahyad/core";
import type { MediaItem } from "../../media-actions";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [project, services, media] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: {
        gallery: { orderBy: [{ order: "asc" }, { id: "asc" }], select: { mediaId: true } },
        services: { orderBy: [{ order: "asc" }], select: { serviceId: true } },
      },
    }),
    // Hidden services are offered too: filing a case study under one is how it
    // gets a page worth publishing.
    db.service.findMany({
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: { id: true, title: true, accent: true, visible: true },
    }),
    db.media.findMany({
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
    }),
  ]);

  if (!project) notFound();

  const sections = Array.isArray(project.sections)
    ? (project.sections as { h?: string; p?: string }[]).map((s) => ({
        h: String(s?.h ?? ""),
        p: String(s?.p ?? ""),
      }))
    : [];

  return (
    <ProjectEditor
      media={media as MediaItem[]}
      services={services}
      project={{
        id: project.id,
        slug: project.slug,
        title: project.title,
        category: project.category,
        year: project.year,
        tags: project.tags,
        color: project.color,
        client: project.client,
        role: project.role,
        summary: project.summary,
        sections,
        faqs: toFaqs(project.faqs),
        imageId: project.imageId,
        filmId: project.filmId,
        gallery: project.gallery.map((g) => g.mediaId),
        services: project.services.map((s) => s.serviceId),
        col: project.col,
        row: project.row,
        w: project.w,
        h: project.h,
        visible: project.visible,
      }}
    />
  );
}
