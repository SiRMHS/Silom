import { db } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";
import ServiceList, { type ServiceRow } from "@/components/admin/ServiceList";

export default async function ServicesPage() {
  await requireAdmin();

  const rows = await db.service.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: {
      id: true,
      slug: true,
      indexLabel: true,
      title: true,
      accent: true,
      visible: true,
      sections: true,
      image: { select: { url: true } },
      // Every case study filed here, published or not — the panel counts what
      // is linked, and the page itself is what hides the unpublished ones.
      _count: { select: { projects: true } },
    },
  });

  const services: ServiceRow[] = rows.map((s) => ({
    id: s.id,
    slug: s.slug,
    indexLabel: s.indexLabel,
    title: s.title,
    accent: s.accent,
    visible: s.visible,
    image: s.image?.url ?? null,
    sectionCount: Array.isArray(s.sections) ? s.sections.length : 0,
    projectCount: s._count.projects,
  }));

  return <ServiceList services={services} />;
}

export const metadata = { title: "خدمات | پنل مدیریت" };
