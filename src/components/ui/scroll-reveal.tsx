"use client";

import { useRef, useEffect, type ReactNode, type CSSProperties } from "react";

/**
 * Family reveal primitives — SSR-visible by construction.
 *
 * Strategy (impeccable "visible at rest" doctrine + family motion language):
 * - Server render + first paint: NO hidden styles. Content is visible even
 *   if JS never runs.
 * - After mount: in-viewport elements get the family CSS entrance
 *   (`.animate-fade-in`, ease-out-quart 0.5s) played as a load intro.
 *   Below-the-fold elements get `.reveal-armed` (hidden) and reveal via
 *   IntersectionObserver with the same family animation + optional delay.
 * - prefers-reduced-motion: nothing is hidden, no animation is added.
 */

function useRevealClasses(
  ref: React.RefObject<HTMLElement | null>,
  delay: number,
  duration: number,
  y: number,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let io: IntersectionObserver | undefined;
    const raf = requestAnimationFrame(() => {
      const belowFold = el.getBoundingClientRect().top > window.innerHeight * 0.92;
      if (delay) el.style.animationDelay = `${delay}ms`;
      if (duration !== 0.5) el.style.animationDuration = `${duration}s`;
      if (!belowFold) {
        el.classList.add("animate-fade-in");
        return;
      }
      el.classList.add("reveal-armed");
      el.style.setProperty("--reveal-y", `${y}px`);
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.classList.remove("reveal-armed");
            el.classList.add("animate-fade-in");
            io?.disconnect();
          }
        },
        { threshold: 0.15, rootMargin: "-10% 0px -10% 0px" },
      );
      io.observe(el);
    });
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [ref, delay, duration, y]);
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Entrance distance (px) — family default 20 */
  y?: number;
  /** Entrance delay (ms) */
  delay?: number;
  /** Animation duration (s) — family default 0.5 */
  duration?: number;
  as?: "div" | "section" | "article" | "span" | "ul" | "li" | "h2" | "p";
}

export function Reveal({
  children,
  className,
  style,
  y = 20,
  delay = 0,
  duration = 0.5,
  as = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  useRevealClasses(ref, delay, duration, y);
  const Tag = as;
  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        ref.current = node;
      }}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}

interface ScrollRevealProps extends RevealProps {}

/** ScrollReveal — single-block family reveal (SSR-visible, fire-once). */
export function ScrollReveal(props: ScrollRevealProps) {
  return <Reveal {...props} />;
}

interface StaggeredRevealProps {
  children: ReactNode[];
  className?: string;
  /** Time between each child reveal (ms) — family default 60 */
  stagger?: number;
  /** Initial Y offset */
  y?: number;
  /** Per-child duration (s) */
  duration?: number;
  style?: CSSProperties;
}

/** StaggeredReveal — children reveal one after another (family stagger). */
export function StaggeredReveal({
  children,
  className,
  stagger = 60,
  y = 20,
  duration = 0.5,
  style,
}: StaggeredRevealProps) {
  return (
    <div className={className} style={style}>
      {children.map((child, i) => (
        <Reveal key={i} y={y} delay={i * stagger} duration={duration} className="min-w-0">
          {child}
        </Reveal>
      ))}
    </div>
  );
}
