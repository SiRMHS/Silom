"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useChromeVisibility } from "@/hooks/useChromeVisibility";

export default function BrandHeader() {
  const visible = useChromeVisibility();

  // difference blend must live on the stacking-context root itself, otherwise
  // the wordmark blends against an empty backdrop
  return (
    <header
      role="banner"
      data-visible={visible ? "" : undefined}
      className="site-chrome chrome-fade chrome-fade--top pointer-events-auto fixed top-10 inset-x-0 z-10002 flex justify-center pt-6 mix-blend-difference sm:pt-8 md:pt-10"
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
  );
}
