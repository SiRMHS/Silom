"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import PaperCanvas from "@/components/PaperCanvas";
import TxLink from "@/components/TxLink";
import SiteFooter from "@/components/SiteFooter";
import LogoMarquee from "@/components/LogoMarquee";
import MemberMedia from "@/components/MemberMedia";
import type { HomeContent } from "@rahyad/core";
import { pick } from "@rahyad/core/strings";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const faNum = (n: number) => Math.round(n).toLocaleString("fa-IR");

/* 0 → ۰۱, 1 → ۰۲ … the card index is positional, not stored per row */
const faIndex = (i: number) => (i + 1).toLocaleString("fa-IR").padStart(2, "۰");

/* The two highlight treatments the display headlines can carry (globals.css) */
const EMPHASIS_CLASS: Record<string, string> = { NONE: "", MARK: "mark", BRAND: "brand" };

function Words({ words }: { words: { text: string; emphasis: string }[] }) {
  return (
    <>
      {words.map((w, i) => (
        <span className="word" key={i}>
          <span className={`word-inner ${EMPHASIS_CLASS[w.emphasis] ?? ""}`}>{w.text}</span>
        </span>
      ))}
    </>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="eyebrow js-reveal">
      <span className="eyebrow-rule" aria-hidden="true" />
      {children}
    </span>
  );
}

