"use client";
import { useEffect } from "react";
import { useTheme } from "next-themes";

/* r131 (F1 — A10 F2): the browser/status bar followed the OS theme, not
 * the user's manual toggle — the <meta name="theme-color"> pair in
 * layout.tsx is media=prefers-color-scheme bound, while this app is
 * dark-default with a binary in-app switch (no system option since the
 * r130 enableSystem removal). A first-visit user on an OS-light device
 * got a night page under a white browser bar (and the installed WebAPK
 * status bar drifted the same way).
 *
 * Ported verbatim from smart-link (src/components/theme-color-sync.tsx,
 * r14-M7) — the fleet-blessed fix: renders null (zero server markup, no
 * LCP/CLS impact), mounts inside <ThemeProvider> because it needs the
 * next-themes context, edits only `content` and leaves `media` as-is.
 * resolvedTheme is undefined before hydration — silent ignore (no
 * flash); the media-bound metas keep serving the right OS-side value
 * until then. */
const BAR = { dark: "#070B16", light: "#FBFAF9" } as const;

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme !== "dark" && resolvedTheme !== "light") return;
    const color = BAR[resolvedTheme];
    for (const meta of document.querySelectorAll<HTMLMetaElement>(
      'meta[name="theme-color"]',
    )) {
      if (meta.content !== color) meta.content = color;
    }
  }, [resolvedTheme]);
  return null;
}
