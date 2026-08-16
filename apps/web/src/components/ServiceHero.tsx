"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * The head of a service landing page.
 *
 * Built like the case-study hero — a scrubbed transform on one oversized layer,
 * so the artwork drifts against the page without leaving the compositor — but
 * it carries real copy over the image instead of a caption beside it: this is
 * the page's own h1, its lede and what the service covers.
 *
 * With no image set the frame paints the service's accent instead, so a service
 * nobody has photographed yet still opens on a full-bleed hero rather than a
 * gap.
 */
/**
 * The hero artwork. A plain <img> rather than next/image: the frame is
 * full-bleed and oversized at every breakpoint, so the optimizer's fixed widths
 * would only re-encode a picture that is already being drawn edge to edge.
 */
function Art({ src, alt }: { src: string | null; alt: string }) {
  if (!src) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={src} alt={alt} loading="eager" fetchPriority="high" />
  );
}

export default function ServiceHero({
  accent,
  index,
  title,
  excerpt,
  tags,
  image,
  imageAlt,
}: {
  accent: string;
  index: string;
  title: string;
  excerpt: string;
  tags: string[];
  image: string | null;
  imageAlt: string;
}) {
  const root = useRef<HTMLElement | null>(null);
  const art = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.to(art.current, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });

      // The lines rise out of their own masks, the same reveal the display
      // headlines use on the home page.
      gsap.from(".sv-line", {
        yPercent: 110,
        duration: 1,
        ease: "power4.out",
        stagger: 0.07,
        delay: 0.12,
      });
      gsap.from(".sv-hero-tail", { opacity: 0, y: 18, duration: 0.9, ease: "power3.out", delay: 0.5 });

      /* Backstop, same as the home page's reveals. `from` hides these elements
         through JS and hands the rest to the rAF ticker — and a tab that is
         backgrounded or throttled between the two never gets the ticker, which
         would leave the page's own title invisible. `set`, not `to`: the ticker
         is exactly what may be unavailable here. */
      const rescue = window.setTimeout(() => {
        gsap.set(".sv-line", { yPercent: 0, overwrite: true });
        gsap.set(".sv-hero-tail", { opacity: 1, y: 0, overwrite: true });
      }, 2600);

      return () => clearTimeout(rescue);
    },
    { scope: root },
  );

  return (
    <header className="sv-hero" ref={root} style={{ ["--c" as string]: accent }}>
      <div className="sv-hero-frame">
        <div className="sv-hero-art" ref={art}>
          <Art src={image} alt={imageAlt} />
        </div>
        <span className="sv-hero-veil" aria-hidden="true" />
      </div>

      <div className="sv-hero-copy shell">
        <span className="sv-mask">
          <span className="sv-line sv-hero-index">{index}</span>
        </span>

        <h1 className="sv-mask sv-hero-title-wrap">
          <span className="sv-line sv-hero-title">{title}</span>
        </h1>

        <div className="sv-hero-tail">
          {excerpt && <p className="sv-hero-lede">{excerpt}</p>}

          {tags.length > 0 && (
            <ul className="sv-hero-tags">
              {tags.map((t) => (
                <li key={t} className="sv-tag">
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </header>
  );
}
