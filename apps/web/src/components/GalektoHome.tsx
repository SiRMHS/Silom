"use client";

import { useEffect, useRef } from "react";
import SideRail, { type RailItem } from "@/components/SideRail";
import ScrollCue from "@/components/ScrollCue";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

function loadStylesheet(href: string): HTMLLinkElement {
  const existing = document.querySelector<HTMLLinkElement>(`link[href="${href}"]`);
  if (existing) return existing;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
  return link;
}

function initCursorFromSession() {
  const mx = parseFloat(sessionStorage.getItem("mx") || "");
  const my = parseFloat(sessionStorage.getItem("my") || "");
  const x = Number.isNaN(mx) ? -200 : mx;
  const y = Number.isNaN(my) ? -200 : my;
  const dot = document.getElementById("cursorDot");
  const ring = document.getElementById("cursorRing");
  if (dot) {
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
  }
  if (ring) {
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
  }
}

function initEarlyCRTMask() {
  const vv = window.visualViewport;
  const W = vv ? Math.round(vv.width) : window.innerWidth;
  const H = vv ? Math.round(vv.height) : window.innerHeight;
  const isMobile = W <= 768;
  const M_CORNER = isMobile ? 12 : 38;
  const M_MID = isMobile ? 4 : 8;
  const R = isMobile
    ? Math.min(Math.max(18, W * 0.03), 28)
    : Math.min(Math.max(40, W * 0.042), 70);

  const inner = [
    `M ${M_CORNER + R},${M_CORNER}`,
    `Q ${W / 2},${M_MID} ${W - M_CORNER - R},${M_CORNER}`,
    `Q ${W - M_CORNER},${M_CORNER} ${W - M_CORNER},${M_CORNER + R}`,
    `Q ${W - M_MID},${H / 2} ${W - M_CORNER},${H - M_CORNER - R}`,
    `Q ${W - M_CORNER},${H - M_CORNER} ${W - M_CORNER - R},${H - M_CORNER}`,
    `Q ${W / 2},${H - M_MID} ${M_CORNER + R},${H - M_CORNER}`,
    `Q ${M_CORNER},${H - M_CORNER} ${M_CORNER},${H - M_CORNER - R}`,
    `Q ${M_MID},${H / 2} ${M_CORNER},${M_CORNER + R}`,
    `Q ${M_CORNER},${M_CORNER} ${M_CORNER + R},${M_CORNER}`,
    "Z",
  ].join(" ");

  const outer = `M -200,-200 L ${W + 200},-200 L ${W + 200},${H + 200} L -200,${H + 200} Z`;
  const innerClip = `path('${inner}')`;

  const applyClip = (el: HTMLElement, clip: string) => {
    el.style.clipPath = clip;
    el.style.setProperty("-webkit-clip-path", clip);
  };

  const content = document.getElementById("crtContent");
  if (content) applyClip(content, innerClip);

  const overlay = document.querySelector<HTMLElement>(".page-tv-overlay");
  if (overlay) applyClip(overlay, innerClip);

  const frame = document.querySelector<HTMLElement>(".page-tv-frame");
  if (frame) {
    const evenOdd = `path(evenodd, '${outer} ${inner}')`;
    applyClip(frame, evenOdd);
    frame.style.visibility = "visible";
    frame.style.background = "#000";
  }

  const bevel = document.querySelector<HTMLElement>(".page-crt-bevel");
  if (bevel) applyClip(bevel, innerClip);
}

