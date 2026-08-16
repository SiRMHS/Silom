"use client";

import { usePageTransition } from "@/components/PageTransition";

type Side = "start" | "end";

export type RailItem = {
  id?: string;
  href: string;
  label: string;
  caption: string;
  index: string;
  side: Side;
  accent: string;
};

/**
 * `start` = physical right edge in RTL, `end` = physical left edge.
 * main.js toggles body.cursor-left / body.cursor-right from pointer position;
 * the CSS in globals.css maps those to the matching rail item.
 *
 * Only used when the RailLink table is empty; the real links are edited in the
 * admin panel and handed down as `items`.
 */
const FALLBACK_ITEMS: RailItem[] = [
  {
    href: "/projects",
    label: "پروژه‌ها",
    caption: "کارهایی که ساخته‌ایم",
    index: "۰۱",
    side: "start",
    accent: "#ef4444",
  },
  {
    href: "/magazine",
    label: "مجله",
    caption: "نوشته‌ها و یادداشت‌ها",
    index: "۰۲",
    side: "end",
    accent: "#1d4ed8",
  },
];

function Chevron() {
  return (
    <svg
      className="rail-arrow"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function SideRail({ items }: { items?: RailItem[] }) {
  const railItems = items?.length ? items : FALLBACK_ITEMS;
  const { go: transitionTo } = usePageTransition();

  const go = (e: React.MouseEvent, item: RailItem) => {
    e.preventDefault();
    transitionTo(item.href, item.label, item.accent);
  };

  return (
    <nav className="rail" aria-label="بخش‌های اصلی">
      {railItems.map((item) => (
        <a
          key={item.id ?? item.href}
          href={item.href}
          onClick={(e) => go(e, item)}
          className={`rail-link rail-link--${item.side}`}
          style={{ ["--accent" as string]: item.accent }}
          aria-label={`${item.label} — ${item.caption}`}
        >
          <span className="rail-index" aria-hidden="true">
            {item.index}
          </span>
          <span className="rail-stem" aria-hidden="true" />
          <span className="rail-label">{item.label}</span>
          <span className="rail-caption" aria-hidden="true">
            {item.caption}
          </span>
          <Chevron />
        </a>
      ))}
    </nav>
  );
}
