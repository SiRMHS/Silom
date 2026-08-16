import { notFound } from "next/navigation";
import { db } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";
import ServiceEditor from "@/components/admin/ServiceEditor";
import { toFaqs } from "@rahyad/core";
import type { MediaItem } from "../../media-actions";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [service, media] = await Promise.all([
    db.service.findUnique({
      where: { id },
      include: {
        gallery: { orderBy: [{ order: "asc" }, { id: "asc" }], select: { mediaId: true } },
        _count: { select: { projects: true } },
      },
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

  if (!service) notFound();

  const sections = Array.isArray(service.sections)
    ? (service.sections as { h?: string; p?: string }[]).map((s) => ({
        h: String(s?.h ?? ""),
        p: String(s?.p ?? ""),
      }))
    : [];

  return (
    <ServiceEditor
      media={media as MediaItem[]}
      service={{
        id: service.id,
        slug: service.slug,
        indexLabel: service.indexLabel,
        title: service.title,
        body: service.body,
        tags: service.tags,
        accent: service.accent,
        headline: service.headline,
        excerpt: service.excerpt,
        ctaTitle: service.ctaTitle,
        ctaNote: service.ctaNote,
        sections,
        faqs: toFaqs(service.faqs),
        imageId: service.imageId,
        filmId: service.filmId,
        gallery: service.gallery.map((g) => g.mediaId),
        visible: service.visible,
        projectCount: service._count.projects,
      }}
    />
  );
}
