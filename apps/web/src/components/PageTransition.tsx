"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Site-wide page transition — paper panels sweep up over the page, the
 * destination's name rises out of a mask, then the panels carry on upward to
 * reveal the new route.
 *
 * Built from the language the rest of the site already uses: the paper tone,
 * the word-mask reveal, and the brand highlight.
 *
 * Every phase is driven by a timer with a hard ceiling, and the reveal runs
 * even if the route never reports arriving — a transition that can strand the
 * viewer behind an opaque overlay is worse than no transition at all.
 */

const COVER_MS = 700;
const REVEAL_MS = 780;
const ARRIVAL_CEILING_MS = 2200;
const PANELS = 5;

type Phase = "idle" | "cover" | "hold" | "reveal";

type Ctx = { go: (href: string, label?: string, accent?: string | null) => void; busy: boolean };

const TransitionCtx = createContext<Ctx>({ go: () => {}, busy: false });

export const usePageTransition = () => useContext(TransitionCtx);

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [label, setLabel] = useState("");
  // The colour the destination's name is highlighted in — editable per link in
  // the admin panel, so it falls back to the brand tone when unset.
  const [accent, setAccent] = useState<string | null>(null);
  const pending = useRef<string | null>(null);

  const go = useCallback((href: string, lbl = "", color: string | null = null) => {
    if (typeof window !== "undefined" && href === window.location.pathname) return;
    pending.current = href;
    setLabel(lbl);
    setAccent(color);
    setPhase("cover");
  }, []);

  // Cover finished → navigate
  useEffect(() => {
    if (phase !== "cover") return;
    const t = setTimeout(() => {
      if (pending.current) router.push(pending.current);
      setPhase("hold");
    }, COVER_MS);
    return () => clearTimeout(t);
  }, [phase, router]);

  // Arrived (or waited long enough) → reveal
  useEffect(() => {
    if (phase !== "hold") return;

    if (pending.current && pathname === pending.current) {
      pending.current = null;
      const t = setTimeout(() => setPhase("reveal"), 90);
      return () => clearTimeout(t);
    }

    // never leave the viewer stranded behind the panels
    const bail = setTimeout(() => {
      pending.current = null;
      setPhase("reveal");
    }, ARRIVAL_CEILING_MS);
    return () => clearTimeout(bail);
  }, [phase, pathname]);

  // Reveal finished → back to idle
  useEffect(() => {
    if (phase !== "reveal") return;
    const t = setTimeout(() => setPhase("idle"), REVEAL_MS);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <TransitionCtx.Provider value={{ go, busy: phase !== "idle" }}>
      {children}

      <div
        className="tx"
        data-phase={phase}
        aria-hidden="true"
        style={accent ? ({ ["--tx-accent"]: accent } as React.CSSProperties) : undefined}
      >
        <div className="tx-panels">
          {Array.from({ length: PANELS }, (_, i) => (
            <span className="tx-panel" key={i} style={{ ["--i" as string]: i }} />
          ))}
        </div>

        {label && (
          <div className="tx-label">
            <span className="tx-label-mask">
              <span className="tx-label-text">{label}</span>
            </span>
          </div>
        )}
      </div>
    </TransitionCtx.Provider>
  );
}
