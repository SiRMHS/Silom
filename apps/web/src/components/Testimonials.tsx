"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { splitLines, type LineSplit } from "@/lib/split-lines";
import type { SiteTestimonial } from "@rahyad/core";

/**
 * What clients said, one quote at a time.
 *
 * Every quote is stacked in the same cell and only one is lit, so the section
 * keeps the height of a single testimonial however many are written. The change
 * is a masked line reveal: each line of the outgoing quote slides up out of its
 * own clip and each line of the incoming one rises into it, staggered, so the
 * paragraph reads as one thing turning over rather than as text being swapped.
 *
 * The portrait changes on the same clock, opening and closing as a circular
 * clip — a face that cross-faded while the words swept would read as two
 * separate transitions happening to overlap.
 *
 * It advances on its own every five seconds, and stops doing that whenever it
 * is off screen or the reader takes over with the buttons or the arrow keys.
 *
 * Everything here is imperative on purpose. The slider owns DOM that SplitText
 * has rewritten into per-line wrappers, and React must not be re-rendering
 * underneath that — so the index, the counter and the classes are handled by
 * hand rather than by state.
 */

/* The portrait's two states — a circle grown from and shrunk to nothing */
const CLIP_HIDDEN = "circle(0% at 50% 50%)";
const CLIP_VISIBLE = "circle(50% at 50% 50%)";

/** How long a quote holds before the next one takes over. */
const AUTOPLAY_MS = 5000;

const faDigits = (s: string) => s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

type Slide = {
  item: HTMLElement;
  portrait: HTMLElement | null;
  /** One per split element — the quote, the name, the role. */
  splits: LineSplit[];
};

