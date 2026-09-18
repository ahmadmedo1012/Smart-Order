"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Stable pre-mount label avoids SSR/CSR hydration mismatch (first client
  // render must match server HTML; the specific label swaps in after mount).
  const label = !mounted
    ? "تبديل مظهر الواجهة"
    : resolvedTheme === "dark"
      ? "التبديل إلى الوضع النهاري"
      : "التبديل إلى الوضع الليلي";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={label}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </Button>
  );
}
