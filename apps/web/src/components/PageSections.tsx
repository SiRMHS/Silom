"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import PaperCanvas from "@/components/PaperCanvas";
import ContactForm from "@/components/ContactForm";
import LogoMarquee from "@/components/LogoMarquee";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STATS = [
  { value: 12, suffix: "+", label: "سال تجربه", accent: "#ef4444" },
  { value: 180, suffix: "+", label: "پروژه", accent: "#1d4ed8" },
  { value: 40, suffix: "+", label: "برند", accent: "#c2410c" },
  { value: 9, suffix: "", label: "جایزه", accent: "#0f766e" },
];

const SERVICES = [
  {
    index: "۰۱",
    title: "هویت برند",
    body: "از نام و نشان تا سیستم بصری و لحن کلامی؛ هویتی که در هر نقطه‌ی تماس یکدست بماند.",
    tags: ["لوگو", "سیستم بصری", "کتابچه برند"],
    accent: "#ef4444",
  },
  {
    index: "۰۲",
    title: "طراحی و توسعه‌ی وب",
    body: "تجربه‌ی کاربری روشن، رابط دقیق و پیاده‌سازی سریع — سایتی که هم زیباست هم کار می‌کند.",
    tags: ["UX/UI", "Next.js", "بهینه‌سازی"],
    accent: "#1d4ed8",
  },
  {
    index: "۰۳",
    title: "تولید محتوا و ویدیو",
    body: "روایتی که دیده می‌شود؛ از ایده و استوری‌بورد تا موشن‌گرافیک و تدوین نهایی.",
    tags: ["موشن", "کمپین", "عکاسی"],
    accent: "#c2410c",
  },
  {
    index: "۰۴",
    title: "استراتژی و رشد",
    body: "پژوهش بازار، جایگاه‌یابی و برنامه‌ی رشد؛ تصمیم‌هایی که بر داده تکیه دارند.",
    tags: ["پژوهش", "پوزیشنینگ", "کمپین"],
    accent: "#0f766e",
  },
];

const WORK = [
  {
    index: "۰۱",
    title: "نشان‌واره‌ی آبان",
    cat: "هویت برند",
    year: "۱۴۰۳",
    scope: "هویت بصری، کتابچه برند",
    accent: "#ef4444",
  },
  {
    index: "۰۲",
    title: "پلتفرم مهرگان",
    cat: "وب و محصول",
    year: "۱۴۰۳",
    scope: "طراحی محصول، توسعه",
    accent: "#1d4ed8",
  },
  {
    index: "۰۳",
    title: "کمپین شب‌تاب",
    cat: "ویدیو و کمپین",
    year: "۱۴۰۲",
    scope: "کارگردانی، موشن",
    accent: "#c2410c",
  },
];

const TEAM = [
  { name: "آرش نیک‌روش", role: "مدیر خلاقیت", monogram: "آ", accent: "#ef4444" },
  { name: "سحر مرادی", role: "مدیر هنری", monogram: "س", accent: "#1d4ed8" },
  { name: "نیما رستمی", role: "سرپرست توسعه", monogram: "ن", accent: "#0f766e" },
  { name: "الهام کاظمی", role: "استراتژیست برند", monogram: "ا", accent: "#c2410c" },
];

const faNum = (n: number) => Math.round(n).toLocaleString("fa-IR");

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="eyebrow js-reveal">
      <span className="eyebrow-rule" aria-hidden="true" />
      {children}
    </span>
  );
}

