"use client";

import { useEffect, useState } from "react";

/**
 * Hairline at the top of the article showing how much is left.
 *
 * On a long read the scrollbar is the only signal of length, and the site
 * hides its own chrome while scrolling — this gives the reader back a sense of
 * where they are without adding another fixed element to look at.
 *
 * Scroll is sampled on an animation frame rather than per event, so a flick
 * scroll costs one state update per frame instead of dozens.
 */
export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;

    const measure = () => {
      raf = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / scrollable)));
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    // first measurement is scheduled rather than run inline, so the effect
    // never sets state synchronously during commit
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div className="read-progress" aria-hidden="true">
      <span className="read-progress-bar" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
