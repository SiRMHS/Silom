"use client";

import Link from "next/link";
import TxLink from "@/components/TxLink";
import { cn } from "@/lib/utils";
import { useChromeVisibility } from "@/hooks/useChromeVisibility";

/**
 * The fixed top chrome: the wordmark on the start edge and one call to action
 * on the other.
 *
 * `center` is the home screen, where the wordmark is the page's title and owns
 * the middle of the frame. `corner` is every other page: those open on their
 * own heading, so the mark steps aside to the top of the start edge — the
 * right, since the site is RTL — and reads as a way back rather than a title.
 *
 * Both sit on the same margin as the page's content rather than on the very
 * edge of the window, so the chrome lines up with the column beneath it
 * instead of floating free of the layout.
 *
 * The two are separate fixed elements on purpose. The wordmark is painted with
 * `mix-blend-difference` so it stays legible over a hero, a dark footer or a
 * white sheet without anyone choosing a colour for it — and that blend has to
 * live on the stacking-context root, or it blends against an empty backdrop.
 * A solid button inside that same root would invert with it, so the action
 * gets a root of its own.
 */
export default function BrandHeader({
  align = "center",
  ctaLabel = "در تماس باشیم",
  ctaHref = "/contact",
}: {
  align?: "center" | "corner";
  /** Empty hides the action — a page that is itself the destination. */
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const visible = useChromeVisibility();
  const corner = align === "corner";

  return (
    <>
      <header
        role="banner"
        data-visible={visible ? "" : undefined}
        className={cn(
          "site-chrome chrome-fade chrome-fade--top pointer-events-auto fixed inset-x-0 z-10002 flex mix-blend-difference",
          corner ? "chrome-row top-0" : "top-10 justify-center pt-6 sm:pt-8 md:pt-10",
        )}
      >
        <Link
          href="/"
          className="group relative inline-flex items-center px-2 py-1"
          aria-label="رهیــــاد — صفحه اصلی"
        >
          {/* white + difference = dark on the light hero, light on the dark footer */}
          <span
            className={cn(
              "text-xl sm:text-2xl md:text-[1.75rem] font-black tracking-tight",
              "text-white",
              "transition-opacity duration-300 group-hover:opacity-80",
            )}
          >
            رهیــــاد
          </span>
          <span
            className={cn(
              "absolute -bottom-1 left-1/2 h-px -translate-x-1/2 bg-white",
              "w-0 opacity-0 transition-all duration-300 ease-out",
              "group-hover:w-full group-hover:opacity-100",
            )}
            aria-hidden="true"
          />
        </Link>
      </header>

      {ctaLabel && (
        <div
          data-visible={visible ? "" : undefined}
          className="site-chrome chrome-fade chrome-fade--top chrome-row chrome-row--end pointer-events-auto fixed inset-x-0 top-0 z-10002 flex"
        >
          <TxLink href={ctaHref} label={ctaLabel} className="chrome-cta">
            {ctaLabel}
            <span aria-hidden="true">←</span>
          </TxLink>
        </div>
      )}
    </>
  );
}
