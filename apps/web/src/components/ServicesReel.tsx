"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import TxLink from "@/components/TxLink";
import type { ServiceCard } from "@rahyad/core";

/**
 * The services hub as a reel — one service at a time, the whole window, forever.
 *
 * Each service gets the entire frame: its film or its photograph edge to edge,
 * its name across the middle, and nothing else competing for the eye. The reel
 * advances on its own and wraps at the end, so there is no last slide and no
 * dead stop — the list is a loop, not a page that runs out.
 *
 * Every slide stays mounted. Only the live one is shown, so its clip is already
 * decoded when its turn comes and the cut is instant; the rest keep their links
 * in the document, which is what a crawler follows.
 *
 * The bar at the foot is the slide's own clock rather than a decoration: one
 * rAF advances the fill and trips the cut, so what is drawn and what happens
 * can't drift apart. It is written straight to the element's transform — a
 * React state change per frame would re-render every slide sixty times a
 * second to move one line.
 */

/** How long one service holds the frame. */
const SLIDE_MS = 6400;
/** Ignore a second flick inside this window — one gesture, one slide. */
const GESTURE_LOCK_MS = 620;
/** Wheel travel that counts as a deliberate push rather than a tremor. */
const WHEEL_THRESHOLD = 34;
/** Drag travel that turns a press into a throw. */
const THROW_PX = 46;

const faNum = (n: number) => n.toLocaleString("fa-IR");

