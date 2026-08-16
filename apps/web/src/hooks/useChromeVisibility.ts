"use client";

import { useEffect, useState } from "react";
import { usePageTransition } from "@/components/PageTransition";

/**
 * UI chrome (brand mark, bottom dock) — hidden while the boot sequence plays
 * and while a page transition is covering the screen.
 *
 * This used to infer both from classes on <body> left over by the old
 * transition script. That was unreliable in two ways: GalektoHome overwrites
 * body.className wholesale during init, so the flags could vanish or linger;
 * and the value was only recomputed when a mutation happened to fire, so chrome
 * that initialised hidden could stay hidden indefinitely — which is how the
 * header and dock went missing after coming back from a project.
 *
 * Now the transition state comes from the provider that actually owns it, and
 * the boot flag is read from <html>, which BootScreen owns exclusively and
 * nothing else rewrites.
 */
export function useChromeVisibility() {
  const { busy } = usePageTransition();
  const [booting, setBooting] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setBooting(root.classList.contains("boot-lock"));

    read();

    // one attribute on one element, rather than every class change on the page
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    window.addEventListener("pageshow", read);
    return () => {
      observer.disconnect();
      window.removeEventListener("pageshow", read);
    };
  }, []);

  return !busy && !booting;
}
