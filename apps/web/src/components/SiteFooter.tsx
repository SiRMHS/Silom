"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ContactForm from "@/components/ContactForm";
import { pick, type SiteStrings } from "@rahyad/core/strings";

/**
 * The closing band every page ends on: the display headline, the one-line
 * "leave an address" field, and the studio's own line of small print.
 *
 * It is one component rather than a copy per page, so the words edited in the
 * panel and the field that writes to the inbox are the same everywhere.
 *
 * Two pages drive its reveal differently. On the home page the surrounding
 * PageSections effect already animates `.js-words` and `.js-reveal` across the
 * whole flow, so the footer there is rendered with `revealedByPage` and keeps
 * its hands off — animating the same words twice would fight over them.
 * Everywhere else it reveals itself, through an IntersectionObserver rather
 * than a ScrollTrigger: these pages grow after mount (images, fonts, an
 * accordion) and a trigger that cached its position before that can simply
 * never fire, which would strand the footer at opacity 0.
 */

export type FooterWord = { text: string; emphasis: string };

/* The two highlight treatments the display headlines can carry (globals.css) */
const EMPHASIS_CLASS: Record<string, string> = { NONE: "", MARK: "mark", BRAND: "brand" };

export default function SiteFooter({
  words,
  strings: t,
  revealedByPage = false,
}: {
  words: FooterWord[];
  strings: SiteStrings;
  /** The page already animates `.js-words`/`.js-reveal` — don't double up. */
  revealedByPage?: boolean;
}) {
  const root = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = root.current;
    if (revealedByPage || !el) return;

    const heading = el.querySelector<HTMLElement>(".js-words");
    const inners = el.querySelectorAll(".word-inner");
    const meta = el.querySelector<HTMLElement>(".footer-meta");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Hidden from JS, never from CSS — without JS the footer still reads
    const show = () => {
      gsap.set(inners, { yPercent: 0, overwrite: true });
      if (meta) gsap.set(meta, { opacity: 1, y: 0, overwrite: true });
      heading?.setAttribute("data-lit", "");
    };

    if (reduce) {
      show();
      return;
    }

    gsap.set(inners, { yPercent: 115 });
    if (meta) gsap.set(meta, { opacity: 0, y: 24 });

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();

        gsap.to(inners, { yPercent: 0, duration: 1.05, ease: "power4.out", stagger: 0.055 });
        // CSS drives the highlight sweep behind a marked word; this arms it
        heading?.setAttribute("data-lit", "");
        if (meta) {
          gsap.to(meta, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", delay: 0.25 });
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);

    /* Backstop. Whatever the reason the observer fails to deliver — a
       throttled tab, a layout that moved at the wrong moment — the studio's
       closing line must not stay invisible. `set`, not `to`: a tween needs the
       rAF ticker, which is exactly what may be unavailable here. When the
       observer works normally this finds nothing to do. */
    const rescue = window.setTimeout(() => {
      if (meta && Number(getComputedStyle(meta).opacity) < 0.05) show();
    }, 4000);

    return () => {
      io.disconnect();
      clearTimeout(rescue);
    };
  }, [revealedByPage]);

  return (
    <footer id="contact" className="section section--footer" ref={root}>
      <div className="shell">
        {/* `js-words` is what the highlight-sweep CSS keys on, so it stays
            whichever effect drives the words. */}
        <h2 className="display display--center js-words">
          {words.map((w, i) => (
            <span className="word" key={i}>
              <span className={`word-inner ${EMPHASIS_CLASS[w.emphasis] ?? ""}`}>{w.text}</span>
            </span>
          ))}
        </h2>

        <ContactForm strings={t} />

        <div className={`footer-meta${revealedByPage ? " js-reveal" : ""}`}>
          <span>{pick(t, "footer.location")}</span>
          <span aria-hidden="true">•</span>
          <span>{pick(t, "footer.copyright")}</span>
        </div>
      </div>
    </footer>
  );
}
