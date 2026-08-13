"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!cursor || !ring) return;

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const target = { x: pos.x, y: pos.y };

    const onMove = (e: MouseEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
    };

    const tick = () => {
      pos.x += (target.x - pos.x) * 0.15;
      pos.y += (target.y - pos.y) * 0.15;
      gsap.set(cursor, { x: pos.x, y: pos.y });
      gsap.set(ring, { x: pos.x, y: pos.y });
    };

    gsap.set([cursor, ring], { opacity: 1, scale: 1 });
    gsap.ticker.add(tick);
    window.addEventListener("mousemove", onMove);
    document.documentElement.classList.add("cursor-hidden");

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("mousemove", onMove);
      document.documentElement.classList.remove("cursor-hidden");
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        className="custom-cursor-ring pointer-events-none fixed top-0 left-0 z-[9998] -translate-x-1/2 -translate-y-1/2 opacity-0"
        aria-hidden
      />
      <div
        ref={cursorRef}
        className="custom-cursor pointer-events-none fixed top-0 left-0 z-[9999] -translate-x-1/2 -translate-y-1/2 opacity-0"
        aria-hidden
      >
        <span className="custom-cursor-cross" />
      </div>
    </>
  );
}
