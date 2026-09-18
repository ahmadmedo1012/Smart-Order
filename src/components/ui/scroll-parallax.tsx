"use client";

import { useRef, useState, useEffect, type ReactNode, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";

interface ScrollParallaxProps {
  children: ReactNode;
  className?: string;
  /** Movement rate (-2 to 2). Negative = recedes (moves up faster). Positive = lags behind scroll. */
  rate?: number;
  /** Maximum pixel travel to cap extreme values */
  maxTravel?: number;
  style?: CSSProperties;
}

/**
 * ScrollParallax — family device verbatim (Smart Menu scroll-craft twin).
 * Differential movement for depth perception:
 * - Subtle movement (rates 0.3 to 1.5 are most usable)
 * - Past 200px of total travel it reads as a bug, not depth
 * - Capped at maxTravel (default 80px)
 * - Disabled under prefers-reduced-motion and on touch/coarse devices
 */
export function ScrollParallax({ children, className, rate = 0.5, maxTravel = 80, style }: ScrollParallaxProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const checkMobile = () => {
      const coarse = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
      const small = window.matchMedia("(max-width: 860px)").matches;
      setIsMobile(coarse || small);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || isMobile) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const element = ref.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const viewportH = window.innerHeight;
        // Element center offset from viewport center, normalized -1..1
        const centerDelta = rect.top + rect.height / 2 - viewportH / 2;
        const normalized = centerDelta / viewportH;
        // Clamp travel to ±maxTravel
        const travel = Math.max(-maxTravel, Math.min(maxTravel, normalized * rate * viewportH * 0.2));
        setTransform(travel);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rate, maxTravel, prefersReducedMotion, isMobile]);

  const disabled = prefersReducedMotion || isMobile;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        transform: disabled ? undefined : `translateY(${transform}px)`,
        willChange: disabled ? undefined : "transform",
      }}
    >
      {children}
    </div>
  );
}
