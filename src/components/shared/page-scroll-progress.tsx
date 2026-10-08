"use client";

import { useEffect, useRef } from "react";

/**
 * PageScrollProgress — r128-F8 (B18): page-level scroll-progress ribbon.
 *
 * Madarek .landing-progress pattern on product tokens (§d pricing row):
 * a quiet fixed 2px flat ribbon whose fill width is `calc(var(--p,0) * 100%)`.
 * The --p custom property is written imperatively — scroll → one rAF →
 * style.setProperty, ZERO React state (the B2/B14 doctrine: never a render
 * per scroll frame). Reduced-motion safe by construction: the ribbon maps
 * scroll position 1:1 and animates nothing on its own; the global RM belt
 * is not involved (no transitions/animations on this element).
 *
 * Usage: mount once near the page root (before the sticky Header).
 */
export function PageScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let raf = 0;
    const write = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(write);
    };

    write();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="page-progress" aria-hidden="true">
      <div ref={barRef} className="page-progress-bar" />
    </div>
  );
}
