"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { HERO_VH } from "@/lib/heroGeometry";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Full-bleed case-study hero. Its height comes from the shared HERO_VH so the
 * canvas's expand animation lands exactly here.
 *
 * The artwork drifts slower than the page as you scroll — a scrubbed transform
 * on one element, which stays on the compositor.
 *
 * `image` is the picture set in the panel; without one the frame keeps the
 * tinted plate the canvas tile and its flown clone paint, so the landing of the
 * fly animation matches either way.
 */
export default function ProjectHero({
  color,
  cat,
  title,
  image,
  imageAlt,
}: {
  color: string;
  cat: string;
  title: string;
  image?: string | null;
  imageAlt?: string;
}) {
  const root = useRef<HTMLDivElement | null>(null);
  const art = useRef<HTMLDivElement | null>(null);

  // Keep the painted height in lockstep with the flown geometry
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const apply = () =>
      el.style.setProperty("--hero-h", `${Math.round(window.innerHeight * HERO_VH)}px`);
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.to(art.current, {
        yPercent: 14,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.from(".ph-line", {
        yPercent: 110,
        duration: 1,
        ease: "power4.out",
        stagger: 0.08,
        delay: 0.15,
      });
    },
    { scope: root },
  );

  return (
    <header className="ph" ref={root}>
      <div className="ph-frame">
        <div className="ph-art" ref={art} style={{ ["--c" as string]: color }}>
          {image && (
            /* eslint-disable-next-line @next/next/no-img-element --
               the hero is sized in viewport units and the flown clone paints
               the same file as a background, so both have to be the untouched
               upload or the two frames don't line up. */
            <img className="ph-img" src={image} alt={imageAlt || title} />
          )}
        </div>
      </div>

      <div className="ph-caption">
        <span className="ph-mask">
          <span className="ph-line ph-cat">{cat}</span>
        </span>
        <h1 className="ph-mask ph-title-wrap">
          <span className="ph-line ph-title">{title}</span>
        </h1>
      </div>
    </header>
  );
}
