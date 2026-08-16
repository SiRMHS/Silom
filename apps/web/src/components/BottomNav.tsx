"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useChromeVisibility } from "@/hooks/useChromeVisibility";
import { usePageTransition } from "@/components/PageTransition";

export type DockItem = {
  id?: string;
  label: string;
  href: string;
  /** Empty means "navigate without playing the full-screen transition". */
  txLabel?: string | null;
  txColor?: string | null;
};

/**
 * Only used if the DockLink table is empty — a fresh database still gets a
 * usable site rather than a bare pill. Every real link comes from `items`,
 * which the pages read from the panel-editable table.
 */
const FALLBACK_ITEMS: DockItem[] = [
  { label: "خانه", href: "/", txLabel: "خانه", txColor: "#1c1c22" },
  { label: "خدمات", href: "/services", txLabel: "خدمات", txColor: "#0f766e" },
  { label: "پروژه‌ها", href: "/projects", txLabel: "پروژه‌ها", txColor: "#ef4444" },
  { label: "مجله", href: "/magazine", txLabel: "مجله", txColor: "#1c1c22" },
  { label: "تیم", href: "/team", txLabel: "تیم", txColor: "#c2410c" },
];


/** Blurred white puck that trails the pointer inside the pill. */
function useCursorGlow(
  pillRef: React.RefObject<HTMLElement | null>,
  glowRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const pill = pillRef.current;
    const glow = glowRef.current;
    if (!pill || !glow) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    // quickTo gives the puck its trailing lag without a manual rAF loop
    const toX = gsap.quickTo(glow, "x", { duration: 0.5, ease: "power3" });
    const toY = gsap.quickTo(glow, "y", { duration: 0.5, ease: "power3" });
    let seeded = false;

    const onMove = (e: PointerEvent) => {
      const r = pill.getBoundingClientRect();
      const x = e.clientX - r.left - 16;
      const y = e.clientY - r.top - 16;
      if (!seeded) {
        gsap.set(glow, { x, y });
        seeded = true;
      }
      toX(x);
      toY(y);
      gsap.to(glow, { scale: 1, duration: 0.45, ease: "power2.out", overwrite: "auto" });
    };

    const onLeave = () => {
      gsap.to(glow, { scale: 0, duration: 0.45, ease: "power2.out", overwrite: "auto" });
    };

    pill.addEventListener("pointermove", onMove);
    pill.addEventListener("pointerleave", onLeave);

    return () => {
      pill.removeEventListener("pointermove", onMove);
      pill.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(glow);
    };
  }, [pillRef, glowRef]);
}

export default function BottomNav({ items }: { items?: DockItem[] }) {
  const navItems = items?.length ? items : FALLBACK_ITEMS;
  const visible = useChromeVisibility();
  const { go } = usePageTransition();
  const router = useRouter();
  const [activePath, setActivePath] = useState("/");
  const [dotX, setDotX] = useState<number | null>(null);

  const pillRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLSpanElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  useEffect(() => {
    setActivePath(window.location.pathname || "/");
  }, []);

  useCursorGlow(pillRef, glowRef);

  // Park the indicator dot under the active item
  const placeDot = useCallback(() => {
    const list = listRef.current;
    const link = linkRefs.current[activePath];
    if (!list || !link) {
      setDotX(null);
      return;
    }
    const lr = link.getBoundingClientRect();
    const nr = list.getBoundingClientRect();
    setDotX(lr.left - nr.left + lr.width / 2 - 2);
  }, [activePath]);

  useLayoutEffect(() => {
    placeDot();
    // Persian glyph metrics shift once Peyda lands, so re-measure after
    document.fonts?.ready.then(placeDot).catch(() => {});
    window.addEventListener("resize", placeDot);
    return () => window.removeEventListener("resize", placeDot);
  }, [placeDot]);

  const navigate = (item: DockItem) => {
    if (item.href.startsWith("#")) {
      document.querySelector(item.href)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (item.href === window.location.pathname) return;

    // A link with no transition text goes straight through, which is how the
    // panel switches the curtain off for a single link.
    if (!item.txLabel) {
      router.push(item.href);
      return;
    }
    go(item.href, item.txLabel, item.txColor);
  };

  return (
    <nav
      role="navigation"
      aria-label="ناوبری اصلی"
      data-visible={visible ? "" : undefined}
      className="site-chrome dock chrome-fade pointer-events-auto"
    >
          <div ref={pillRef} className="dock-pill">
        {/* glass */}
        <span className="dock-glass" aria-hidden="true" />

        {/* pointer-trailing glow */}
        <span ref={glowRef} className="dock-glow" aria-hidden="true">
          <span className="dock-glow-puck" />
        </span>

        <div ref={listRef} className="dock-list">
          {navItems.map((item) => (
            <a
              key={item.id ?? item.href}
              ref={(el) => {
                linkRefs.current[item.href] = el;
              }}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                navigate(item);
              }}
              className="dock-link"
              aria-current={activePath === item.href ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}

          {/* active indicator */}
          <span
            className="dock-dot"
            style={{
              transform: `translateX(${dotX ?? 0}px)`,
              opacity: dotX === null ? 0 : 1,
            }}
            aria-hidden="true"
          />
        </div>
      </div>
    </nav>
  );
}

