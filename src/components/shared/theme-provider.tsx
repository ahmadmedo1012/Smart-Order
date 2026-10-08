"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      /* r130 (W2-1, fix 9 — W1-F P2-12): enableSystem REMOVED. The
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
