import "server-only";

import { db } from "@rahyad/db";
import { toFaqs, type Faq } from "./faq";

/**
 * The magazine — the site's long-form writing.
 *
 * Reads mirror `content.ts`: visible rows only, ordered newest first, with
 * every field already in the shape the pages render. `body` is deliberately
 * left out of list reads so an archive of fifty posts doesn't drag fifty
 * article bodies across the wire.
 */

const COVER = { select: { url: true, alt: true, width: true, height: true } } as const;

export type PostCover = {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
};

export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  accent: string;
  readMinutes: number;
  cover: PostCover | null;
  /** ISO string, or null for a post that has never been published. */
  publishedAt: string | null;
};

export type Post = PostSummary & { body: string; faqs: Faq[] };

const summarySelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  category: true,
  tags: true,
  accent: true,
  readMinutes: true,
  publishedAt: true,
  cover: COVER,
} as const;

type SummaryRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  accent: string;
  readMinutes: number;
  publishedAt: Date | null;
  cover: { url: string; alt: string; width: number | null; height: number | null } | null;
};

// Dates cross into client components, where a Date instance would have to be
// serialised anyway — so they leave here as ISO strings.
const toSummary = (p: SummaryRow): PostSummary => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  excerpt: p.excerpt,
  category: p.category,
  tags: p.tags,
  accent: p.accent,
  readMinutes: p.readMinutes,
  cover: p.cover,
  publishedAt: p.publishedAt?.toISOString() ?? null,
});

/**
 * Newest first, with posts that have no publish date last — a row can only be
 * visible without a date if someone published it before the field was set.
 */
const LIST_ORDER = [{ publishedAt: "desc" as const }, { createdAt: "desc" as const }];

/** Every published post, for the archive page. */
export async function getPosts(): Promise<PostSummary[]> {
  const rows = await db.post.findMany({
    where: { visible: true },
    orderBy: LIST_ORDER,
    select: summarySelect,
  });
  return rows.map(toSummary);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const row = await db.post.findUnique({
    where: { slug },
    select: { ...summarySelect, body: true, faqs: true, visible: true },
  });
  if (!row || !row.visible) return null;
  return { ...toSummary(row), body: row.body, faqs: toFaqs(row.faqs) };
}

export type PostComment = {
  id: string;
  author: string;
  body: string;
  /** ISO string. */
  createdAt: string;
};

/**
 * Approved comments on a post, oldest first so a thread reads top to bottom.
 *
 * Only ever returns approved rows — the moderation queue is the panel's
 * business and must not be reachable from a public page.
 */
export async function getPostComments(postId: string): Promise<PostComment[]> {
  const rows = await db.postComment.findMany({
    where: { postId, approved: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, author: true, body: true, createdAt: true },
  });
  return rows.map((c) => ({
    id: c.id,
    author: c.author,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
  }));
}

/** The posts either side of one, so an article can offer what to read next. */
export async function getAdjacentPosts(slug: string) {
  const all = await getPosts();
  const i = all.findIndex((p) => p.slug === slug);
  if (i === -1) return { previous: null, next: null };
  return {
    previous: all[i - 1] ?? null,
    next: all[i + 1] ?? null,
  };
}

/** Everything the archive page renders, in one round trip. */
export async function getMagazineContent() {
  const [settings, posts, dock] = await Promise.all([
    db.setting.findMany({ select: { key: true, value: true } }),
    db.post.findMany({ where: { visible: true }, orderBy: LIST_ORDER, select: summarySelect }),
    db.dockLink.findMany({ where: { visible: true }, orderBy: [{ order: "asc" }, { id: "asc" }] }),
  ]);

  return {
    strings: Object.fromEntries(settings.map((s) => [s.key, s.value])) as Record<string, string>,
    posts: posts.map(toSummary),
    dock: dock.map((x) => ({
      id: x.id,
      label: x.label,
      href: x.href,
      txLabel: x.txLabel,
      txColor: x.txColor,
    })),
  };
}

export type MagazineContent = Awaited<ReturnType<typeof getMagazineContent>>;
