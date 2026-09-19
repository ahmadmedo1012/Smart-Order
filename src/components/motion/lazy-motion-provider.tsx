"use client";

/**
 * LazyMotion providers — family twin (Smart Menu motion/LazyMotionProvider).
 *
 * 1. `LazyMotionProvider` (root, synchronous `domAnimation`):
 *    Mounted once above the root tree. Every `m.*` component gets the
 *    animation + gesture feature bundle synchronously, so enter/exit
 *    variants, `whileHover`/`whileTap`, `whileInView`, `AnimatePresence`
 *    exits and all other animation behavior works from the first paint.
 *
 *    `strict` makes any future `motion.*` usage (the full-feature proxy that
 *    defeats tree-shaking) throw loudly in development.
 *
 * 2. `LayoutMotion` (local, synchronous `domMax`):
 *    Only call sites using `layoutId` shared-element glides (the Header
 *    "tubelight" active pill) need the layout feature: without it `layoutId`
 *    props are silently ignored and the glides die. Each such spot wraps its
 *    `layoutId` element in `LayoutMotion` (sync domMax, identical behavior
 *    from the first interaction).
 */
import { LazyMotion, domAnimation, domMax } from "motion/react";
import type { ReactNode } from "react";

export function LazyMotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

export function LayoutMotion({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      {children}
    </LazyMotion>
  );
}
