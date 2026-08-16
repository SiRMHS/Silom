"use client";

import { useEffect, useRef } from "react";

/**
 * Living-paper backdrop for the scrolling slab.
 *
 * Cost control — this has to stay cheap on weak devices:
 *  • three.js is kept out of the initial bundle and imported on idle time
 *  • the field is very low frequency, so it renders into a ≤480px-wide buffer
 *    and is stretched by CSS; nothing visible is lost
 *  • 3 fbm octaves, no domain warp, no per-pixel grain (CSS supplies grain)
 *  • capped at 30fps, paused when off-screen or the tab is hidden
 *  • no layout reads or style writes on scroll — offsets are cached on resize
 *  • skipped entirely under prefers-reduced-motion
 *
 * Positioning is pure CSS (position:sticky on .paper-layer). Driving a fixed
 * layer's clip-path from script trails the content by a frame or more, which
 * reads as the backdrop edge lagging behind its section during a scroll.
 */

type ThreeModule = typeof import("three");

const MAX_BUFFER_W = 480;
const FRAME_MS = 1000 / 30;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;

  uniform float uTime;
  uniform float uScroll;
  uniform float uAspect;
  uniform vec2  uPointer;

  varying vec2 vUv;

  const vec3 PAPER = vec3(0.949, 0.937, 0.910);
  const vec3 DEEP  = vec3(0.851, 0.831, 0.792);
  const vec3 RED   = vec3(0.937, 0.267, 0.267);
  const vec3 BLUE  = vec3(0.114, 0.306, 0.847);

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = vnoise(p) * 0.5;
    p = p * 2.03 + vec2(17.3, 9.1);
    v += vnoise(p) * 0.25;
    p = p * 2.03 + vec2(5.7, 23.4);
    v += vnoise(p) * 0.125;
    return v;
  }

  // Soft round bleed, aspect-corrected
  float bleed(vec2 uv, vec2 c, float r) {
    vec2 d = uv - c;
    d.x *= uAspect;
    return 1.0 - smoothstep(0.0, r, length(d));
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.035;

    // One fbm plus a cheap sine drift instead of a full domain warp
    vec2 q = uv * vec2(2.2 * uAspect, 2.2);
    q += vec2(sin(q.y * 1.7 + t * 1.6), cos(q.x * 1.5 - t * 1.3)) * 0.28;
    float n = fbm(q + vec2(0.0, uScroll * 1.4));

    vec3 col = mix(PAPER, DEEP, smoothstep(0.28, 0.80, n) * 0.85);

    // Accent bleeds drift on opposite arcs as the page scrolls
    vec2 redC  = vec2(0.82 + sin(uTime * 0.09) * 0.05, 0.28 + uScroll * 0.55);
    vec2 blueC = vec2(0.16 + cos(uTime * 0.07) * 0.05, 1.05 - uScroll * 0.75);

    float shade = 0.55 + 0.45 * n;
    col = mix(col, RED,  bleed(uv, redC, 0.62) * shade * 0.085);
    col = mix(col, BLUE, bleed(uv, blueC, 0.66) * shade * 0.075);

    // Pointer lifts the sheet slightly
    col += bleed(uv, uPointer, 0.34) * 0.028;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/** `sheet` drives geometry; the fallback fill lives on the .page-body above it. */
function startPaper(THREE: ThreeModule, host: HTMLElement, sheet: HTMLElement) {
  const slab = sheet.closest<HTMLElement>(".page-body") ?? sheet;

  let renderer: InstanceType<ThreeModule["WebGLRenderer"]>;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "low-power",
      depth: false,
      stencil: false,
    });
  } catch {
    return undefined; // no WebGL — the slab keeps its CSS background
  }

  renderer.setPixelRatio(1);
  renderer.domElement.className = "paper-canvas";
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();

  const uniforms = {
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uAspect: { value: 1 },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
  };

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms }),
  );
  scene.add(mesh);

  // Layout reads happen here only — never per scroll event
  let slabTop = 0;
  let slabSpan = 1;

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scale = Math.min(1, MAX_BUFFER_W / Math.max(w, 1));
    renderer.setSize(Math.round(w * scale), Math.round(h * scale), false);
    uniforms.uAspect.value = w / Math.max(h, 1);

    let el: HTMLElement | null = sheet;
    let top = 0;
    while (el) {
      top += el.offsetTop;
      el = el.offsetParent as HTMLElement | null;
    }
    slabTop = top;
    slabSpan = Math.max(sheet.offsetHeight - h, 1);
  };
  resize();

  // Pointer eases toward the cursor so the halo drifts rather than snaps
  let px = 0.5;
  let py = 0.5;
  let tx = 0.5;
  let ty = 0.5;
  const onPointer = (e: PointerEvent) => {
    tx = e.clientX / Math.max(window.innerWidth, 1);
    ty = 1 - e.clientY / Math.max(window.innerHeight, 1);
  };

  // scrollY alone — no getBoundingClientRect, so scrolling never forces layout
  const progress = () =>
    Math.min(1, Math.max(0, (window.scrollY - slabTop) / slabSpan));

  uniforms.uScroll.value = progress();

  // Paint one frame before handing the sheet over, so the slab never flashes
  // transparent between dropping its CSS fill and the first render
  renderer.render(scene, camera);
  slab.classList.add("has-paper");

  let onScreen = true;
  const io = new IntersectionObserver(([entry]) => (onScreen = entry.isIntersecting), {
    rootMargin: "80px",
  });
  io.observe(sheet);

  const start = performance.now();
  let raf = 0;
  let last = 0;

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (!onScreen || document.hidden) return;
    if (now - last < FRAME_MS) return;
    last = now;

    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;
    uniforms.uPointer.value.set(px, py);
    uniforms.uScroll.value += (progress() - uniforms.uScroll.value) * 0.1;
    uniforms.uTime.value = (now - start) / 1000;

    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(tick);

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointer, { passive: true });

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onPointer);
    slab.classList.remove("has-paper");
    mesh.geometry.dispose();
    (mesh.material as InstanceType<ThreeModule["ShaderMaterial"]>).dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

export default function PaperCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const sheet = host?.parentElement; // .page-sheet
    if (!host || !sheet) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let disposed = false;
    let loading = false;
    let stop: (() => void) | undefined;

    // three.js stays out of the initial bundle, then loads on idle time once
    // first paint is done — so it costs nothing up front but is ready before
    // the reader arrives, instead of popping the background in mid-scroll.
    // A scroll past the fold pulls it in sooner for fast scrollers.
    const near = () => sheet.getBoundingClientRect().top < window.innerHeight * 0.95;

    // hoisted so load() can detach it
    function onScroll() {
      if (near()) load();
    }

    const load = () => {
      if (loading || disposed) return;
      loading = true;
      window.removeEventListener("scroll", onScroll);
      import("three")
        .then((THREE) => {
          if (!disposed) stop = startPaper(THREE, host, sheet);
        })
        .catch((err) => {
          console.warn("[PaperCanvas] three.js failed to load", err);
        });
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    // requestIdleCallback is still missing on Safari
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idle = hasIdle
      ? window.requestIdleCallback(() => load(), { timeout: 2500 })
      : window.setTimeout(load, 1200);

    return () => {
      disposed = true;
      window.removeEventListener("scroll", onScroll);
      if (hasIdle) window.cancelIdleCallback(idle);
      else clearTimeout(idle);
      stop?.();
    };
  }, []);

  return <div ref={hostRef} className="paper-layer" aria-hidden="true" />;
}
