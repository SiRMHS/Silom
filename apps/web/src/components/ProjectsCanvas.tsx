"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteProject } from "@rahyad/core";
import { HERO_VH } from "@/lib/heroGeometry";

/**
 * Infinite canvas of project tiles.
 *
 * A single tile is a perfectly packed 6×4 module — no holes — so repeating it
 * reads as one continuous composition rather than a repeating motif with gaps.
 * Enough copies are laid out to cover the viewport plus one tile, and the whole
 * plane is translated by the pan offset wrapped into one tile step, so panning
 * never runs out of content in any direction.
 *
 * Pan state lives in refs and is written straight to the plane's transform — no
 * React state per frame. Input is bound natively inside the effect so the whole
 * interaction sits in one place, and the rAF loop parks itself once motion
 * settles rather than idling forever.
 */

const COLS = 6;
const ROWS = 4;
const FRICTION = 0.94;
const REST = 0.04; // px/frame below which the loop parks
const DRAG_SLOP = 6; // travel before a press stops counting as a click
const FLY_MS = 760; // must match .pc-flyer's transition duration in CSS


export default function ProjectsCanvas({ projects }: { projects: SiteProject[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const planeRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  // the hint has done its job the moment the canvas is first moved
  const [explored, setExplored] = useState(false);

  useEffect(() => {
    const vp = viewportRef.current;
    const plane = planeRef.current;
    if (!vp || !plane) return;

    const pos = { x: 0, y: 0 };
    const vel = { x: 0, y: 0 };
    const step = { w: 1, h: 1 };
    const drag = { active: false, id: -1, px: 0, py: 0 };
    let moved = 0;
    let raf = 0;
    let running = false;
    let announced = false;

    const markExplored = () => {
      if (announced) return;
      announced = true;
      setExplored(true);
    };

    function draw() {
      // wrap into a single tile step so the copies always cover the viewport
      const ox = (((pos.x % step.w) + step.w) % step.w) - step.w;
      const oy = (((pos.y % step.h) + step.h) % step.h) - step.h;
      plane!.style.transform = `translate3d(${ox.toFixed(2)}px, ${oy.toFixed(2)}px, 0)`;
    }

    function loop() {
      if (!drag.active) {
        pos.x += vel.x;
        pos.y += vel.y;
        vel.x *= FRICTION;
        vel.y *= FRICTION;
      }
      draw();

      if (!drag.active && Math.abs(vel.x) < REST && Math.abs(vel.y) < REST) {
        running = false; // park until the next interaction
        return;
      }
      raf = requestAnimationFrame(loop);
    }

    function wake() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    }

    // Tile step = module size plus one gap, read from CSS so the two stay in sync
    function measure() {
      const cs = getComputedStyle(vp!);
      const unit = parseFloat(cs.getPropertyValue("--u")) || 160;
      const gap = parseFloat(cs.getPropertyValue("--gap")) || 14;
      step.w = COLS * (unit + gap);
      step.h = ROWS * (unit + gap);
      draw();
    }

    const onDown = (e: PointerEvent) => {
      drag.active = true;
      drag.id = e.pointerId;
      drag.px = e.clientX;
      drag.py = e.clientY;
      moved = 0;
      vel.x = 0;
      vel.y = 0;
      // Capture is deliberately NOT taken here. Capturing on pointerdown
      // retargets the resulting click to the capture element, so a plain tap
      // would never reach the card underneath. It is taken in onMove instead,
      // once the gesture has proven itself a drag.
      wake();
    };

    const onMove = (e: PointerEvent) => {
      if (!drag.active || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.px;
      const dy = e.clientY - drag.py;
      drag.px = e.clientX;
      drag.py = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > DRAG_SLOP) {
        markExplored();
        // now it is a drag: hold the pointer so it keeps tracking outside the
        // element, and so leaving the window doesn't strand mid-gesture
        if (!vp!.hasPointerCapture(e.pointerId)) vp!.setPointerCapture(e.pointerId);
      }
      pos.x += dx;
      pos.y += dy;
      vel.x = dx;
      vel.y = dy;
      wake();
    };

    const onUp = (e: PointerEvent) => {
      if (!drag.active || e.pointerId !== drag.id) return;
      drag.active = false;
      if (vp!.hasPointerCapture(e.pointerId)) vp!.releasePointerCapture(e.pointerId);
      // Flag only the panning case. Requiring a positive "this was a tap" flag
      // would also block activations that never produce pointer events at all —
      // notably Enter/Space on a focused card.
      if (moved > DRAG_SLOP) vp!.dataset.pan = "1";
      else delete vp!.dataset.pan;
      wake(); // let the inertia play out
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      markExplored();
      pos.x -= e.deltaX;
      pos.y -= e.deltaY;
      vel.x = 0;
      vel.y = 0;
      wake();
    };

    measure();
    window.addEventListener("resize", measure);
    vp.addEventListener("pointerdown", onDown);
    vp.addEventListener("pointermove", onMove);
    vp.addEventListener("pointerup", onUp);
    vp.addEventListener("pointercancel", onUp);
    vp.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      vp.removeEventListener("pointerdown", onDown);
      vp.removeEventListener("pointermove", onMove);
      vp.removeEventListener("pointerup", onUp);
      vp.removeEventListener("pointercancel", onUp);
      vp.removeEventListener("wheel", onWheel);
    };
  }, []);

  /**
   * Open a project by growing its artwork into the destination hero.
   *
   * A clone is flown rather than the card's own media: the card lives inside a
   * transformed, clipped plane, so promoting it to fixed position would fight
   * both. The clone lands on exactly the geometry the case-study page paints
   * its hero at, so the swap at the end is invisible.
   */
  const openProject = (e: React.MouseEvent, p: SiteProject) => {
    const card = e.currentTarget as HTMLElement;
    const vp = card.closest<HTMLElement>(".pc-viewport");
    const panned = vp?.dataset.pan === "1";
    if (vp) delete vp.dataset.pan; // consume it, so it can't block a later keypress
    if (panned) {
      e.preventDefault(); // that press was a pan, not a click
      return;
    }

    const media = card.querySelector(".pc-media");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!media || reduce) {
      router.push(`/projects/${p.slug}`);
      return;
    }

    const from = media.getBoundingClientRect();
    const flyer = document.createElement("div");
    flyer.className = "pc-flyer";
    flyer.style.setProperty("--c", p.color);
    // The clone has to carry the same artwork as the tile it left and the hero
    // it lands on, or the swap between the two shows as a flash of colour.
    if (p.image) flyer.style.setProperty("--img", `url(${JSON.stringify(p.image)})`);
    flyer.style.transform = `translate(${from.left}px, ${from.top}px)`;
    flyer.style.width = `${from.width}px`;
    flyer.style.height = `${from.height}px`;
    document.body.appendChild(flyer);

    // the canvas recedes as the artwork takes over, so the piece never looks
    // like a rectangle floating over an untouched grid
    vp?.classList.add("pc-leaving");

    // next frame, so the start state is committed before the transition runs
    requestAnimationFrame(() => {
      flyer.style.transform = "translate(0px, 0px)";
      flyer.style.width = "100vw";
      flyer.style.height = `${Math.round(window.innerHeight * HERO_VH)}px`;
      flyer.style.borderRadius = "0px";
    });

    // Driven by a timer, not transitionend: that event fires per property and
    // never fires at all for one that happens to start at its target value —
    // which strands the flyer on screen with no navigation.
    window.setTimeout(() => {
      router.push(`/projects/${p.slug}`);
      // the destination paints the same shape underneath; hold briefly so
      // there is never a bare frame between the two
      window.setTimeout(() => flyer.remove(), 650);
    }, FLY_MS);
  };

  // 3×3 copies covers the viewport plus one tile in every direction
  const copies = [-1, 0, 1];

  return (
    <div className="pc-viewport pc-fade" ref={viewportRef}>
      <div className="pc-plane" ref={planeRef} dir="ltr">
        {copies.map((iy) =>
          copies.map((ix) => (
            <div
              className="pc-tile"
              key={`${ix}:${iy}`}
              style={{ transform: `translate(${(ix + 1) * 100}%, ${(iy + 1) * 100}%)` }}
              aria-hidden={ix !== 0 || iy !== 0}
            >
              {projects.map((p) => (
                <button
                  type="button"
                  key={p.slug}
                  className="pc-card"
                  onClick={(e) => openProject(e, p)}
                  onPointerEnter={() => router.prefetch(`/projects/${p.slug}`)}
                  aria-label={`${p.title} — ${p.cat}`}
                  style={{
                    ["--c" as string]: p.color,
                    gridColumn: `${p.c + 1} / span ${p.w}`,
                    gridRow: `${p.r + 1} / span ${p.h}`,
                  }}
                  tabIndex={ix === 0 && iy === 0 ? 0 : -1}
                >
                  <span className="pc-row" dir="rtl">
                    <span className="pc-title">{p.title}</span>
                    <span className="pc-year">{p.year}</span>
                  </span>

                  <span
                    className="pc-media"
                    style={{
                      ["--c" as string]: p.color,
                      // The tile paints the project's picture when the panel
                      // has one; without it the tinted plate stands in.
                      ...(p.image ? { ["--img" as string]: `url(${JSON.stringify(p.image)})` } : {}),
                    }}
                  />

                  <span className="pc-row pc-row--foot" dir="rtl">
                    <span className="pc-tags">
                      {p.tags.map((t) => (
                        <em key={t}>{t}</em>
                      ))}
                    </span>
                    <span className="pc-cat">{p.cat}</span>
                  </span>
                </button>
              ))}
            </div>
          )),
        )}
      </div>

      <p className="pc-hint" data-gone={explored ? "" : undefined}>
        برای گشتن بکشید
      </p>
    </div>
  );
}
