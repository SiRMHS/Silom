"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The sticky section index on a service landing page. A sentinel just above the
 * bar tells us when it has pinned to the viewport top; on desktop that flips
 * the nav links — including the way back to /services — to a true centre
 * alignment while the order action stays on the far margin.
 */
export default function ServiceJumpNav({
  children,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  "aria-label": string;
}) {
  const navRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const io = new IntersectionObserver(
      ([e]) => setStuck(e.boundingClientRect.top < 0),
      { threshold: [0, 1] },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  return (
    <div className="sv-jump-wrap">
      <div ref={sentinelRef} className="sv-jump-sentinel" aria-hidden="true" />
      <nav
        ref={navRef}
        className={cn("sv-jump", stuck && "is-stuck")}
        aria-label={ariaLabel}
      >
        {children}
      </nav>
    </div>
  );
}
