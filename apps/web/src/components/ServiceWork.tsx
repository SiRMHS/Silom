"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TxLink from "@/components/TxLink";
import type { SiteProject } from "@rahyad/core";

/**
 * The case studies filed under one service, shown as a carousel or as a grid.
 *
 * Both are the same cards and the same list — a switch, not two sections. A
 * carousel reads as a showcase and is what the page opens on; the grid is for
 * someone who came to compare and wants everything at once. Duplicating the
 * projects into two stacked sections would only make the page longer.
 *
 * The carousel is a scroller first: trackpad, touch and keyboard drive it
 * natively and the arrows are the second way in, exactly as the case-study
 * gallery works. Scroll offsets go through Math.abs because RTL counts
 * `scrollLeft` down from zero into negatives.
 */

const faIndex = (i: number) => (i + 1).toLocaleString("fa-IR").padStart(2, "۰");

function Card({ project, index }: { project: SiteProject; index: number }) {
  return (
    <TxLink
      href={`/projects/${project.slug}`}
      label={project.title}
      accent={project.color}
      className="sv-work-card"
      style={{ ["--c" as string]: project.color }}
    >
      <span className="sv-work-frame">
        <span
          className="sv-work-thumb"
          aria-hidden="true"
          // Falls back to the project's own colour when it has no cover yet
          style={project.image ? { backgroundImage: `url(${project.image})` } : undefined}
        />
        <span className="sv-work-veil" aria-hidden="true" />
        <span className="sv-work-year" aria-hidden="true">
          {project.year}
        </span>
      </span>

      <span className="sv-work-meta">
        <span className="sv-work-index" aria-hidden="true">
          {faIndex(index)}
        </span>
        <span className="sv-work-cat">{project.cat}</span>
      </span>

      <span className="sv-work-title">{project.title}</span>
      {project.role && <span className="sv-work-scope">{project.role}</span>}
    </TxLink>
  );
}

export default function ServiceWork({
  projects,
  accent,
  title,
  note,
  emptyText,
}: {
  projects: SiteProject[];
  accent: string;
  title: string;
  note: string;
  emptyText: string;
}) {
  const [view, setView] = useState<"carousel" | "grid">("carousel");
  const stripRef = useRef<HTMLUListElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const sync = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    setAtStart(pos <= 1);
    // max is ~0 when everything already fits: both ends are then the same end,
    // and the arrows take themselves out of the way.
    setAtEnd(max <= 1 || pos >= max - 1);
  }, []);

  useEffect(() => {
    sync();
    const el = stripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync, view]);

  const step = (dir: 1 | -1) => {
    const el = stripRef.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const first = el.querySelector("li");
    const card = first ? first.getBoundingClientRect().width + 22 : 340;
    const amount = Math.min(Math.max(card, 260), Math.max(el.clientWidth * 0.9, 260));
    el.scrollBy({ left: amount * dir * (rtl ? -1 : 1), behavior: "smooth" });
  };

  if (projects.length === 0) {
    return (
      <section className="sv-section shell" id="work" aria-labelledby="sv-work-heading">
        <h2 className="sv-h" id="sv-work-heading">
          {title}
        </h2>
        <p className="sv-empty">{emptyText}</p>
      </section>
    );
  }

  const carousel = view === "carousel";

  return (
    <section className="sv-work" id="work" aria-labelledby="sv-work-heading">
      <div className="sv-work-head shell">
        <div>
          <h2 className="sv-h" id="sv-work-heading">
            {title}
          </h2>
          {note && <p className="sv-work-note">{note}</p>}
        </div>

        <div className="sv-work-tools">
          <div className="sv-switch" role="group" aria-label="نحوه‌ی نمایش پروژه‌ها">
            <button
              type="button"
              className="sv-switch-btn"
              data-active={carousel ? "" : undefined}
              aria-pressed={carousel}
              onClick={() => setView("carousel")}
            >
              کاروسل
            </button>
            <button
              type="button"
              className="sv-switch-btn"
              data-active={carousel ? undefined : ""}
              aria-pressed={!carousel}
              onClick={() => setView("grid")}
            >
              شبکه
            </button>
          </div>

          {carousel && (
            <div className="case-gallery-nav" data-idle={atStart && atEnd ? "" : undefined}>
              <button
                type="button"
                className="case-gallery-btn"
                onClick={() => step(-1)}
                disabled={atStart}
                aria-label="پروژه‌ی قبلی"
                aria-controls="sv-work-strip"
              >
                <Chevron dir="prev" />
              </button>
              <button
                type="button"
                className="case-gallery-btn"
                onClick={() => step(1)}
                disabled={atEnd}
                aria-label="پروژه‌ی بعدی"
                aria-controls="sv-work-strip"
              >
                <Chevron dir="next" />
              </button>
            </div>
          )}
        </div>
      </div>

      {carousel ? (
        <ul
          id="sv-work-strip"
          className="sv-work-strip"
          style={{ ["--accent" as string]: accent }}
          ref={stripRef}
          onScroll={sync}
          tabIndex={0}
        >
          {projects.map((p, i) => (
            <li key={p.id}>
              <Card project={p} index={i} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="sv-work-grid shell" style={{ ["--accent" as string]: accent }}>
          {projects.map((p, i) => (
            <li key={p.id}>
              <Card project={p} index={i} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* Drawn rather than typed: the arrow glyphs render at wildly different weights
   across the Persian font stack, and the two buttons have to match. */
function Chevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg
      className={`case-chev case-chev--${dir}`}
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
