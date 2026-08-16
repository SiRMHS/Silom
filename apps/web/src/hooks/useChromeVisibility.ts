"use client";

import { useEffect, useState } from "react";

function isTransitionActive(): boolean {
  if (typeof document === "undefined") return false;
  if (document.body.classList.contains("tx-active")) return true;
  if (document.body.classList.contains("boot-active")) return true;

  const tx = document.getElementById("txOverlay");
  if (!tx) return false;

  const style = window.getComputedStyle(tx);
  return style.visibility !== "hidden" && style.display !== "none";
}

/** UI chrome (brand, bottom nav) — hidden during page transitions */
export function useChromeVisibility() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const update = () => setVisible(!isTransitionActive());

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
      childList: true,
    });

    const tx = document.getElementById("txOverlay");
    if (tx) {
      observer.observe(tx, { attributes: true, attributeFilter: ["style", "class"] });
    }

    window.addEventListener("pageshow", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("pageshow", update);
    };
  }, []);

  return visible;
}