export default function PageSections() {
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
      const bits = panel.querySelectorAll(".service-body, .tag");

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
      gsap.set(".stat, .service, .work-card, .member", { opacity: 0 });
      gsap.set(".word-inner", { yPercent: 115 });

      // Generic reveal — batched so a burst of elements shares one tween
      ScrollTrigger.batch(".js-reveal", {
        start: "top 88%",
        once: true,
        onEnter: (els) =>
          gsap.fromTo(
            els,
            { y: 34, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.9,
              ease: "power3.out",
              stagger: 0.08,
              overwrite: true,
            },
          ),
      });

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

        const tl = gsap.timeline({
          scrollTrigger: { trigger: ".stats", start: "top 82%", once: true },
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

      // Service rows slide in with their divider
      gsap.utils.toArray<HTMLElement>(".service").forEach((row) => {
        gsap.fromTo(
          row,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: { trigger: row, start: "top 88%", once: true },
          },
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
            <Eyebrow>رهیاد — آژانس خلاقیت</Eyebrow>

            <h2 className="display js-words">
              {[
                "برندها",
                "را",
                "از",
                { t: "دیده‌شدن", c: "mark" },
                "به",
                { t: "خاطر‌ماندن", c: "mark" },
                "می‌رسانیم.",
              ].map((w, i) => {
                const text = typeof w === "string" ? w : w.t;
                const cls = typeof w === "string" ? "" : w.c;
                return (
                  <span className="word" key={i}>
                    <span className={`word-inner ${cls}`}>{text}</span>
                  </span>
                );
              })}
            </h2>

            <p className="lede js-reveal">
              رهیاد یک استودیوی خلاقیت است؛ جایی که استراتژی، طراحی و روایت کنار هم
              می‌نشینند تا هر برند صدای خودش را پیدا کند. از هویت بصری تا تجربه‌ی
              دیجیتال، هر پروژه را مثل یک اثر می‌سازیم — نه یک سفارش.
            </p>

            <dl className="stats">
              {STATS.map((s) => (
                <div
                  className="stat"
                  key={s.label}
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
            <Eyebrow>چه کاری انجام می‌دهیم</Eyebrow>
            <h2 className="headline js-reveal">خدمات</h2>

            <ul className="service-list">
              {SERVICES.map((s, i) => {
                const open = i === openIdx;
                return (
                  <li
                    key={s.index}
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
                        <div className="service-tags">
                          {s.tags.map((t) => (
                            <span key={t} className="tag">
                              {t}
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
        <LogoMarquee />

        {/* ── کارهای منتخب ────────────────────────── */}
        <section id="work" className="section">
          <div className="shell">
            <Eyebrow>نمونه‌کار</Eyebrow>
            <div className="work-head js-reveal">
              <h2 className="headline">کارهای منتخب</h2>
              <a className="ghost-link" href="/projects">
                همه‌ی پروژه‌ها
                <span aria-hidden="true">←</span>
              </a>
            </div>

            <div className="work-grid">
              {WORK.map((w) => (
                <a
                  key={w.title}
                  href="/projects"
                  className="work-card"
                  style={{ ["--accent" as string]: w.accent }}
                >
                  <span className="work-frame">
                    <span className="work-thumb" aria-hidden="true" />
                    <span className="work-veil" aria-hidden="true" />
                    <span className="work-open" aria-hidden="true">
                      مشاهده
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
                      {w.index}
                    </span>
                    <span className="work-cat">{w.cat}</span>
                  </span>

                  <span className="work-title">{w.title}</span>
                  <span className="work-rule" aria-hidden="true" />
                  <span className="work-scope">{w.scope}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── تیم ─────────────────────────────────── */}
        <section id="team" className="section section--tint">
          <div className="shell">
            <Eyebrow>آدم‌ها</Eyebrow>
            <div className="work-head js-reveal">
              <h2 className="headline">تیم ما</h2>
              <p className="team-note">
                یک استودیوی کوچک و ثابت — همان‌هایی که پروژه را می‌گیرند، تحویلش
                هم می‌دهند.
              </p>
            </div>

            <ul className="team-grid">
              {TEAM.map((m) => (
                <li
                  key={m.name}
                  className="member"
                  style={{ ["--accent" as string]: m.accent }}
                >
                  <span className="member-frame">
                    <span className="member-monogram" aria-hidden="true">
                      {m.monogram}
                    </span>
                  </span>
                  <h3 className="member-name">{m.name}</h3>
                  <span className="member-rule" aria-hidden="true" />
                  <p className="member-role">{m.role}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
        </div>

        {/* ── تماس ── outside .page-sheet on purpose: see .page-sheet in CSS ── */}
        <footer id="contact" className="section section--footer">
          <div className="shell">
            <h2 className="display display--center js-words">
              {[
                "بیایید",
                "چیزی",
                "بسازیم",
                "که",
                { t: "یادش", c: "brand" },
                { t: "بماند.", c: "brand" },
              ].map((w, i) => {
                const text = typeof w === "string" ? w : w.t;
                const cls = typeof w === "string" ? "" : w.c;
                return (
                  <span className="word" key={i}>
                    <span className={`word-inner ${cls}`}>{text}</span>
                  </span>
                );
              })}
            </h2>

            <ContactForm />

            <div className="footer-meta js-reveal">
              <span>تهران، ایران</span>
              <span aria-hidden="true">•</span>
              <span>۱۴۰۴ — رهیاد</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
