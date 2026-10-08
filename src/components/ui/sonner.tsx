"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps, toast } from "sonner"

/*
 * ════════════════════════════════════════════════════════════════
 * r131 (F1) — canonical QUIET toaster (A5 P1-5 · A6 P2-3 · A11 SO-3)
 * ════════════════════════════════════════════════════════════════
 *   · bottom-END stack, direction-aware: sonner's positions are
 *     physical, so inline-end resolves to screen-left under the app's
 *     root dir="rtl" (and re-resolves if the document direction ever
 *     changes) — was top-center.
 *   · unstyled mode: sonner's default card skin AND the loud
 *     rich-colors mode are off; the quiet family card — surface ground, 1px rule, r-lg 12,
 *     elev-3, a 1px STATUS hairline on the inline-start edge and a
 *     28px pastel icon well — is hand-written in globals.css next to
 *     the --z-toast pin (all selectors outrank sonner's runtime-injected
 *     defaults via the [data-sonner-toaster] prefix).
 *   · durations (states doctrine): error toasts NEVER auto-dismiss
 *     (manual dismiss only — a lost failure reason is a lie), every
 *     other kind rides 6s.
 *   · stack geometry from madarek .toast-stack (notifications.css:347):
 *     20px viewport offset, 8px gap, and on ≤600px full-width toasts
 *     lifted above the mobile bottom dock + home-indicator safe area.
 */

/* Manual-dismiss for errors: sonner v2 resolves
 * `toast.duration || toaster.duration || 4000` with no per-type hook at
 * the Toaster level, so `toast.error`'s default is widened in place —
 * one patch, every call site across the app (they all import this same
 * sonner singleton). Explicit per-call durations still win (spread
 * last). Module scope = rides this lazy chunk; idempotent under HMR. */
type SonnerError = typeof toast.error
if (
  !(toast.error as SonnerError & { __soManualDismiss?: boolean })
    .__soManualDismiss
) {
  const original: SonnerError = toast.error
  const widened: SonnerError & { __soManualDismiss?: boolean } = (
    message,
    data
  ) => original(message, { duration: Infinity, ...data })
  widened.__soManualDismiss = true
  toast.error = widened
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  /* Direction-aware bottom-END. Client-only by construction: this
   * component is mounted via next/dynamic { ssr: false } from
   * app/providers, so document is ready and there is no hydration
   * window to mismatch. */
  const isLtr =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("dir") === "ltr"

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      dir={isLtr ? "ltr" : "rtl"}
      position={isLtr ? "bottom-right" : "bottom-left"}
      containerAriaLabel="التنبيهات"
      /* quiet cards — the loud rich-colors mode REMOVED (its solid
       * fills bypassed the token layer); the card skin lives in
       * globals.css under [data-styled="false"]. NOTE: in sonner v2
       * `unstyled` is a TOAST option, not a Toaster prop — it rides
       * toastOptions and the Toaster fans it out to every toast. */
      toastOptions={{ unstyled: true, closeButtonAriaLabel: "إغلاق التنبيه" }}
      closeButton
      /* success/info/default 6s; errors = manual dismiss (patch above) */
      duration={6000}
      offset={20}
      gap={8}
      mobileOffset={{
        bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
      }}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--normal-radius": "var(--radius-lg)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
