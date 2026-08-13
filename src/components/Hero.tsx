"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const NAV_LINKS = [
  { label: "پروژه‌ها", href: "#projects" },
  { label: "آثار", href: "#artworks" },
  { label: "تماس", href: "#contact" },
];

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    const screen = screenRef.current;
    if (!container || !screen) return;

    const strengths = [8, 14, 22, 32, 18, 10];
    const targets = strengths.map(() => ({ x: 0, y: 0 }));
    const current = strengths.map(() => ({ x: 0, y: 0 }));

    const onMove = (e: MouseEvent) => {
      const rect = screen.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      strengths.forEach((s, i) => {
        targets[i].x = nx * s;
        targets[i].y = ny * s;
      });
    };

    const tick = () => {
      layersRef.current.forEach((el, i) => {
        if (!el) return;
        current[i].x += (targets[i].x - current[i].x) * 0.08;
        current[i].y += (targets[i].y - current[i].y) * 0.08;
        el.style.transform = `translate3d(${current[i].x}px, ${current[i].y}px, 0)`;
      });
    };

    gsap.ticker.add(tick);
    screen.addEventListener("mousemove", onMove);

    return () => {
      gsap.ticker.remove(tick);
      screen.removeEventListener("mousemove", onMove);
    };
  }, []);

  useGSAP(
    () => {
      gsap.fromTo(
        ".hero-enter",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 1.2, ease: "power3.out", stagger: 0.08, delay: 0.2 }
      );

      gsap.fromTo(
        ".hero-title-enter",
        { opacity: 0, y: 60 },
        { opacity: 1, y: 0, duration: 1.4, ease: "power4.out", delay: 0.5 }
      );
    },
    { scope: containerRef }
  );

  const setLayer = (index: number) => (el: HTMLDivElement | null) => {
    layersRef.current[index] = el;
  };

  return (
    <section
      ref={containerRef}
      data-hero-crt
      className="relative flex min-h-screen w-full items-center justify-center bg-black px-4 py-8 md:px-8 md:py-12"
    >
      {/* TV bezel */}
      <div className="tv-frame relative w-full max-w-[1200px]">
        {/* CRT screen */}
        <div
          ref={screenRef}
          dir="ltr"
          className="crt-screen relative aspect-[16/10] w-full overflow-hidden rounded-[28px] md:rounded-[36px]"
        >
          {/* SVG barrel distortion filter */}
          <svg className="absolute h-0 w-0" aria-hidden>
            <defs>
              <filter id="crt-barrel">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
          </svg>

          <div className="crt-screen-inner absolute inset-0">
          {/* Layer 0 — paper texture bg */}
          <div
            ref={setLayer(0)}
            className="magnetic-layer absolute inset-0 bg-[#e8e4dc]"
          >
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJnoiPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjY1IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjA4Ii8+PC9zdmc+')] opacity-60" />
          </div>

          {/* Layer 1 — salmon blob */}
          <div
            ref={setLayer(1)}
            className="magnetic-layer pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <svg
              viewBox="0 0 800 600"
              className="h-[85%] w-[90%] opacity-90"
              aria-hidden
            >
              <path
                d="M120,320 C180,180 320,120 480,160 C620,195 720,280 680,400 C640,520 480,560 340,520 C200,480 60,440 120,320 Z"
                fill="#e8a090"
              />
            </svg>
          </div>

          {/* Layer 2 — wireframe oval */}
          <div
            ref={setLayer(2)}
            className="magnetic-layer pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <svg
              viewBox="0 0 800 500"
              className="h-[70%] w-[85%]"
              aria-hidden
            >
              <ellipse
                cx="400"
                cy="250"
                rx="340"
                ry="200"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="0.8"
                opacity="0.35"
              />
              <ellipse
                cx="400"
                cy="250"
                rx="300"
                ry="175"
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="0.5"
                opacity="0.2"
              />
            </svg>
          </div>

          {/* Layer 3 — portrait */}
          <div
            ref={setLayer(3)}
            className="magnetic-layer pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="relative h-[72%] w-[38%] min-w-[180px] max-w-[320px] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop&crop=face"
                alt=""
                className="h-full w-full object-cover object-top grayscale contrast-[1.1]"
                draggable={false}
              />
              {/* geometric collage overlay */}
              <div className="absolute inset-0 mix-blend-multiply">
                <div className="absolute left-0 top-0 h-1/2 w-1/2 bg-gradient-to-br from-orange-400/70 via-red-400/50 to-transparent" />
                <div className="absolute left-[8%] top-[18%] h-16 w-16 rotate-12 border border-black/30 bg-yellow-400/40" />
                <div className="absolute left-[22%] top-[35%] h-10 w-10 -rotate-6 bg-red-500/50" style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }} />
                <div className="absolute left-[5%] top-[55%] h-8 w-20 bg-orange-600/40" />
              </div>
            </div>
          </div>

          {/* Layer 4 — large title (overlaps portrait) */}
          <div
            ref={setLayer(4)}
            className="magnetic-layer pointer-events-none absolute inset-x-0 bottom-[6%] z-10 flex justify-center"
          >
            <h1 className="hero-title-enter select-none text-[clamp(3.5rem,14vw,9rem)] font-black uppercase leading-[0.85] tracking-tighter text-black">
              رهیاد
            </h1>
          </div>

          {/* Layer 5 — side indicators */}
          <div
            ref={setLayer(5)}
            className="magnetic-layer pointer-events-none absolute inset-0"
          >
            <div className="hero-enter absolute left-[4%] top-1/2 flex -translate-y-1/2 flex-col items-start gap-1 md:left-[6%]">
              <span className="text-[10px] font-light uppercase tracking-[0.25em] text-black/50 md:text-xs">
                ← پروژه‌ها
              </span>
              <span className="text-[clamp(4rem,10vw,7rem)] font-extralight leading-none text-black/10">
                ۰۱
              </span>
            </div>
            <div className="hero-enter absolute right-[4%] top-1/2 flex -translate-y-1/2 flex-col items-end gap-1 md:right-[6%]">
              <span className="text-[10px] font-light uppercase tracking-[0.25em] text-black/50 md:text-xs">
                ۰۲ آثار →
              </span>
              <span className="text-[clamp(4rem,10vw,7rem)] font-extralight leading-none text-black/10">
                ۰۲
              </span>
            </div>
          </div>

          {/* UI — fixed, no parallax */}
          <div className="pointer-events-auto absolute inset-0 z-20">
            <div className="hero-enter flex items-center justify-between px-6 pt-6 md:px-10 md:pt-8">
              <a
                href="#"
                className="text-xs font-light uppercase tracking-[0.3em] text-black/70 transition-opacity hover:opacity-60 md:text-sm"
              >
                رهیاد
              </a>
              <nav className="flex items-center gap-5 md:gap-8">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-[10px] font-light uppercase tracking-[0.2em] text-black/60 transition-opacity hover:text-black md:text-xs"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>

          {/* CRT overlays */}
          <div className="crt-vignette pointer-events-none absolute inset-0 z-30" />
          <div className="crt-scanlines pointer-events-none absolute inset-0 z-30" />
          <div className="crt-flicker pointer-events-none absolute inset-0 z-30" />
          </div>
        </div>
      </div>
    </section>
  );
}
