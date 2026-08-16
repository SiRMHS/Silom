"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export type Shot = {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
};

/**
 * Horizontal case-study gallery.
 *
 * The strip is a scroller first — trackpad, touch and keyboard all drive it
 * natively — and the arrows are a second way in for anyone on a mouse. Scroll
 * offsets go through Math.abs because in RTL `scrollLeft` counts down from 0
 * into negatives, so the raw value can't be compared against scrollWidth.
 *
 * With no gallery set in the panel the section falls back to tinted plates, so
 * a project that hasn't been photographed yet still reads as a page.
 */
export default function CaseGallery({ color, shots }: { color: string; shots: Shot[] }) {
  const stripRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const sync = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    setAtStart(pos <= 1);
    // max is ~0 when everything already fits — then both ends are the same end
    // and the arrows disable themselves out of the way.
    setAtEnd(max <= 1 || pos >= max - 1);
  }, []);

  useEffect(() => {
    sync();
    const el = stripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync]);

  const step = (dir: 1 | -1) => {
    const el = stripRef.current;
    if (!el) return;
    // Roughly one card per press, capped so a wide viewport doesn't jump the
    // whole strip. The sign flips in RTL, where forward means a lower x.
    const rtl = getComputedStyle(el).direction === "rtl";
    const first = el.querySelector("li");
    const card = first ? first.getBoundingClientRect().width + 20 : 320;
    const amount = Math.min(Math.max(card, 240), Math.max(el.clientWidth * 0.9, 240));
    el.scrollBy({ left: amount * dir * (rtl ? -1 : 1), behavior: "smooth" });
  };

  const idle = atStart && atEnd;
  const items: (Shot | null)[] = shots.length ? shots : [null, null, null, null, null];

  return (
    <section className="case-gallery" aria-label="گالری تصاویر">
      <div className="case-gallery-head shell">
        <h2 className="case-h">گالری</h2>

        <div className="case-gallery-tools" data-idle={idle ? "" : undefined}>
          <span className="case-gallery-hint" aria-hidden="true">
            برای دیدن بقیه بکشید
          </span>
          <div className="case-gallery-nav">
            <button
              type="button"
              className="case-gallery-btn"
              onClick={() => step(-1)}
              disabled={atStart}
              aria-label="تصویر قبلی"
              aria-controls="case-strip"
            >
              <Chevron dir="prev" />
            </button>
            <button
              type="button"
              className="case-gallery-btn"
              onClick={() => step(1)}
              disabled={atEnd}
              aria-label="تصویر بعدی"
              aria-controls="case-strip"
            >
              <Chevron dir="next" />
            </button>
          </div>
        </div>
      </div>

      <ul id="case-strip" className="case-strip" ref={stripRef} onScroll={sync} tabIndex={0}>
        {items.map((shot, i) => (
          <li key={shot?.url ?? i} className={shot ? "case-slide" : undefined}>
            {shot ? (
              <Image
                className="case-shot-img"
                src={shot.url}
                alt={shot.alt}
                width={shot.width ?? 1200}
                height={shot.height ?? 900}
                sizes="(max-width: 700px) 78vw, 34vw"
                // The optimizer refuses SVG unless the whole app opts in; a
                // vector needs no resizing anyway.
                unoptimized={shot.url.toLowerCase().endsWith(".svg")}
              />
            ) : (
              <span
                className={`case-shot${i % 2 ? " case-shot--wide" : ""}`}
                style={{ ["--c" as string]: color }}
              />
            )}
          </li>
        ))}
      </ul>
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
