import { db } from "@rahyad/db";
import type { Prisma } from "@rahyad/db";
import { requireAdmin } from "@/lib/auth";
import CommentList, { type CommentRow } from "@/components/admin/CommentList";

const FILTERS = ["pending", "approved", "all"] as const;
type Filter = (typeof FILTERS)[number];

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireAdmin();
  const { filter: raw } = await searchParams;

  // The queue is the default view: what needs a decision comes first.
  const filter: Filter = FILTERS.includes(raw as Filter) ? (raw as Filter) : "pending";

  const where: Prisma.PostCommentWhereInput =
    filter === "all" ? {} : { approved: filter === "approved" };

  const [rows, pending] = await Promise.all([
    db.postComment.findMany({
      where,
      // Pending first shows the oldest unanswered comment at the top; the
      // published list reads newest first like the site does.
      orderBy: { createdAt: filter === "pending" ? "asc" : "desc" },
      take: 200,
      select: {
        id: true,
        author: true,
        body: true,
        approved: true,
        createdAt: true,
        post: { select: { id: true, title: true, slug: true } },
      },
    }),
    db.postComment.count({ where: { approved: false } }),
  ]);

  const comments: CommentRow[] = rows.map((c) => ({
    id: c.id,
    author: c.author,
    body: c.body,
    approved: c.approved,
    createdAt: c.createdAt.toISOString(),
    postId: c.post.id,
    postTitle: c.post.title,
    postSlug: c.post.slug,
  }));

  return <CommentList comments={comments} pending={pending} filter={filter} />;
}

export const metadata = { title: "نظرها | پنل مدیریت" };
