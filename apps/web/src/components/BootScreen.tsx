"use client";

import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import gsap from "gsap";

type Phase = "noise" | "words" | "flyout" | "done";

// Creative-agency words — penultimate "با", final "رهیاد"
const WORDS = [
  "ایده",
  "طراحی",
  "برند",
  "استراتژی",
  "خلاقیت",
  "هنر",
  "دیجیتال",
  "تجربه",
  "رشد",
  "کسب‌و‌کار",
  "با",
  "رهیاد",
];

const NOISE_MS = 800;
const WORD_MS = 360;
const FLY_MS = 1000;

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform float u_intensity;
uniform float u_roll;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0,0.0));
  float c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 px = gl_FragCoord.xy;
  float t = u_time * 60.0;
  float n = 0.0;
  n += vnoise(px * 0.9 + vec2(0.0, t * 0.21)) * 0.5;
  n += vnoise(px * 2.2 + vec2(t * 0.17, 0.0)) * 0.3;
  n += vnoise(px * 5.5 + vec2(t * 0.13, t * 0.09)) * 0.2;
  n = clamp(n, 0.0, 1.0);
  float spark = step(0.985, hash(px + mod(t, 97.0)));
  n = max(n, spark);
  float line = floor(gl_FragCoord.y / 3.0);
  n += (hash(vec2(line, floor(u_time * 12.0))) - 0.5) * 0.12;
  float rollY = fract(uv.y + u_roll);
  float rollBand = smoothstep(0.0, 0.04, rollY) * smoothstep(0.12, 0.04, rollY);
  n = mix(n, n * 0.35 + 0.65, rollBand * 0.5);
  float scan = 0.88 + 0.12 * sin(gl_FragCoord.y * 3.14159 * 2.0 / 3.0);
  n *= scan;
  float g = n;
  float r = n * (0.96 + 0.04 * sin(u_time * 2.0));
  float b = n * (0.96 + 0.04 * cos(u_time * 1.7));
  vec2 vc = uv - 0.5;
  float vig = clamp(1.0 - dot(vc, vc) * 1.25, 0.35, 1.0);
  vec3 col = vec3(r, g, b) * vig * u_intensity;
  col = mix(vec3(0.0), col, 0.92);
  gl_FragColor = vec4(col, 1.0);
}
`;

function useWebGLNoise(canvasRef: React.RefObject<HTMLCanvasElement | null>, active: boolean) {
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl =
      (canvas.getContext("webgl", { antialias: false, alpha: false }) as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uInt = gl.getUniformLocation(prog, "u_intensity");
    const uRoll = gl.getUniformLocation(prog, "u_roll");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(2, Math.floor(window.innerWidth * dpr));
      const h = Math.max(2, Math.floor(window.innerHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    startRef.current = performance.now();
    const render = () => {
      const t = (performance.now() - startRef.current) / 1000;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uInt, 1);
      gl.uniform1f(uRoll, (t * 0.08) % 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      rafRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [active, canvasRef]);
}

/** Barrel CRT bezel clip-path (matches site tv-overlay shape) */
function useBarrelBezel() {
  const [clips, setClips] = useState<{ bezel: string; inner: string }>({ bezel: "", inner: "" });
  useEffect(() => {
    const compute = () => {
      const vv = window.visualViewport;
      const W = vv ? Math.round(vv.width) : window.innerWidth;
      const H = vv ? Math.round(vv.height) : window.innerHeight;
      const isMobile = W <= 768;
      const M = isMobile ? 12 : 38;
      const MM = isMobile ? 4 : 8;
      const R = isMobile ? Math.min(Math.max(18, W * 0.03), 28) : Math.min(Math.max(40, W * 0.042), 70);
      const inner = [
        `M ${M + R},${M}`,
        `Q ${W / 2},${MM} ${W - M - R},${M}`,
        `Q ${W - M},${M} ${W - M},${M + R}`,
        `Q ${W - MM},${H / 2} ${W - M},${H - M - R}`,
        `Q ${W - M},${H - M} ${W - M - R},${H - M}`,
        `Q ${W / 2},${H - MM} ${M + R},${H - M}`,
        `Q ${M},${H - M} ${M},${H - M - R}`,
        `Q ${MM},${H / 2} ${M},${M + R}`,
        `Q ${M},${M} ${M + R},${M}`,
        "Z",
      ].join(" ");
      const outer = `M -200,-200 L ${W + 200},-200 L ${W + 200},${H + 200} L -200,${H + 200} Z`;
      setClips({
        bezel: `path(evenodd, '${outer} ${inner}')`,
        inner: `path('${inner}')`,
      });
    };
    compute();
    window.addEventListener("resize", compute);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("resize", compute);
      window.visualViewport?.removeEventListener("resize", compute);
    };
  }, []);
  return clips;
}

export default function BootScreen({ onDone }: { onDone?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const finalRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<Phase>("noise");
  const [wordIdx, setWordIdx] = useState(0);
  const [intensity, setIntensity] = useState(1);
  const [bootOpacity, setBootOpacity] = useState(1);
  const doneRef = useRef(false);
  const bezelClip = useBarrelBezel();

  useWebGLNoise(canvasRef, phase !== "done");

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    document.body.classList.remove("boot-active");
    document.documentElement.classList.remove("boot-lock");
    window.__bootScreenActive = false;
    try { sessionStorage.setItem("bootSeen", "1"); } catch {}
    setPhase("done");
    onDone?.();
  }, [onDone]);

  // Boot flag + body class — only on first visit per session (SPA-friendly)
  useLayoutEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("bootSeen") === "1"; } catch {}
    if (seen) {
      window.__bootScreenActive = false;
      setPhase("done");
      return;
    }
    window.__bootScreenActive = true;
    document.body.classList.add("boot-active");
    document.documentElement.classList.add("boot-lock");
    window.scrollTo(0, 0);
    return () => {
      document.body.classList.remove("boot-active");
      document.documentElement.classList.remove("boot-lock");
      window.__bootScreenActive = false;
    };
  }, []);

  // Where رهیاد lands: the brand header's centre line
  const flyY = useMemo(() => {
    if (typeof window === "undefined") return -200;
    const headerCenter = window.innerWidth <= 768 ? 72 : 82;
    return -(window.innerHeight / 2 - headerCenter);
  }, []);

  useEffect(() => {
    if (phase === "noise") {
      const t = setTimeout(() => setPhase("words"), NOISE_MS);
      return () => clearTimeout(t);
    }
    if (phase === "words") {
      if (wordIdx >= WORDS.length) {
        setPhase("flyout");
        return;
      }
      setIntensity(Math.max(0.15, 1 - (wordIdx / WORDS.length) * 0.88));
      const t = setTimeout(() => setWordIdx((i) => i + 1), WORD_MS);
      return () => clearTimeout(t);
    }
    if (phase === "flyout") {
      // Page reveals as رهیاد flies; header appears exactly when it lands
      setIntensity(0);

      const el = finalRef.current;
      if (el) {
        const dur = FLY_MS / 1000;
        gsap.to(el, { scale: 0.42, y: flyY, duration: dur, ease: "power2.inOut" });
        gsap.to(el, { opacity: 0, duration: dur * 0.3, delay: dur * 0.7, ease: "none" });
      }

      const start = performance.now();
      let raf = 0;
      const tick = () => {
        const e = performance.now() - start;
        const p = Math.min(1, e / FLY_MS);
        setBootOpacity(1 - p);
        if (p < 1) raf = requestAnimationFrame(tick);
        else {
          document.body.classList.remove("boot-active");
          finish();
        }
      };
      raf = requestAnimationFrame(tick);
      // rAF is throttled in background tabs — never leave the screen covered
      const guard = setTimeout(finish, FLY_MS + 600);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(guard);
        if (finalRef.current) gsap.killTweensOf(finalRef.current);
      };
    }
  }, [phase, wordIdx, finish, flyY]);

  const showWord = phase === "words" && wordIdx < WORDS.length;
  const showFinal = phase === "flyout";
  const currentWord = WORDS[Math.min(wordIdx, WORDS.length - 1)];
  const isRaheyad = currentWord === "رهیاد" || showFinal;

  if (phase === "done") return null;

  return (
    <>
      {
        <div
          className="boot-screen fixed inset-0 z-10010 flex items-center justify-center overflow-hidden bg-black"
          style={{ opacity: bootOpacity }}
          aria-hidden="true"
          role="presentation"
        >
          <canvas
            ref={canvasRef}
            className="boot-noise absolute inset-0 h-full w-full"
            style={{
              opacity: intensity,
              transition: "opacity 0.35s ease",
              clipPath: bezelClip.inner,
              WebkitClipPath: bezelClip.inner,
            }}
          />
          <div className="boot-scanlines pointer-events-none absolute inset-0" style={{ clipPath: bezelClip.inner, WebkitClipPath: bezelClip.inner }} />

          {/* CRT TV bezel frame */}
          <div
            className="boot-bezel pointer-events-none absolute inset-0"
            style={{
              clipPath: bezelClip.bezel,
              WebkitClipPath: bezelClip.bezel,
              background: "#000",
              boxShadow: "inset 0 0 120px rgba(0,0,0,0.9)",
            }}
          />

          <div className="relative z-10 flex h-full w-full items-center justify-center px-6">
            {phase === "noise" && (
              <div className="boot-hint font-(family-name:--font-peyda) text-white/40 text-xs sm:text-sm tracking-widest">
                در حال تنظیم آنتن…
              </div>
            )}

            {showWord && (
              <div
                key={currentWord + wordIdx}
                className="boot-word font-(family-name:--font-peyda) text-center text-white"
                style={{
                  fontSize: isRaheyad ? "clamp(3rem, 13vw, 10rem)" : "clamp(1.8rem, 7vw, 4.5rem)",
                  fontWeight: isRaheyad ? 900 : 700,
                  letterSpacing: "0.01em",
                  textShadow: isRaheyad
                    ? "0 0 40px rgba(255,255,255,0.4)"
                    : "0 0 18px rgba(255,255,255,0.18)",
                }}
              >
                {currentWord}
              </div>
            )}

            {showFinal && (
              <div
                ref={finalRef}
                className="font-(family-name:--font-peyda) relative text-white"
                style={{
                  fontSize: "clamp(3rem, 13vw, 10rem)",
                  fontWeight: 900,
                  letterSpacing: "0.01em",
                  textShadow: "0 0 40px rgba(255,255,255,0.4)",
                }}
              >
                رهیاد
              </div>
            )}
          </div>

          <style>{`
            .boot-scanlines {
              background: repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 3px);
              mix-blend-mode: multiply;
            }
            .boot-screen { cursor: none; }
            .boot-hint { animation: bootHint 1.1s linear infinite; }
            @keyframes bootHint {
              0%   { opacity: 0; }
              50%  { opacity: 0.5; }
              100% { opacity: 0.2; }
            }
            .boot-word { animation: bootWordIn 0.26s cubic-bezier(0.16, 1, 0.3, 1) both; }
            @keyframes bootWordIn {
              from { opacity: 0; transform: scale(0.9); filter: blur(6px); }
              to   { opacity: 1; transform: scale(1);   filter: blur(0px); }
            }
          `}</style>
        </div>
      }
    </>
  );
}

declare global {
  interface Window {
    __bootScreenActive?: boolean;
  }
}
