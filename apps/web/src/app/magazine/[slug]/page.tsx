import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TxLink from "@/components/TxLink";
import BottomNav from "@/components/BottomNav";
import BrandHeader from "@/components/BrandHeader";
import ReadingProgress from "@/components/ReadingProgress";
import PostComments from "@/components/PostComments";
import FaqSection from "@/components/FaqSection";
import { faDate, faNumber, isoDay } from "@/lib/fa-date";
import SiteFooter from "@/components/SiteFooter";
import {
  getAdjacentPosts,
  getDockLinks,
  getFooterWords,
  getPostBySlug,
  getPostComments,
  getPosts,
  getStrings,
  pick,
} from "@rahyad/core";
import { pageMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "مجله | رهیــــاد" };
  return pageMetadata({
    path: `/magazine/${post.slug}`,
    title: `${post.title} | مجله‌ی رهیــــاد`,
    description: post.excerpt,
    openGraph: {
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      images: post.cover ? [{ url: post.cover.url, alt: post.cover.alt }] : undefined,
    },
  });
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [post, adjacent, dock, strings, footerWords] = await Promise.all([
    getPostBySlug(slug),
    getAdjacentPosts(slug),
    getDockLinks(),
    getStrings(),
    getFooterWords(),
  ]);
  if (!post) notFound();

  const comments = await getPostComments(post.id);

  // Newest first, so "the next thing to read" is the older neighbour, and the
  // newer one is offered only when this is already the oldest post.
  const onward = adjacent.next ?? adjacent.previous;

  return (
    <main className="page-post" style={{ ["--c" as string]: post.accent }}>
      <ReadingProgress />

      <TxLink href="/magazine" label="مجله" className="case-back">
        <span aria-hidden="true">←</span> همه‌ی نوشته‌ها
      </TxLink>

      {/* Full-bleed cover whose bottom edge dissolves into the paper instead of
          ending on a rule — the same seam the case-study hero uses, so the two
          kinds of page open the same way. A post with no cover falls back to a
          plate in its own accent. */}
      <div className="post-hero">
        {post.cover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            className="post-hero-img"
            src={post.cover.url}
            alt={post.cover.alt}
            width={post.cover.width ?? undefined}
            height={post.cover.height ?? undefined}
            // first image on the page, so it is never lazy
            fetchPriority="high"
          />
        ) : (
          <span className="post-hero-plate" aria-hidden="true" />
        )}
      </div>

      <header className="post-head">
        <div className="post-measure">
          {post.category && <p className="post-cat">{post.category}</p>}
          <h1 className="post-title">{post.title}</h1>

          <p className="post-meta">
            {post.publishedAt && (
              <time dateTime={isoDay(post.publishedAt)}>{faDate(post.publishedAt)}</time>
            )}
            <span className="mag-dot" aria-hidden="true" />
            <span>{faNumber(post.readMinutes)} دقیقه خواندن</span>
          </p>
        </div>
      </header>

      <div className="post-body">
        {post.excerpt && (
          <p className="post-lede post-measure">{post.excerpt}</p>
        )}

        {/* Rich text from the panel. Sanitised on save — see
            packages/core/src/admin/sanitize.ts — never rendered raw. */}
        <article
          className="post-rich case-rich post-measure"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        {post.tags.length > 0 && (
          <p className="post-tags post-measure">
            {post.tags.map((t) => (
              <em key={t}>{t}</em>
            ))}
          </p>
        )}

        <FaqSection faqs={post.faqs} className="post-measure" />

        <PostComments slug={post.slug} comments={comments} />

        {onward && (
          <TxLink
            className="post-next"
            href={`/magazine/${onward.slug}`}
            label={onward.title}
            accent={onward.accent}
            style={{ ["--c" as string]: onward.accent }}
          >
            <span className="post-next-inner post-measure">
              <span className="post-next-label">نوشته‌ی بعدی</span>
              <span className="post-next-title">{onward.title}</span>
              <span className="post-next-meta">
                {faNumber(onward.readMinutes)} دقیقه خواندن
              </span>
            </span>
          </TxLink>
        )}
      </div>

      <SiteFooter words={footerWords} strings={strings} />

      <BrandHeader
        align="corner"
        ctaLabel={pick(strings, "nav.cta.label", "در تماس باشیم")}
        ctaHref={pick(strings, "nav.cta.href", "/contact")}
      />
      <BottomNav items={dock} />
    </main>
  );
}
