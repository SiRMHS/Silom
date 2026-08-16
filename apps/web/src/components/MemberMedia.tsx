"use client";

import { useEffect, useRef } from "react";

/**
 * The visual half of a team card: a still, a GIF, or a silent looping clip.
 *
 * Video only runs while the card is on screen — a team section is four-plus
 * cards, and four decoders spinning above the fold costs more than the effect
 * is worth. Reduced-motion holds it on the first frame instead.
 *
 * Shared by the home page's team strip and the contact page's roster, so a
 * portrait behaves the same wherever a member is shown.
 */
export default function MemberMedia({
  src,
  alt,
  isVideo,
  monogram,
}: {
  src: string | null;
  alt: string;
  isVideo: boolean;
  monogram: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.pause();
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  if (!src) {
    return (
      <span className="member-frame">
        <span className="member-monogram" aria-hidden="true">
          {monogram}
        </span>
      </span>
    );
  }

  return (
    <span className="member-frame" data-has-media="">
      {isVideo ? (
        <video
          ref={ref}
          className="member-media"
          src={src}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={alt || undefined}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="member-media" src={src} alt={alt} loading="lazy" decoding="async" />
      )}
    </span>
  );
}