export default function ServicesReel({
  services,
  openLabel,
  cueLabel,
}: {
  services: ServiceCard[];
  openLabel: string;
  cueLabel: string;
}) {
  const n = services.length;
  const [current, setCurrent] = useState(0);
  const [cued, setCued] = useState(false);

  const rootRef = useRef<HTMLElement | null>(null);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const filmRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const heldRef = useRef(false); // a finger is on the reel; the clock waits
  const draggedRef = useRef(false);

  /** Wraps, so the reel has no end to reach. */
  const goTo = useCallback(
    (i: number) => {
      setCurrent(((i % n) + n) % n);
      setCued(true);
    },
    [n],
  );

  // The clock, restarted by every slide change — including the ones it causes
  // itself, which is what makes it a loop rather than a queue.
  useEffect(() => {
    fillRefs.current.forEach((el, i) => {
      if (el) el.style.transform = `scaleX(${i < current ? 1 : 0})`;
    });

    // A clip only runs while its slide is up. Four films decoding at once for
    // one that can be seen is battery spent on nothing.
    filmRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === current) {
        v.currentTime = 0;
        void v.play().catch(() => {});
      } else {
        v.pause();
      }
    });

    if (n <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Nothing is going to fill this bar, so it is shown as the slide it is:
      // the one being looked at, for as long as someone looks at it.
      const fill = fillRefs.current[current];
      if (fill) fill.style.transform = "scaleX(1)";
      return;
    }

    let raf = 0;
    let last = 0;
    let elapsed = 0;

    const frame = (now: number) => {
      const dt = last ? now - last : 0;
      last = now;
      if (!heldRef.current) elapsed += dt;

      const p = Math.min(1, elapsed / SLIDE_MS);
      const fill = fillRefs.current[current];
      if (fill) fill.style.transform = `scaleX(${p.toFixed(4)})`;

      if (p >= 1) {
        setCurrent((c) => (c + 1) % n);
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [current, n]);

  // Wheel, throw and arrow keys all say the same two things: the one before, or
  // the one after. Bound natively so the wheel can be taken non-passively.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || n <= 1) return;

    let lock = 0;
    let acc = 0;
    const drag = { active: false, id: -1, x: 0, y: 0 };

    const step = (dir: number) => {
      const now = performance.now();
      if (now - lock < GESTURE_LOCK_MS) return;
      lock = now;
      acc = 0;
      setCued(true);
      setCurrent((c) => (((c + dir) % n) + n) % n);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      // A trackpad delivers one flick as a long tail of small deltas; the tail
      // is summed, and forgotten once it has clearly stopped arriving.
      if (performance.now() - lock > GESTURE_LOCK_MS * 1.6) acc = 0;
      acc += d;
      if (Math.abs(acc) >= WHEEL_THRESHOLD) step(Math.sign(acc));
    };

    const onDown = (e: PointerEvent) => {
      drag.active = true;
      drag.id = e.pointerId;
      drag.x = e.clientX;
      drag.y = e.clientY;
      heldRef.current = true;
    };

    const onMove = (e: PointerEvent) => {
      if (!drag.active || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) < THROW_PX) return;
      draggedRef.current = true;
      // Pulling up, or toward the start edge, deals the next one out.
      step(Math.abs(dy) > Math.abs(dx) ? -Math.sign(dy) : -Math.sign(dx));
      drag.x = e.clientX;
      drag.y = e.clientY;
    };

    const onUp = (e: PointerEvent) => {
      if (!drag.active || e.pointerId !== drag.id) return;
      drag.active = false;
      heldRef.current = false;
    };

    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      // The frame is RTL, so the start edge is the right one: ArrowLeft reads
      // as onward and ArrowRight as back.
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") step(1);
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") step(-1);
      else return;
      e.preventDefault();
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKey);

    return () => {
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKey);
    };
  }, [n]);

  return (
    <section
      className="reel"
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="خدمات"
      style={{ ["--c" as string]: services[current].accent }}
      // A press that turned into a throw still ends in a click, and that click
      // belongs to the reel rather than to the link stretched across the slide.
      onClickCapture={(e) => {
        if (!draggedRef.current) return;
        draggedRef.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {services.map((s, i) => {
        const on = i === current;
        return (
          <article
            key={s.id}
            className="reel-slide"
            data-on={on ? "" : undefined}
            aria-hidden={on ? undefined : true}
            style={{ ["--c" as string]: s.accent }}
          >
            <div className="reel-media">
              {s.film ? (
                <video
                  ref={(el) => {
                    filmRefs.current[i] = el;
                  }}
                  src={s.film.url}
                  poster={s.film.poster ?? undefined}
                  autoPlay={i === 0}
                  muted
                  loop
                  playsInline
                  preload={i === 0 ? "auto" : "metadata"}
                />
              ) : s.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={s.image} alt={on ? s.imageAlt : ""} draggable={false} />
              ) : (
                <span className="reel-plate" aria-hidden="true" />
              )}
            </div>
            <span className="reel-scrim" aria-hidden="true" />

            <div className="reel-copy">
              <p className="reel-cat">{s.tags[0] ?? s.index}</p>

              {/* Set word by word so each one can rise out of its own mask —
                  one long line would arrive as a single block and lose the
                  beat. The label restores the title as one string: the words
                  are separate elements with a gap between them, so read off the
                  markup they would run together into one long non-word. */}
              <h2 className="reel-name" aria-label={s.title}>
                {s.title.split(" ").map((word, w) => (
                  <span className="reel-word" key={`${word}:${w}`}>
                    <span className="reel-word-in" style={{ ["--d" as string]: `${w * 70}ms` }}>
                      {word}
                    </span>
                  </span>
                ))}
              </h2>

              <p className="reel-meta">
                {/* A count of zero is left unsaid rather than printed as
                    "۰ پروژه", which reads as a service nobody ordered. */}
                {s.projectCount > 0 ? `${faNum(s.projectCount)} پروژه` : s.index}
              </p>
            </div>

            {/* The slide itself is the link: a piece is opened by clicking the
                piece, not by hunting for a button on top of it. */}
            <TxLink
              href={`/services/${s.slug}`}
              label={s.title}
              accent={s.accent}
              className="reel-open"
              tabIndex={on ? undefined : -1}
            >
              <span className="reel-open-label">
                <span className="reel-open-eye" aria-hidden="true" />
                {openLabel}
              </span>
              <span className="reel-sr">{s.title}</span>
            </TxLink>
          </article>
        );
      })}

      <p className="reel-cue" data-gone={cued ? "" : undefined} aria-hidden="true">
        <span className="reel-cue-icon" />
        {cueLabel}
      </p>

      {/* One segment per service, so the reel's whole length is visible at a
          glance — and the one filling is the clock. */}
      <div className="reel-bars">
        {services.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className="reel-bar"
            data-on={i === current ? "" : undefined}
            aria-label={s.title}
            aria-current={i === current ? "true" : undefined}
            onClick={() => goTo(i)}
          >
            <span
              className="reel-bar-fill"
              ref={(el) => {
                fillRefs.current[i] = el;
              }}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
