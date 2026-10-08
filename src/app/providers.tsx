"use client";

import dynamic from "next/dynamic";
import { MotionConfig } from "motion/react";

import { ThemeProvider } from "@/components/shared/theme-provider";
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider";
import { ThemeColorSync } from "@/components/theme-color-sync";

/*
 * r131 (F1) — the single client boundary above the whole tree.
 *
 *   · MotionConfig reducedMotion="user" promoted from the dashboard
 *     shell to the ROOT (A7 P2-5): framer-motion consumers outside the
 *     dashboard — the payment dialog, the landing/header/footer
 *     AnimatePresence, the register step indicator — now respect
 *     prefers-reduced-motion. (The dashboard shell's own MotionConfig
 *     is harmless; same value, nested.)
 *   · ThemeColorSync (smart-link r14-M7 port): meta theme-color follows
 *     the manual toggle (night #070B16 / cream #FBFAF9) instead of the
 *     OS preference (A10 F2).
 *   · Toaster lazy-mounted (A8 perf: the Toaster rode the root layout,
 *     shipping the sonner chunk on every route's critical path). It
 *     loads right after hydration; toasts are interaction-driven, so
 *     the deferral window is invisible. Kept at the ROOT (not removed)
 *     because toasts are needed fleet-wide.
 */
const Toaster = dynamic(
  () => import("@/components/ui/sonner").then((m) => m.Toaster),
  { ssr: false },
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <LazyMotionProvider>{children}</LazyMotionProvider>
        <ThemeColorSync />
        <Toaster />
      </MotionConfig>
    </ThemeProvider>
  );
}
