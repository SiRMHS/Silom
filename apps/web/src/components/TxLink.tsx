"use client";

import Link from "next/link";
import { usePageTransition } from "@/components/PageTransition";

/**
 * A Link that plays the site transition instead of swapping instantly.
 * Keeps next/link so prefetching and middle-click / modifier-click still behave
 * like a real link.
 */
export default function TxLink({
  href,
  label,
  accent,
  className,
  style,
  tabIndex,
  children,
}: {
  href: string;
  label?: string;
  /** Colour the destination's name is highlighted in during the transition. */
  accent?: string | null;
  className?: string;
  style?: React.CSSProperties;
  /** -1 for a link that is a duplicate of one already in the tab order. */
  tabIndex?: number;
  children: React.ReactNode;
}) {
  const { go } = usePageTransition();

  return (
    <Link
      href={href}
      className={className}
      style={style}
      tabIndex={tabIndex}
      onClick={(e) => {
        // let the browser handle new-tab / download intents
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        go(href, label, accent);
      }}
    >
      {children}
    </Link>
  );
}
