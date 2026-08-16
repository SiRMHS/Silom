"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Partner logos — four fixed columns whose logos swap vertically, rising in
 * from below with a blur, while the outgoing one blurs upward out of frame.
 *
 * One timer drives all four columns round-robin, so the changes stagger
 * naturally and the page carries a single interval rather than four. It stops
 * when the strip is off screen or the tab is hidden.
 *
 * Each slot is masked top and bottom, so a logo fades as it enters and leaves
 * instead of clipping against a hard edge.
 *
 * Swapping in real artwork: set a logo on the partner in the admin panel and it
 * renders an <img>; the text wordmark is the fallback path.
 */

type Partner = {
  id: string;
  name: string;
  src?: string | null;
  weight?: number;
  spacing?: string;
  italic?: boolean;
};

const COLUMN_COUNT = 4;
const STEP_MS = 1400; // one column changes every STEP_MS

type SlotState = { cur: number; prev: number; n: number };

function Mark({ p }: { p: Partner }) {
  if (p.src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={p.src} alt={p.name} loading="lazy" decoding="async" />
    );
  }
  return (
    <span
      className="logo-wordmark"
      style={{
        fontWeight: p.weight,
        letterSpacing: p.spacing,
        fontStyle: p.italic ? "italic" : undefined,
      }}
    >
      {p.name}
    </span>
  );
}

export default function LogoMarquee({
  title,
  partners,
}: {
  title: string;
  partners: Partner[];
}) {
  const rootRef = useRef<HTMLElement | null>(null);

  // Stride so no logo can appear in two columns at once. Empty columns are
  // dropped, so a short partner list still fills what it can.
  const COLUMNS = useMemo(
    () =>
      Array.from({ length: COLUMN_COUNT }, (_, c) =>
        partners.filter((_, i) => i % COLUMN_COUNT === c),
      ).filter((col) => col.length > 0),
    [partners],
  );

  const [slots, setSlots] = useState<SlotState[]>(() =>
    COLUMNS.map(() => ({ cur: 0, prev: -1, n: 0 })),
  );

  // Editing partners in the panel can change the column count under us
  useEffect(() => {
    setSlots((prev) =>
      prev.length === COLUMNS.length ? prev : COLUMNS.map(() => ({ cur: 0, prev: -1, n: 0 })),
    );
  }, [COLUMNS]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let onScreen = true;
    const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), {
      rootMargin: "100px",
    });
    io.observe(root);

    let col = 0;
    const id = window.setInterval(() => {
      if (!onScreen || document.hidden) return;
      setSlots((prev) => {
        if (!prev.length) return prev;
        const c = col % prev.length;
        col += 1;
        return prev.map((s, i) =>
          i === c ? { cur: (s.cur + 1) % COLUMNS[i].length, prev: s.cur, n: s.n + 1 } : s,
        );
      });
    }, STEP_MS);

    return () => {
      io.disconnect();
      clearInterval(id);
    };
  }, [COLUMNS]);

  return (
    <section className="logos" aria-labelledby="logos-title" ref={rootRef}>
      <h2 className="logos-title js-reveal" id="logos-title">
        {title}
      </h2>

      <ul className="logo-columns">
        {COLUMNS.map((items, c) => {
          // slots re-sync in an effect, so a render can land one behind
          const s = slots[c] ?? { cur: 0, prev: -1, n: 0 };
          return (
            <li className="logo-slot" key={c}>
              {s.prev >= 0 && (
                <span
                  className="logo-mark is-out"
                  key={`o-${s.n}`}
                  // drop it once it has left, so slots don't accumulate
                  // permanently blurred layers
                  onAnimationEnd={() =>
                    setSlots((p) =>
                      p.map((x, i) => (i === c ? { ...x, prev: -1 } : x)),
                    )
                  }
                >
                  <Mark p={items[s.prev]} />
                </span>
              )}
              <span className="logo-mark is-in" key={`i-${s.n}`}>
                <Mark p={items[s.cur]} />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
