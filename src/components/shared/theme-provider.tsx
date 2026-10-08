"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      /* r131 (F9b fleet hardening): enableSystem={false} EXPLICIT —
       * next-themes v0.4.6 defaults enableSystem to true, so omitting
       * the prop (r130's "removal") was a runtime no-op. r130 (W2-1,
       * fix 9 — W1-F P2-12): enableSystem REMOVED. The
       * pre-paint boot script in layout.tsx implements the family
       * standard (DARK default; light ONLY when explicitly stored) and
       * ignores the OS preference — with enableSystem, next-themes
       * resolved system-light post-hydration and flipped the class the
       * boot script had already painted → theme flash. One resolution
       * path now: boot script == provider, both dark-default. */
      storageKey="smart-order-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