export default function GalektoHome({ rail }: { rail?: RailItem[] }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  /**
   * Document-level state, reapplied on every mount.
   *
   * This is a route, so leaving the home page unmounts it and the cleanup below
   * puts `<html>` and `<body>` back the way the rest of the site wants them.
   * Coming back has to redo all of it — which is why it is deliberately not
   * behind the one-shot guard the script loading uses.
   *
   * `js-ready` is the one that matters: the stylesheet hides `.portrait-section`
   * (the entire hero, video included) until the class is present, and main.js
   * only ever adds it once, on its own first run. Without this, returning to the
   * home page through the page transition left the video loaded and playing
   * behind `visibility: hidden` — which reads exactly like a video that failed
   * to load.
   */
  useEffect(() => {
    const prevHtmlLang = document.documentElement.lang;
    const prevHtmlDir = document.documentElement.dir;
    const prevBodyClass = document.body.className;
    const prevHtmlBg = document.documentElement.style.background;

    document.documentElement.lang = "fa";
    document.documentElement.dir = "rtl";
    document.documentElement.style.background = "#ffffff";
    // On the first visit main.js adds `js-ready` itself once it has taken over,
    // so the boot sequence isn't preceded by a flash of the hero.
    document.body.className = window.__galektoReady ? "page-index js-ready" : "page-index";

    // Already-loaded sheets are returned as-is, so this is a no-op on a return
    // visit — but the first mount of a session may not be the home page.
    loadStylesheet("/assets/css/style.css");
    loadStylesheet("/assets/css/nav.css");

    const frame = requestAnimationFrame(() => {
      // The scripts cache the elements they drive, and this mount replaced all
      // of them. Re-point them before reshaping anything.
      window.rebindGalektoHome?.();
      if (typeof window.setPageCRTShape === "function") window.setPageCRTShape();
      else initEarlyCRTMask();
    });
    window.addEventListener("resize", initEarlyCRTMask);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", initEarlyCRTMask);
      document.documentElement.lang = prevHtmlLang;
      document.documentElement.dir = prevHtmlDir;
      document.documentElement.style.background = prevHtmlBg;
      document.body.className = prevBodyClass;
    };
  }, []);

  /** The one-time half: stylesheets and scripts, which outlive any one mount. */
  useEffect(() => {
    if (window.__galektoInit) return;
    window.__galektoInit = true;
    window.__bootScreenActive = true;

    const w = window.innerWidth;
    if (w < 1200) {
      window.FluidSimOverride = {
        CURL: w < 600 ? 8 : w < 900 ? 12 : 16,
        SPLAT_RADIUS: w < 600 ? 0.18 : w < 900 ? 0.2 : 0.22,
        SIM_RESOLUTION: w < 600 ? 64 : w < 900 ? 96 : 128,
        PRESSURE_ITERATIONS: w < 600 ? 8 : w < 900 ? 12 : 16,
      };
    }

    initCursorFromSession();

    void (async () => {
      try {
        window.sanityFetch = () => Promise.resolve(null);
        await loadScript("/assets/js/transition.js");
        await loadScript("/assets/js/fluid.js");
        await loadScript("/assets/js/main.js");
        await loadScript("/assets/js/nav.js");
        await loadScript("/assets/js/tv-overlay.js");
        // Tells the effect above that main.js has run, so a later mount adds
        // `js-ready` itself rather than waiting for a re-init that never comes.
        window.__galektoReady = true;
        // And repairs the narrow case where a mount happened while these
        // scripts were still loading: it read the flag before it was set, so it
        // wrote a body class without `js-ready` and nothing else would ever add
        // one. main.js's own `init` already added it, so this is a no-op except
        // in exactly that race. Conditioned on `page-index` so it can't leave
        // the class behind on some other route the viewer has moved on to.
        if (document.body.classList.contains("page-index")) {
          document.body.classList.add("js-ready");
        }
        if (typeof window.setPageCRTShape === "function") {
          window.setPageCRTShape();
        } else {
          initEarlyCRTMask();
        }
      } catch (err) {
        console.error("[GalektoHome]", err);
      }
    })();
  }, []);

  /**
   * The hero video is the whole first screen, so a load that never starts
   * reads as a blank white page.
   *
   * Two ways it gets stuck, both silent — no `error` event either time:
   * a tab opened in the background has its media load deferred by the browser
   * and nothing resumes it once the tab is shown, and a refused autoplay parks
   * the element before the first frame. So the element gets nudged whenever
   * the page becomes visible again, and once more on the first input.
   */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Reloading costs a fetch, so it's bounded; play() is free to retry.
    let reloads = 0;

    const kick = () => {
      if (document.hidden) return;
      if (v.readyState === 0 && reloads < 3) {
        reloads++;
        v.load();
      }
      void v.play().catch(() => {});
    };

    // A deferred load reports no error and no progress, so the only signal is
    // that nothing arrived by the time it should have.
    const timer = window.setTimeout(kick, 2500);

    document.addEventListener("visibilitychange", kick);
    window.addEventListener("pageshow", kick);
    window.addEventListener("pointerdown", kick, { once: true, passive: true });
    v.addEventListener("error", kick);
    v.addEventListener("stalled", kick);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", kick);
      window.removeEventListener("pageshow", kick);
      window.removeEventListener("pointerdown", kick);
      v.removeEventListener("error", kick);
      v.removeEventListener("stalled", kick);
    };
  }, []);

  // Kept out of the one-shot init above so it survives a remount
  useEffect(() => {
    // The rail/cue reveal only waits for the boot sequence on the first visit
    let bootSeen = false;
    try {
      bootSeen = sessionStorage.getItem("bootSeen") === "1";
    } catch {}
    document.documentElement.style.setProperty("--rail-delay", bootSeen ? "0.35s" : "2.1s");

    // Hero depth + hero-chrome fade, driven by page scroll.
    // The zoom is written straight onto the frame element: setting a custom
    // property on :root invalidates style for the whole document on every
    // scroll event, which is enough to make the page feel heavy on its own.
    const frame = document.getElementById("portraitFrame");
    let lastP = -1;
    let scrolled: boolean | null = null;
    let queued = false;

    const apply = () => {
      queued = false;
      const y = window.scrollY || 0;

      const p = Math.min(1, y / Math.max(1, window.innerHeight));
      if (frame && Math.abs(p - lastP) > 0.005) {
        lastP = p;
        frame.style.transform = `scale(${(1 + p * 0.06).toFixed(4)})`;
      }

      const isScrolled = y > 60;
      if (isScrolled !== scrolled) {
        scrolled = isScrolled;
        document.body.classList.toggle("is-scrolled", isScrolled);
      }
    };

    // Coalesce bursts of scroll events into one write per frame
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <a href="#mainContent" className="skip-to-content">
        پرش به محتوا
      </a>

      <div id="crtContent">
      {/* Background layers */}
      <div className="bg-layer bg-layer--hidden" aria-hidden="true">
        <canvas className="bg-canvas" id="bgCanvas" />
        <canvas className="fluid-canvas" id="fluidCanvas" />
        <div className="bg-noise" />
      </div>

      {/* Side navigation */}
      <SideRail items={rail} />
      <ScrollCue />

      {/* Portrait + name */}
      <main id="mainContent">
        <h1 className="sr-only">رهیــــاد — آژانس خلاقیت</h1>
        <div className="slide-group" id="slideGroup" aria-hidden="true">
          <div className="portrait-section portrait-section--video" id="portraitSection">
            <div className="portrait-frame" id="portraitFrame">
              {/* loop-opt.mp4 is the re-encoded hero (516KB vs 13MB for the
                  original loop.mp4); main.js swaps in loop-mobile.mp4 on phones.
                  `media` on <source> only works inside <picture>, never <video>. */}
              <video
                ref={videoRef}
                className="portrait-base portrait-video"
                id="portraitBase"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster="/assets/videos/loop-poster.jpg"
                aria-label="ویدیوی رهیاد"
                draggable={false}
              >
                <source src="/assets/videos/loop-opt.mp4" type="video/mp4" />
              </video>
              <canvas className="illustration-canvas" id="illustrationCanvas" aria-hidden="true" />
            </div>
          </div>
        </div>
      </main>
      </div>

      {/* Custom cursor */}
      <div className="cursor" id="cursor" aria-hidden="true">
        <div className="cursor-ring" id="cursorRing" />
        <div className="cursor-dot" id="cursorDot" />
      </div>

      <div id="pageOverlay">
        <span className="overlay-label" id="overlayLabel" />
      </div>

      {/* Page CRT overlay */}
      <div className="page-tv-overlay" aria-hidden="true">
        <div className="page-scanlines" />
        <canvas className="page-grain-canvas" id="pageGrainCanvas" />
        <div className="page-scanner-lines">
          <span style={{ "--dur": "10s", "--op": "0.10" } as React.CSSProperties} />
          <span style={{ "--dur": "13s", "--op": "0.07" } as React.CSSProperties} />
          <span style={{ "--dur": "17s", "--op": "0.04" } as React.CSSProperties} />
        </div>
        <div className="page-inner-glow" />
        <div className="page-vignette" />
      </div>

      <div className="page-crt-bevel" aria-hidden="true" />
      <div className="page-tv-frame" aria-hidden="true" />
      <svg className="page-tv-stroke" aria-hidden="true" />
    </>
  );
}

declare global {
  interface Window {
    __galektoInit?: boolean;
    /** Set once main.js has run, so a later mount can reveal the hero itself. */
    __galektoReady?: boolean;
    __bootScreenActive?: boolean;
    /** main.js — re-points its cached element references at the current DOM. */
    rebindGalektoHome?: () => void;
    FluidSimOverride?: Record<string, number>;
    sanityFetch?: (query: string) => Promise<null>;
    setPageCRTShape?: () => void;
  }
}
