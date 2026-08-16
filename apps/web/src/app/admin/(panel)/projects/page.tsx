import { db } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";
import ProjectList, { type ProjectRow } from "@/components/admin/ProjectList";
import type { Prisma } from "@rahyad/db";

const PAGE_SIZES = [5, 10, 25, 50];
const DEFAULT_SIZE = 10;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; size?: string }>;
}) {
  await requireAdmin();
  const { page: rawPage, q: rawQ, size: rawSize } = await searchParams;

  const q = (rawQ ?? "").trim();
  const size = PAGE_SIZES.includes(Number(rawSize)) ? Number(rawSize) : DEFAULT_SIZE;

  // Search spans the fields someone would actually recall a project by
  const where: Prisma.ProjectWhereInput = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { client: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
        ],
      }
    : {};

  const total = await db.project.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / size));
  // Clamp rather than 404: deleting the last row of page 3 shouldn't dead-end
  const page = Math.min(Math.max(1, Number(rawPage) || 1), pageCount);

  const rows = await db.project.findMany({
    where,
    orderBy: [{ order: "asc" }, { id: "asc" }],
    skip: (page - 1) * size,
    take: size,
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      year: true,
      color: true,
      visible: true,
      order: true,
      tags: true,
      sections: true,
      image: { select: { url: true } },
    },
  });

  const projects: ProjectRow[] = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    category: p.category,
    year: p.year,
    color: p.color,
    visible: p.visible,
    tags: p.tags,
    image: p.image?.url ?? null,
    sectionCount: Array.isArray(p.sections) ? p.sections.length : 0,
  }));

  return (
    <ProjectList
      projects={projects}
      page={page}
      pageCount={pageCount}
      total={total}
      size={size}
      sizes={PAGE_SIZES}
      q={q}
      // Ordering is global, so the arrows are meaningless on a filtered or
      // partial view — the list says so instead of moving rows unpredictably.
      canReorder={!q}
      isFirstPage={page === 1}
      isLastPage={page === pageCount}
    />
  );
}

export const metadata = { title: "پروژه‌ها | پنل مدیریت" };
