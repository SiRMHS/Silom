import { db } from "@rahyad/db";
import type { Prisma } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";
import PostList, { type PostRow } from "@/components/admin/PostList";

const PAGE_SIZES = [5, 10, 25, 50];
const DEFAULT_SIZE = 10;

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; size?: string }>;
}) {
  await requireAdmin();
  const { page: rawPage, q: rawQ, size: rawSize } = await searchParams;

  const q = (rawQ ?? "").trim();
  const size = PAGE_SIZES.includes(Number(rawSize)) ? Number(rawSize) : DEFAULT_SIZE;

  // Search spans the fields someone would actually recall a post by
  const where: Prisma.PostWhereInput = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { excerpt: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
        ],
      }
    : {};

  const total = await db.post.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / size));
  // Clamp rather than 404: deleting the last row of page 3 shouldn't dead-end
  const page = Math.min(Math.max(1, Number(rawPage) || 1), pageCount);

  const rows = await db.post.findMany({
    where,
    // Drafts have no publish date, so they sort to the top where they are
    // still being worked on rather than buried under the archive.
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * size,
    take: size,
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      accent: true,
      visible: true,
      readMinutes: true,
      publishedAt: true,
      cover: { select: { url: true } },
    },
  });

  const posts: PostRow[] = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    category: p.category,
    accent: p.accent,
    visible: p.visible,
    readMinutes: p.readMinutes,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    cover: p.cover?.url ?? null,
  }));

  return (
    <PostList
      posts={posts}
      page={page}
      pageCount={pageCount}
      total={total}
      size={size}
      sizes={PAGE_SIZES}
      q={q}
    />
  );
}

export const metadata = { title: "مجله | پنل مدیریت" };
