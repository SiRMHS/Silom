"use client";

import { useMemo, useState } from "react";
import TxLink from "@/components/TxLink";
import { faDate, faNumber, isoDay } from "@/lib/fa-date";
import type { PostSummary } from "@rahyad/core";

/**
 * The archive.
 *
 * The newest post is given the width of the page and everything else falls
 * into a grid beneath it — an archive where every entry is the same size makes
 * the reader do the work of deciding where to start.
 *
 * Filtering happens here rather than through a query string: the whole list is
 * already on the page, so a client-side filter keeps /magazine statically
 * rendered and makes switching categories instant.
 */

function Meta({ post }: { post: PostSummary }) {
  return (
    <span className="mag-meta">
      {post.publishedAt && (
        <time dateTime={isoDay(post.publishedAt)}>{faDate(post.publishedAt)}</time>
      )}
      <span className="mag-dot" aria-hidden="true" />
      <span>{faNumber(post.readMinutes)} دقیقه خواندن</span>
    </span>
  );
}

function Cover({ post, sizes }: { post: PostSummary; sizes: string }) {
  if (!post.cover) return <span className="mag-plate" aria-hidden="true" />;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={post.cover.url}
      alt={post.cover.alt}
      width={post.cover.width ?? undefined}
      height={post.cover.height ?? undefined}
      sizes={sizes}
      loading="lazy"
    />
  );
}

export default function MagazineIndex({
  posts,
  emptyText,
}: {
  posts: PostSummary[];
  emptyText: string;
}) {
  const categories = useMemo(
    () => [...new Set(posts.map((p) => p.category).filter(Boolean))],
    [posts],
  );
  const [active, setActive] = useState<string | null>(null);

  const shown = active ? posts.filter((p) => p.category === active) : posts;
  const [lead, ...rest] = shown;

  if (posts.length === 0) {
    return <p className="mag-empty">{emptyText}</p>;
  }

  return (
    <>
      {categories.length > 1 && (
        <div className="mag-filter" role="group" aria-label="فیلتر بر اساس دسته">
          <button
            type="button"
            className="mag-chip"
            data-active={active === null ? "" : undefined}
            aria-pressed={active === null}
            onClick={() => setActive(null)}
          >
            همه
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className="mag-chip"
              data-active={active === c ? "" : undefined}
              aria-pressed={active === c}
              onClick={() => setActive(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {lead && (
        <article className="mag-lead" style={{ ["--c" as string]: lead.accent }}>
          <TxLink
            href={`/magazine/${lead.slug}`}
            label={lead.title}
            accent={lead.accent}
            className="mag-lead-link"
          >
            <span className="mag-lead-media">
              <Cover post={lead} sizes="(max-width: 900px) 100vw, 55vw" />
            </span>

            <span className="mag-lead-text">
              <span className="mag-kicker">
                <span className="mag-kicker-flag">
                  {active ? "تازه‌ترین در این دسته" : "تازه‌ترین نوشته"}
                </span>
                {lead.category && (
                  <>
                    <span className="mag-dot" aria-hidden="true" />
                    <span className="mag-cat">{lead.category}</span>
                  </>
                )}
              </span>
              <h2 className="mag-lead-title">{lead.title}</h2>
              {lead.excerpt && <p className="mag-lead-excerpt">{lead.excerpt}</p>}
              <Meta post={lead} />
            </span>
          </TxLink>
        </article>
      )}

      {rest.length > 0 && (
        <div className="mag-grid">
          {rest.map((post) => (
            <article key={post.id} className="mag-card" style={{ ["--c" as string]: post.accent }}>
              <TxLink
                href={`/magazine/${post.slug}`}
                label={post.title}
                accent={post.accent}
                className="mag-card-link"
              >
                <span className="mag-card-media">
                  <Cover post={post} sizes="(max-width: 760px) 100vw, 33vw" />
                </span>

                <span className="mag-card-body">
                  {post.category && <span className="mag-cat">{post.category}</span>}
                  <h3 className="mag-card-title">{post.title}</h3>
                  {post.excerpt && <p className="mag-card-excerpt">{post.excerpt}</p>}
                  <Meta post={post} />
                </span>
              </TxLink>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