export default function PageSections({ content }: { content: HomeContent }) {
  const {
    strings: t,
    stats: STATS,
    services: SERVICES,
    work: WORK,
    team: TEAM,
    manifestoWords,
    footerWords,
    partners,
  } = content;

  const root = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [openIdx, setOpenIdx] = useState(0);

  // Accordion. Height is animated imperatively rather than via a CSS
  // max-height guess, so a row is never clipped or left with dead space.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    panelRefs.current.forEach((panel, i) => {
      if (!panel) return;
      const open = i === openIdx;
      const inner = panel.querySelector(".service-panel-inner");
      const bits = panel.querySelectorAll(".service-body, .service-more, .tag");

      if (reduce) {
        gsap.set(panel, { height: open ? "auto" : 0 });
        gsap.set(bits, { opacity: open ? 1 : 0, y: 0 });
        return;
      }

      gsap.to(panel, {
        height: open ? "auto" : 0,
        duration: 0.55,
        ease: "power3.inOut",
        overwrite: true,
      });
      gsap.to(inner, {
        opacity: open ? 1 : 0,
        duration: open ? 0.4 : 0.2,
        delay: open ? 0.1 : 0,
        overwrite: true,
      });
      gsap.to(bits, {
        y: open ? 0 : 12,
        duration: 0.5,
        ease: "power3.out",
        stagger: open ? 0.045 : 0,
        delay: open ? 0.12 : 0,
        overwrite: true,
      });
    });
  }, [openIdx]);

  // Pointer glow: rect cached on enter so moving never forces layout
  const rowRect = useRef<DOMRect | null>(null);
  const cacheRowRect = (e: React.PointerEvent<HTMLElement>) => {
    rowRect.current = e.currentTarget.getBoundingClientRect();
  };
  const trackGlow = (e: React.PointerEvent<HTMLElement>) => {
    const r = rowRect.current;
    if (!r) return;
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  };

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        gsap.set(".js-reveal, .stat, .service, .work-card, .member", { opacity: 1, y: 0 });
        document
          .querySelectorAll(".js-words")
          .forEach((el) => el.setAttribute("data-lit", ""));
        return;
      }

      // Hidden from JS, never from CSS — without JS the page still reads
      gsap.set(".js-reveal", { opacity: 0, y: 34 });
      gsap.set(".stat, .work-card, .member", { opacity: 0 });
      gsap.set(".service", { opacity: 0, y: 30 });
      gsap.set(".word-inner", { yPercent: 115 });

      /* Generic reveal, driven by IntersectionObserver rather than
         ScrollTrigger.batch.

         ScrollTrigger caches each trigger's position when it is created, and
         this page keeps growing afterwards — the accordion animates its first
         panel open, the WebGL sheet mounts, fonts swap, the video loads. A
         trigger near the bottom then holds a start position for a layout that
         no longer exists and can simply never fire, which strands whatever it
         was hiding at opacity 0 for good. The contact field at the very end of
         the page was the one that showed it.

         An observer has no cached geometry and re-evaluates on every layout
         change, so the reveal cannot be missed.

         The service rows ride along: their reveal is a plain one-shot fade,
         neither positional nor scrubbed, so it has no reason to own a
         ScrollTrigger of its own. */
      const io = new IntersectionObserver(
        (entries) => {
          const hit = entries.filter((e) => e.isIntersecting).map((e) => e.target);
          if (!hit.length) return;
          hit.forEach((el) => io.unobserve(el));
          gsap.to(hit, {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.08,
            overwrite: true,
          });
        },
        { rootMargin: "0px 0px -10% 0px" },
      );
      gsap.utils.toArray<HTMLElement>(".js-reveal, .service").forEach((el) => io.observe(el));

      /* The remaining animations do need ScrollTrigger (they are positional or
         scrubbed), so re-measure once the page has stopped moving. */
      const refresh = () => ScrollTrigger.refresh();
      const settle = window.setTimeout(refresh, 900); // after the accordion opens
      document.fonts?.ready.then(refresh).catch(() => {});
      window.addEventListener("load", refresh);

      /* Backstop. Whatever the reason a trigger fails to fire — a throttled
         tab, an observer that never delivers, a layout that moved at the wrong
         moment — copy must not stay invisible. Anything still hidden after a
         few seconds is simply shown. When the observer works normally this
         finds nothing to do. */
      const rescue = window.setTimeout(() => {
        const stuck = gsap.utils
          .toArray<HTMLElement>(".js-reveal, .service")
          .filter((el) => Number(getComputedStyle(el).opacity) < 0.05);
        // set, not to: a tween needs the rAF ticker, which is exactly what may
        // be unavailable in the situations this backstop exists for
        if (stuck.length) gsap.set(stuck, { y: 0, opacity: 1, overwrite: true });
      }, 2600);

      // Headline words rise out of their own mask
      gsap.utils.toArray<HTMLElement>(".js-words").forEach((el) => {
        const words = el.querySelectorAll(".word-inner");
        gsap.fromTo(
          words,
          { yPercent: 115 },
          {
            yPercent: 0,
            duration: 1.05,
            ease: "power4.out",
            stagger: 0.055,
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              once: true,
              // CSS drives the highlight sweep; this just arms it
              onEnter: () => el.setAttribute("data-lit", ""),
            },
          },
        );
      });

      // Stats: cells rise, rules draw, numbers count
      gsap.utils.toArray<HTMLElement>(".stat").forEach((cell, i) => {
        const num = cell.querySelector<HTMLElement>(".stat-num");
        const target = Number(num?.dataset.value ?? 0);
        const rule = cell.querySelector(".stat-rule");
        const counter = { v: 0 };

        /* `once: true` is deliberately absent, and it is not an oversight.

           A ScrollTrigger declared on a *timeline* is not measured when it is
           created — it waits a tick, because the timeline is still being
           populated — so it sits in ScrollTrigger's global list with no
           position yet. The next trigger created after it (the team cards,
           below) force-refreshes that backlog on the way to measuring itself.
           If the page is already scrolled past the stats when this effect runs
           — a Fast Refresh, or a remount at a restored scroll position — those
           refreshes fire immediately, and a `once` trigger removes itself from
           the very list that is being walked, so the walk reads off the end of
           it and throws. That kills the whole page: React unwinds the tree, and
           the hero's canvases go with it.

           `play none none none` is what `once` was here for anyway — forward on
           enter, nothing on the other three edges — and re-entering only
           replays a timeline that has already finished, which is a no-op. */
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: ".stats",
            start: "top 82%",
            toggleActions: "play none none none",
          },
          delay: i * 0.1,
        });

        tl.fromTo(cell, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" })
          .fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: "power2.out" }, "-=0.55")
          .to(
            counter,
            {
              v: target,
              duration: 1.5,
              ease: "power2.out",
              onUpdate: () => {
                if (num) num.textContent = faNum(counter.v);
              },
            },
            "-=0.7",
          );
      });

      // Team cards rise in sequence
      gsap.fromTo(
        ".member",
        { y: 34, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.85,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: ".team-grid", start: "top 85%", once: true },
        },
      );

      // Work cards drift at slightly different rates
      gsap.utils.toArray<HTMLElement>(".work-card").forEach((card, i) => {
        gsap.fromTo(
          card,
          { y: 46, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            delay: i * 0.09,
            scrollTrigger: { trigger: ".work-grid", start: "top 85%", once: true },
          },
        );
        gsap.to(card.querySelector(".work-thumb"), {
          yPercent: -8 - i * 3,
          ease: "none",
          scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true },
        });
      });

      return () => {
        io.disconnect();
        clearTimeout(settle);
        clearTimeout(rescue);
        window.removeEventListener("load", refresh);
      };
    },
    { scope: root },
  );

  return (
    <div className="page-flow" ref={root}>
      {/* Transparent window onto the fixed hero video */}
      <div className="hero-spacer" aria-hidden="true" />

      <div className="page-body">
        <div className="page-sheet">
        <PaperCanvas />

        {/* ── مانیفست ─────────────────────────────── */}
        <section id="about" className="section">
          <div className="shell">
            <Eyebrow>{pick(t, "manifesto.eyebrow")}</Eyebrow>

            <h2 className="display js-words">
              <Words words={manifestoWords} />
            </h2>

            <p className="lede js-reveal">{pick(t, "manifesto.lede")}</p>

            <dl className="stats">
              {STATS.map((s) => (
                <div
                  className="stat"
                  key={s.id}
                  style={{ ["--accent" as string]: s.accent }}
                >
                  <span className="stat-rule" aria-hidden="true" />
                  <dt className="stat-value">
                    <span className="stat-num" data-value={s.value}>
                      {faNum(0)}
                    </span>
                    {s.suffix && (
                      <span className="stat-suffix" aria-hidden="true">
                        {s.suffix}
                      </span>
                    )}
                    <span className="sr-only">
                      {faNum(s.value)}
                      {s.suffix}
                    </span>
                  </dt>
                  <dd className="stat-label">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── خدمات ───────────────────────────────── */}
        <section id="services" className="section section--tint">
          <div className="shell">
            <Eyebrow>{pick(t, "services.eyebrow")}</Eyebrow>
            <div className="work-head js-reveal">
              <h2 className="headline">{pick(t, "services.heading", "خدمات")}</h2>
              {/* Leaving the home page plays the full-screen transition, the
                  same as the dock's own link to /services */}
              <TxLink
                className="ghost-link"
                href={pick(t, "services.linkHref", "/services")}
                label={pick(t, "services.linkLabel", "همه‌ی خدمات")}
              >
                {pick(t, "services.linkLabel", "همه‌ی خدمات")}
                <span aria-hidden="true">←</span>
              </TxLink>
            </div>

            <ul className="service-list">
              {SERVICES.map((s, i) => {
                const open = i === openIdx;
                return (
                  <li
                    key={s.id}
                    className="service"
                    data-open={open ? "" : undefined}
                    style={{ ["--accent" as string]: s.accent }}
                  >
                    <button
                      type="button"
                      className="service-head"
                      aria-expanded={open}
                      aria-controls={`service-panel-${i}`}
                      id={`service-head-${i}`}
                      onClick={() => setOpenIdx(open ? -1 : i)}
                      onPointerEnter={cacheRowRect}
                      onPointerMove={trackGlow}
                    >
                      <span className="service-index">{s.index}</span>
                      <span className="service-title">{s.title}</span>
                      <span className="service-toggle" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </span>
                    </button>

                    <div
                      className="service-panel"
                      id={`service-panel-${i}`}
                      role="region"
                      aria-labelledby={`service-head-${i}`}
                      inert={!open}
                      ref={(el) => {
                        panelRefs.current[i] = el;
                      }}
                    >
                      <div className="service-panel-inner">
                        <p className="service-body">{s.body}</p>

                        {/* This row is the summary of a whole page, and the
                            link is how you get to the rest of it — so it
                            follows the paragraph it continues rather than
                            sitting among the tags. */}
                        <TxLink
                          className="service-more"
                          href={`/services/${s.slug}`}
                          label={s.title}
                          accent={s.accent}
                        >
                          {pick(t, "services.rowCta", "جزئیات بیشتر")}
                          <span aria-hidden="true">←</span>
                        </TxLink>

                        <div className="service-tags">
                          {s.tags.map((tag) => (
                            <span key={tag} className="tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ── همکاران ─────────────────────────────── */}
        <LogoMarquee title={pick(t, "logos.title")} partners={partners} />

        {/* ── کارهای منتخب ────────────────────────── */}
        <section id="work" className="section">
          <div className="shell">
            <Eyebrow>{pick(t, "work.eyebrow")}</Eyebrow>
            <div className="work-head js-reveal">
              <h2 className="headline">{pick(t, "work.heading", "کارهای منتخب")}</h2>
              <Link className="ghost-link" href={pick(t, "work.linkHref", "/projects")}>
                {pick(t, "work.linkLabel", "همه‌ی پروژه‌ها")}
                <span aria-hidden="true">←</span>
              </Link>
            </div>

            <div className="work-grid">
              {WORK.map((w, i) => (
                <Link
                  key={w.id}
                  href={`/projects/${w.slug}`}
                  className="work-card"
                  style={{ ["--accent" as string]: w.color }}
                >
                  <span className="work-frame">
                    <span
                      className="work-thumb"
                      aria-hidden="true"
                      // falls back to the accent block when no image is set
                      style={w.image ? { backgroundImage: `url(${w.image})` } : undefined}
                    />
                    <span className="work-veil" aria-hidden="true" />
                    <span className="work-open" aria-hidden="true">
                      {pick(t, "work.cardCta", "مشاهده")}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M11 18l-6-6 6-6" />
                      </svg>
                    </span>
                    <span className="work-year" aria-hidden="true">
                      {w.year}
                    </span>
                  </span>

                  <span className="work-meta">
                    <span className="work-index" aria-hidden="true">
                      {faIndex(i)}
                    </span>
                    <span className="work-cat">{w.cat}</span>
                  </span>

                  <span className="work-title">{w.title}</span>
                  <span className="work-rule" aria-hidden="true" />
                  <span className="work-scope">{w.role}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── تیم ─────────────────────────────────── */}
        <section id="team" className="section section--tint">
          <div className="shell">
            <Eyebrow>{pick(t, "team.eyebrow")}</Eyebrow>
            <div className="work-head js-reveal">
              <h2 className="headline">{pick(t, "team.heading", "تیم ما")}</h2>
              <p className="team-note">{pick(t, "team.note")}</p>
            </div>

            <ul className="team-grid">
              {TEAM.map((m) => (
                <li
                  key={m.id}
                  className="member"
                  style={{ ["--accent" as string]: m.accent }}
                >
                  {/* a portrait — still, GIF or clip — replaces the monogram tile */}
                  <MemberMedia
                    src={m.image}
                    alt={m.imageAlt}
                    isVideo={m.isVideo}
                    monogram={m.monogram}
                  />
                  <h3 className="member-name">{m.name}</h3>
                  <span className="member-rule" aria-hidden="true" />
                  <p className="member-role">{m.role}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
        </div>

        {/* ── تماس ── outside .page-sheet on purpose: see .page-sheet in CSS ──
            The same footer every other page ends on; here the effect above
            already animates its words, so it is told not to do that itself. */}
        <SiteFooter words={footerWords} strings={t} revealedByPage />
      </div>
    </div>
  );
}