export default function Testimonials({
  items,
  title,
  lead,
  prevLabel,
  nextLabel,
}: {
  items: SiteTestimonial[];
  title: string;
  /** The line over the quote — «مشتری‌ها چه می‌گویند:» */
  lead: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-slide]"));
    if (nodes.length < 1) return;

    gsap.registerPlugin(ScrollTrigger);

    const counter = root.querySelector<HTMLElement>("[data-current]");
    const prevBtn = root.querySelector<HTMLButtonElement>("[data-prev]");
    const nextBtn = root.querySelector<HTMLButtonElement>("[data-next]");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let active = 0;
    let animating = false;
    let inView = true;

    const slides: Slide[] = nodes.map((item) => ({
      item,
      portrait: item.querySelector<HTMLElement>("[data-portrait]"),
      splits: [],
    }));

    const linesOf = (s: Slide) => s.splits.flatMap((split) => split.lines);

    const setLit = (i: number, on: boolean) => {
      const { item } = slides[i];
      item.classList.toggle("is-on", on);
      item.setAttribute("aria-hidden", String(!on));
      gsap.set(item, {
        autoAlpha: on ? 1 : 0,
        pointerEvents: on ? "auto" : "none",
      });
    };

    const paintCounter = () => {
      if (counter) counter.textContent = faDigits(String(active + 1));
    };

    slides.forEach((slide, i) => setLit(i, i === active));
    paintCounter();

    /* ── the lines ──────────────────────────────────────────────
       The quote and the two lines under the portrait are split together, so a
       slide's whole text moves as one staggered run rather than as a paragraph
       followed by a caption.

       Lines are a measurement, not a fact: the same quote is four lines at one
       width and seven at another. So the split is redone whenever the text
       could have reflowed — when the font finally lands, and whenever the stage
       changes width — and each redo puts the fresh lines back into the state
       their slide is supposed to be in. Without that last part a resize would
       leave every hidden quote sitting visible on top of the live one. */
    const split = () => {
      slides.forEach((slide, i) => {
        slide.splits.forEach((s) => s.revert());

        const targets = [
          slide.item.querySelector<HTMLElement>("[data-quote]"),
          ...Array.from(slide.item.querySelectorAll<HTMLElement>("[data-line]")),
        ].filter((el): el is HTMLElement => Boolean(el));

        slide.splits = targets.map((el) =>
          splitLines(el, {
            maskClass: "tsay-line-mask",
            lineClass: "tsay-line",
          }),
        );

        if (reduce) return;
        const on = i === active;
        gsap.set(linesOf(slide), { yPercent: on ? 0 : 110 });
        if (slide.portrait) {
          gsap.set(slide.portrait, {
            clipPath: on ? CLIP_VISIBLE : CLIP_HIDDEN,
          });
        }
      });
    };

    split();

    // Re-splitting under a running timeline would swap the nodes it is tweening
    // for new ones and strand the old ones mid-slide, so a request that lands
    // during a change is held until the change is over rather than dropped —
    // dropped, it would never come back, and the quote would keep the line
    // breaks of a width the reader has already left.
    let pending = false;

    const resplit = () => {
      if (animating) {
        pending = true;
        return;
      }
      split();
    };

    // Persian measured against a fallback face wraps in different places than
    // the real one, so the first split is provisional until Peyda lands.
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) resplit();
    });

    // Width is the only dimension that changes where a line breaks; a taller
    // window reflows nothing, so height changes are ignored.
    const stage = root.querySelector<HTMLElement>(".tsay-stage");
    let lastWidth = stage?.getBoundingClientRect().width ?? 0;

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (Math.abs(width - lastWidth) < 1) return;
      lastWidth = width;
      resplit();
    });
    if (stage) observer.observe(stage);

    /* ── the change ─────────────────────────────────────────── */
    let tl: gsap.core.Timeline | null = null;

    const goTo = (next: number) => {
      if (animating || next === active) return;
      animating = true;

      const out = slides[active];
      const inc = slides[next];
      const from = active;

      tl = gsap.timeline({
        onComplete: () => {
          setLit(from, false);
          setLit(next, true);
          active = next;
          paintCounter();
          animating = false;
          if (pending) {
            pending = false;
            split();
          }
        },
      });

      // Nothing sweeps for a reader who asked for less movement; the quote
      // still changes, it just dissolves.
      if (reduce) {
        tl.to(out.item, { autoAlpha: 0, duration: 0.4, ease: "power2" }, 0).fromTo(
          inc.item,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.4, ease: "power2" },
          0,
        );
        return;
      }

      const outLines = linesOf(out);
      const incLines = linesOf(inc);

      // The incoming slide is made visible before it moves, sitting one line
      // below its mask where nothing of it shows yet.
      gsap.set(inc.item, { autoAlpha: 1, pointerEvents: "auto" });
      gsap.set(incLines, { yPercent: 110 });
      if (out.portrait) gsap.set(out.portrait, { clipPath: CLIP_VISIBLE });

      tl.to(
        outLines,
        {
          yPercent: -110,
          duration: 0.6,
          ease: "power4.inOut",
          stagger: { amount: 0.25 },
        },
        0,
      );

      if (out.portrait) {
        tl.to(out.portrait, { clipPath: CLIP_HIDDEN, duration: 0.6, ease: "power4.inOut" }, 0);
      }

      // Starts 0.3s before the outgoing run finishes, so the two overlap and
      // the block never reads as empty in between.
      tl.to(
        incLines,
        {
          yPercent: 0,
          duration: 0.7,
          ease: "power4.inOut",
          stagger: { amount: 0.4 },
        },
        ">-=0.3",
      );

      if (inc.portrait) {
        tl.fromTo(
          inc.portrait,
          { clipPath: CLIP_HIDDEN },
          { clipPath: CLIP_VISIBLE, duration: 0.75, ease: "power4.inOut" },
          "<",
        );
      }

      tl.set(out.item, { autoAlpha: 0 }, ">");
    };

    const step = (by: number) => goTo((active + by + slides.length) % slides.length);

    /* ── on its own ─────────────────────────────────────────── */
    let call: gsap.core.Tween | null = null;

    const queue = () => {
      call?.kill();
      call = gsap.delayedCall(AUTOPLAY_MS / 1000, () => {
        // A quote that came up while the section was scrolled past would be
        // over before anyone saw it, so the clock waits rather than skips.
        if (!inView || animating) {
          queue();
          return;
        }
        step(1);
        queue();
      });
    };

    // One quote has nothing to cycle to; it just sits there.
    if (slides.length > 1) queue();

    const take = (by: number) => {
      if (slides.length > 1) queue();
      step(by);
    };

    const onPrev = () => take(-1);
    const onNext = () => take(1);
    prevBtn?.addEventListener("click", onPrev);
    nextBtn?.addEventListener("click", onNext);

    // Reading runs right to left here, so left is forward and right is back.
    const onKey = (e: KeyboardEvent) => {
      if (!inView || slides.length < 2) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        take(1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        take(-1);
      }
    };
    window.addEventListener("keydown", onKey);

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: "top bottom",
      end: "bottom top",
      onEnter: () => {
        inView = true;
      },
      onEnterBack: () => {
        inView = true;
      },
      onLeave: () => {
        inView = false;
      },
      onLeaveBack: () => {
        inView = false;
      },
    });

    return () => {
      live = false;
      call?.kill();
      tl?.kill();
      trigger.kill();
      observer.disconnect();
      prevBtn?.removeEventListener("click", onPrev);
      nextBtn?.removeEventListener("click", onNext);
      window.removeEventListener("keydown", onKey);
      slides.forEach((s) => s.splits.forEach((s2) => s2.revert()));
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section
      className="tblock tsay"
      ref={rootRef}
      aria-labelledby="tsay-title"
      aria-roledescription="اسلایدر"
    >
      <div className="contact-shell">
        <h2 className="tblock-title" id="tsay-title">
          {title}
        </h2>

        {/* Where the reader is in the set on the margin, the quote itself in
            the wide column — the same two-column split the roster above uses,
            so the page keeps one spine all the way down. */}
        <div className="tsay-main">
          <div className="tsay-head">
            <p className="tsay-count">
              <span data-current>۱</span>
              <span aria-hidden="true"> / </span>
              <span>{faDigits(String(items.length))}</span>
            </p>
            <p className="tsay-lead">{lead}</p>
          </div>

          <div className="tsay-col">
            {/* One cell, every quote stacked in it — the section keeps the height
            of the longest one instead of jumping between quotes. */}
            <div className="tsay-stage">
              {items.map((t, i) => (
                <article
                  className={`tsay-slide${i === 0 ? " is-on" : ""}`}
                  key={t.id}
                  data-slide
                  aria-hidden={i !== 0}
                >
                  <blockquote className="tsay-quote" data-quote>
                    {`«${t.quote}»`}
                  </blockquote>

                  <footer className="tsay-who">
                    <span className="tsay-portrait" data-portrait>
                      {t.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.image} alt={t.imageAlt} loading="lazy" decoding="async" />
                      ) : (
                        <span className="tsay-initial" aria-hidden="true">
                          {t.initial}
                        </span>
                      )}
                    </span>

                    <span className="tsay-said">
                      <span className="tsay-name" data-line>
                        {t.name}
                      </span>
                      {t.role && (
                        <span className="tsay-role" data-line>
                          {t.role}
                        </span>
                      )}
                    </span>
                  </footer>
                </article>
              ))}
            </div>

            {items.length > 1 && (
              <div className="tsay-nav">
                <button className="tsay-btn" type="button" data-prev>
                  {prevLabel}
                </button>
                <button className="tsay-btn" type="button" data-next>
                  {nextLabel}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
