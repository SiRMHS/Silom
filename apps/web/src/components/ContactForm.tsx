"use client";

import { useRef, useState } from "react";
import { submitContact } from "@/app/contact-actions";
import { pick, type SiteStrings } from "@rahyad/core/strings";

/**
 * Contact field whose text disintegrates into dust on submit.
 *
 * The text is rasterised once into an offscreen buffer, sampled into particles,
 * then animated by writing straight into an ImageData word array — a few
 * thousand typed-array writes per frame rather than a few thousand canvas draw
 * calls, so the burst stays cheap. It runs for ~1.1s and then stops for good.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?\d{10,15}$/;
const DURATION = 1100;
const STEP = 2; // sampling stride, in device px

/** Persian (۰-۹, U+06F0) and Arabic-Indic (٠-٩, U+0660) digits → ASCII */
const toLatinDigits = (s: string) =>
  s.replace(/[۰-۹٠-٩]/g, (d) => {
    const c = d.charCodeAt(0);
    return String(c >= 0x06f0 ? c - 0x06f0 : c - 0x0660);
  });

/** Accepts an email or a phone number written in either digit set. */
function isReachable(raw: string) {
  const v = raw.trim();
  if (EMAIL_RE.test(v)) return true;
  const digits = toLatinDigits(v).replace(/[\s()\-.]/g, "");
  return PHONE_RE.test(digits);
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  delay: number;
};

function dissolve(canvas: HTMLCanvasElement, box: DOMRect, text: string, font: string, rgb: [number, number, number]) {
  return new Promise<void>((resolve) => {
    const w = Math.max(1, Math.ceil(box.width));
    const h = Math.max(1, Math.ceil(box.height));
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      resolve();
      return;
    }

    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(text, w / 2, h / 2);

    const src = ctx.getImageData(0, 0, w, h).data;
    const parts: Particle[] = [];

    for (let y = 0; y < h; y += STEP) {
      for (let x = 0; x < w; x += STEP) {
        if (src[(y * w + x) * 4 + 3] < 40) continue;
        parts.push({
          x,
          y,
          // drift up and outward from the centre line
          vx: (Math.random() - 0.5) * 26 + (x / w - 0.5) * 22,
          vy: -14 - Math.random() * 34,
          // sweep the dissolve across the word instead of vanishing at once
          delay: (x / w) * 0.34 + Math.random() * 0.12,
        });
      }
    }

    if (!parts.length) {
      resolve();
      return;
    }

    const img = ctx.createImageData(w, h);
    const buf = new Uint32Array(img.data.buffer);
    // little-endian packing: 0xAABBGGRR
    const base = (rgb[2] << 16) | (rgb[1] << 8) | rgb[0];

    const start = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const elapsed = (now - start) / DURATION;
      buf.fill(0);

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const t = (elapsed - p.delay) / (1 - p.delay);

        let px = p.x;
        let py = p.y;
        let a = 255;

        if (t > 0) {
          if (t >= 1) continue;
          const ease = t * t;
          px = p.x + p.vx * ease;
          py = p.y + p.vy * ease;
          a = (1 - t) * 255;
        }

        const ix = px | 0;
        const iy = py | 0;
        if (ix < 0 || ix >= w || iy < 0 || iy >= h) continue;
        buf[iy * w + ix] = (a << 24) | base;
      }

      ctx.putImageData(img, 0, 0);

      if (elapsed < 1.05) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w, h);
        cancelAnimationFrame(raf);
        resolve();
      }
    };

    raf = requestAnimationFrame(frame);
  });
}

export default function ContactForm({ strings }: { strings: SiteStrings }) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "invalid" | "sending" | "done">("idle");

  const wrapRef = useRef<HTMLLabelElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending" || status === "done") return;

    const email = value.trim();
    if (!isReachable(email)) {
      setStatus("invalid");
      inputRef.current?.focus();
      return;
    }

    setStatus("sending");

    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const input = inputRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (wrap && canvas && input && !reduce) {
      const cs = getComputedStyle(input);
      const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const rgb = (cs.color.match(/\d+/g) ?? ["241", "238", "231"])
        .slice(0, 3)
        .map(Number) as [number, number, number];

      // hide the live text the moment the dust takes over
      input.style.color = "transparent";
      input.style.caretColor = "transparent";
      await dissolve(canvas, wrap.getBoundingClientRect(), email, font, rgb);
      input.style.color = "";
      input.style.caretColor = "";
    }

    // Lands in the admin panel's inbox. A failure here is deliberately not
    // surfaced: the dust has already played, and re-showing the field would
    // read as the message being lost rather than retried.
    try {
      await submitContact(email);
    } catch (err) {
      console.error("[contact]", err);
    }

    setValue("");
    setStatus("done");
  };

  return (
    <form className="contact js-reveal" onSubmit={onSubmit} noValidate>
      {/* Once the text has turned to dust the field is retired rather than
          reset — an empty box after a send is a dead end, and it keeps the
          controlled value out of the picture entirely. */}
      {status === "done" ? (
        <p className="contact-done">{pick(strings, "contact.doneTitle", "پیام‌تان رسید.")}</p>
      ) : (
        <label className="contact-field" ref={wrapRef}>
          <span className="sr-only">{pick(strings, "contact.srLabel")}</span>
          {/* type=text, not email — the field also takes phone numbers, and
              type=email would fight both the value and the mobile keyboard.
              The placeholder stays pure LTR: a mixed fa/en one gets reordered
              by bidi inside a dir=ltr field and reads as gibberish, so the
              hint line below carries "ایمیل یا شماره موبایل". */}
          <input
            ref={inputRef}
            type="text"
            name="contact"
            dir="ltr"
            autoComplete="email"
            spellCheck={false}
            placeholder={pick(strings, "contact.placeholder", "you@company.com")}
            value={value}
            aria-invalid={status === "invalid"}
            aria-describedby="contact-hint"
            onChange={(e) => {
              setValue(e.target.value);
              if (status === "invalid") setStatus("idle");
            }}
          />
          <canvas ref={canvasRef} className="contact-dust" aria-hidden="true" />
        </label>
      )}

      <p className="contact-hint" id="contact-hint" role="status" data-state={status}>
        {status === "invalid"
          ? pick(strings, "contact.invalid", "ایمیل یا شماره‌ی موبایل معتبر نیست")
          : status === "done"
            ? pick(strings, "contact.doneHint", "به‌زودی جواب می‌دهیم.")
            : pick(strings, "contact.hint")}
      </p>
    </form>
  );
}
