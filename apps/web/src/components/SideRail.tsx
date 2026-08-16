"use client";

type Side = "start" | "end";

type RailItem = {
  href: string;
  label: string;
  caption: string;
  index: string;
  side: Side;
  accent: string;
  tx: { label: string; color: string };
};

/**
 * `start` = physical right edge in RTL, `end` = physical left edge.
 * main.js toggles body.cursor-left / body.cursor-right from pointer position;
 * the CSS in globals.css maps those to the matching rail item.
 */
const ITEMS: RailItem[] = [
  {
    href: "/projects",
    label: "پروژه‌ها",
    caption: "کارهایی که ساخته‌ایم",
    index: "۰۱",
    side: "start",
    accent: "#ef4444",
    tx: { label: "پروژه‌ها", color: "#ef4444" },
  },
  {
    href: "/artworks",
    label: "آثار",
    caption: "گالری تصویرسازی",
    index: "۰۲",
    side: "end",
    accent: "#1d4ed8",
    tx: { label: "آثار", color: "#1d4ed8" },
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

export default function SideRail() {
  const go = (e: React.MouseEvent, item: RailItem) => {
    e.preventDefault();
    if (typeof window.TxOut === "function") {
      window.TxOut(item.href, item.tx.label, item.tx.color);
      return;
    }
    window.location.assign(item.href);
  };

  return (
    <nav className="rail" aria-label="بخش‌های اصلی">
      {ITEMS.map((item) => (
        <a
          key={item.href}
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
