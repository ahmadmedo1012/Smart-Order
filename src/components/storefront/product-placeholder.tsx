import { Package } from "lucide-react";

/**
 * ProductPlaceholder — the no-photo tile (r148 SO-D3).
 *
 * The demo store (and any store before its owner uploads media — photos
 * live in the PRODUCTION DB via dashboard media upload, never in repo
 * seed data) ships 6/6 Package-only tiles that read as unfinished
 * exactly where prospects judge the platform. This is the designed
 * replacement: a refined copper-wash gradient ground (.product-placeholder
 * in globals.css) + the product's initial as a quiet monogram + a subtle
 * package glyph — so a store without photography looks INTENTIONAL, not
 * broken. Aspect-stable (fills the parent image well), centered, and
 * rides the --c-copper-* family so it flips with the theme (night/cream)
 * with zero physical-property positioning (RTL-safe by composition).
 */
export function ProductPlaceholder({
  name,
  size = "card",
}: {
  name: string;
  /** card = the grid tile well (h-28/h-32) · dialog = the header well (h-40/h-44) */
  size?: "card" | "dialog";
}) {
  const initial = [...(name.trim() || "·")][0] ?? "·";
  const dialog = size === "dialog";
  return (
    <span
      aria-hidden="true"
      className="product-placeholder size-full flex flex-col items-center justify-center gap-1.5 select-none"
    >
      <span
        className={`font-heading font-bold leading-none text-accent-foreground/50 ${
          dialog ? "text-5xl" : "text-3xl"
        }`}
      >
        {initial}
      </span>
      <Package
        className={`text-accent-foreground/35 ${dialog ? "size-5" : "size-4"}`}
        strokeWidth={2}
      />
    </span>
  );
}
