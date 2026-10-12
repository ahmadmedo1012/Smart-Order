import { cn } from "@/lib/utils";

/**
 * SkipLink — Madarek canonical a11y pattern (rubric §B "Focus"):
 * visually hidden until it receives focus, then paints as a real chip
 * at the very top of the viewport. Sits on --z-toast so it is visible
 * above every overlay, and its text rides the accent-fg pairing.
 * Must be the FIRST focusable element of the page; href points at the
 * page's <main> landmark (id="main").
 */
export function SkipLink({
  href = "#main",
  label = "تخطَّ إلى المحتوى الرئيسي",
  className,
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-(--z-toast)",
        /* r149 (SO1/C3): the focused chip takes the fleet 44px floor —
           text-sm's 20px line + py-3 lands exactly 44 (was py-2.5 → 40),
           and the ring rides the fleet geometry 2px @ offset 3 (the SB
           layout.tsx recipe). */
        "focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3",
        "focus:text-sm focus:font-bold focus:text-primary-foreground focus:shadow-lg",
        "focus:outline-offset-3",
        className
      )}
    >
      {label}
    </a>
  );
}
