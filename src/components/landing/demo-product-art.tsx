import type { ReactNode } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   W21 Wave 6 (store mockup rebuild) — DemoProductArt.
   ─────────────────────────────────────────────────────────────────────
   Deterministic food/drink illustrations for the #store phone mockup.

   Why SVG (and not photos): the repo ships ZERO product photography by
   design — product photos live in the production DB via the dashboard
   media upload (`/api/media`, auth-gated POST; the seed universe in
   scripts/e2e-seed.mjs / /api/seed carries names + prices only). A gray
   camera placeholder reads as "unfinished" exactly where prospects judge
   the platform, so the landing mockup draws its OWN consistent art
   direction instead: one warm cream ground, one navy ink shadow, one
   stroke weight — the food colors harmonized with the family (tomato
   rides the brand orange family, greens the mint family).

   Fixed content colors, not theme tokens — an illustration is content,
   like a photograph would be, and must read identically on the daylight
   and night-dispatch stages. Nothing here is random: every product kind
   renders the same bytes every time (deterministic demo data).
   ═══════════════════════════════════════════════════════════════════════ */

export type DemoProductArtKind = "pizza" | "burger-beef" | "burger-chicken" | "juice";

/* Shared illustration palette (see the header law above). */
const C = {
  ground: "#F7ECDA", // warm cream ground — every tile
  ink: "#1B2A41", // navy shadow ink
  crust: "#E8AB55",
  crustDeep: "#C9822E",
  sauce: "#E2571F",
  mozza: "#FFF7E8",
  mozzaShade: "#F7E8C8",
  basil: "#1E7A46", // mint-ink green
  bun: "#EFAD5A",
  bunDeep: "#D18F35",
  sesame: "#FFF5E1",
  lettuce: "#4C9A61",
  cheese: "#FFC85C",
  beef: "#7A4B2A",
  beefDeep: "#5C371E",
  tomato: "#E2571F",
  fillet: "#EBB04F",
  juice: "#F79E2E",
  juiceLight: "#FCB75D",
  orange: "#F07E1F",
  pulp: "#FFF3DF",
  straw: "#D14900", // brand delivery orange
} as const;

/* ── بيتزا مارغريتا — the top-down pie: crust ring, tomato field,
   mozzarella blobs, three basil leaves. ── */
const pizza: ReactNode = (
  <>
    <rect width="96" height="96" rx="16" fill={C.ground} />
    <ellipse cx="48" cy="84" rx="24" ry="4" fill={C.ink} opacity="0.08" />
    <circle cx="48" cy="46" r="32" fill={C.crust} />
    <circle cx="48" cy="46" r="32" fill="none" stroke={C.crustDeep} strokeWidth="2" opacity="0.45" />
    {/* roast spots on the crust ring */}
    <circle cx="48" cy="15.5" r="1.4" fill={C.crustDeep} opacity="0.55" />
    <circle cx="68" cy="22" r="1.2" fill={C.crustDeep} opacity="0.5" />
    <circle cx="79" cy="46" r="1.4" fill={C.crustDeep} opacity="0.55" />
    <circle cx="68" cy="70" r="1.2" fill={C.crustDeep} opacity="0.5" />
    <circle cx="48" cy="76.5" r="1.4" fill={C.crustDeep} opacity="0.55" />
    <circle cx="28" cy="70" r="1.2" fill={C.crustDeep} opacity="0.5" />
    <circle cx="17" cy="46" r="1.4" fill={C.crustDeep} opacity="0.55" />
    <circle cx="28" cy="22" r="1.2" fill={C.crustDeep} opacity="0.5" />
    <circle cx="48" cy="46" r="25.5" fill={C.sauce} />
    {/* mozzarella */}
    <circle cx="40" cy="37" r="6" fill={C.mozza} />
    <circle cx="56" cy="41" r="4.8" fill={C.mozza} />
    <circle cx="46" cy="53" r="5.4" fill={C.mozza} />
    <circle cx="57" cy="55" r="4" fill={C.mozzaShade} />
    <circle cx="35" cy="49" r="3.8" fill={C.mozzaShade} />
    <circle cx="52" cy="33" r="3.6" fill={C.mozzaShade} />
    {/* basil */}
    <ellipse cx="49" cy="29" rx="4.6" ry="2.5" fill={C.basil} transform="rotate(-28 49 29)" />
    <ellipse cx="33" cy="43" rx="4.4" ry="2.4" fill={C.basil} transform="rotate(26 33 43)" />
    <ellipse cx="55" cy="47" rx="4.2" ry="2.3" fill={C.basil} transform="rotate(-8 55 47)" />
  </>
);

/* ── برجر لحم كلاسيك — crown + sesame, cheese drips, charcoal patty. ── */
const burgerBeef: ReactNode = (
  <>
    <rect width="96" height="96" rx="16" fill={C.ground} />
    <ellipse cx="48" cy="83" rx="23" ry="4" fill={C.ink} opacity="0.08" />
    {/* crown bun */}
    <path
      d="M26 46 a22 20.5 0 0 1 44 0 v0.6 a3.4 3.4 0 0 1 -3.4 3.4 H29.4 A3.4 3.4 0 0 1 26 46.6 Z"
      fill={C.bun}
    />
    <ellipse cx="37" cy="34.5" rx="1.5" ry="2.4" fill={C.sesame} transform="rotate(-18 37 34.5)" />
    <ellipse cx="48" cy="31" rx="1.5" ry="2.4" fill={C.sesame} transform="rotate(3 48 31)" />
    <ellipse cx="59" cy="34.5" rx="1.5" ry="2.4" fill={C.sesame} transform="rotate(18 59 34.5)" />
    <ellipse cx="42.5" cy="39.5" rx="1.4" ry="2.2" fill={C.sesame} transform="rotate(-30 42.5 39.5)" />
    <ellipse cx="54" cy="39.5" rx="1.4" ry="2.2" fill={C.sesame} transform="rotate(30 54 39.5)" />
    {/* cheese with two drips */}
    <path
      d="M28 50 H68 V53.5 H61.5 L59 58 L56.5 53.5 H50 L47.5 59 L45 53.5 H38.5 L36 57 L33.5 53.5 H28 Z"
      fill={C.cheese}
    />
    {/* charcoal patty */}
    <rect x="25" y="60" width="46" height="10" rx="5" fill={C.beef} />
    <path
      d="M32 63 h7 M44 64.5 h8 M55 62.5 h6"
      stroke={C.beefDeep}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    {/* base bun */}
    <rect x="26" y="70" width="44" height="10" rx="5" fill={C.bun} />
    <path d="M30 74.5 h36 a4.8 4.8 0 0 1 -4.8 5.5 H34.8 A4.8 4.8 0 0 1 30 74.5 Z" fill={C.bunDeep} opacity="0.4" />
  </>
);

/* ── برجر دجاج كبير — lettuce ruffle, tomato, crispy fillet with crumbs. ── */
const burgerChicken: ReactNode = (
  <>
    <rect width="96" height="96" rx="16" fill={C.ground} />
    <ellipse cx="48" cy="83" rx="23" ry="4" fill={C.ink} opacity="0.08" />
    {/* crown bun */}
    <path
      d="M26 46 a22 20.5 0 0 1 44 0 v0.6 a3.4 3.4 0 0 1 -3.4 3.4 H29.4 A3.4 3.4 0 0 1 26 46.6 Z"
      fill={C.bun}
    />
    <ellipse cx="37" cy="34.5" rx="1.5" ry="2.4" fill={C.sesame} transform="rotate(-18 37 34.5)" />
    <ellipse cx="48" cy="31" rx="1.5" ry="2.4" fill={C.sesame} transform="rotate(3 48 31)" />
    <ellipse cx="59" cy="34.5" rx="1.5" ry="2.4" fill={C.sesame} transform="rotate(18 59 34.5)" />
    <ellipse cx="42.5" cy="39.5" rx="1.4" ry="2.2" fill={C.sesame} transform="rotate(-30 42.5 39.5)" />
    <ellipse cx="54" cy="39.5" rx="1.4" ry="2.2" fill={C.sesame} transform="rotate(30 54 39.5)" />
    {/* lettuce ruffle — six soft humps */}
    <path
      d="M26 48.5 H70 V50 q-3.6 4.8 -7.3 0 q-3.7 4.8 -7.3 0 q-3.7 4.8 -7.3 0 q-3.7 4.8 -7.3 0 q-3.7 4.8 -7.3 0 q-3.6 4.8 -7.5 0 Z"
      fill={C.lettuce}
    />
    {/* tomato slice */}
    <rect x="28" y="54" width="40" height="4.5" rx="2.25" fill={C.tomato} />
    {/* crispy fillet */}
    <rect x="26" y="59" width="44" height="11" rx="5.5" fill={C.fillet} />
    <circle cx="34" cy="62.5" r="1.2" fill={C.crustDeep} />
    <circle cx="43" cy="66.5" r="1.1" fill={C.crustDeep} />
    <circle cx="52" cy="62" r="1.2" fill={C.crustDeep} />
    <circle cx="61" cy="66" r="1.1" fill={C.crustDeep} />
    <circle cx="39" cy="63.5" r="0.9" fill="#F7D894" />
    <circle cx="56" cy="64.5" r="0.9" fill="#F7D894" />
    {/* base bun */}
    <rect x="26" y="70" width="44" height="10" rx="5" fill={C.bun} />
    <path d="M30 74.5 h36 a4.8 4.8 0 0 1 -4.8 5.5 H34.8 A4.8 4.8 0 0 1 30 74.5 Z" fill={C.bunDeep} opacity="0.4" />
  </>
);

/* ── عصير برتقال طازج — the tall glass: straw, orange juice with pulp
   bubbles, a highlight, and a fresh orange slice on the rim. ── */
const juice: ReactNode = (
  <>
    <rect width="96" height="96" rx="16" fill={C.ground} />
    <ellipse cx="46" cy="84" rx="19" ry="4" fill={C.ink} opacity="0.08" />
    {/* straw (drawn first — it enters behind the glass wall) */}
    <rect x="41.5" y="16" width="5" height="26" rx="2.5" fill={C.straw} transform="rotate(-12 44 29)" />
    {/* glass */}
    <path
      d="M33.5 32 H62.5 L59.6 75.5 A5 5 0 0 1 54.6 80 H41.4 A5 5 0 0 1 36.4 75.5 Z"
      fill="#FFFFFF"
      opacity="0.5"
    />
    <path
      d="M33.5 32 H62.5 L59.6 75.5 A5 5 0 0 1 54.6 80 H41.4 A5 5 0 0 1 36.4 75.5 Z"
      fill="none"
      stroke={C.ink}
      strokeWidth="2"
      opacity="0.18"
    />
    {/* juice */}
    <path
      d="M36 42 H60 L57.4 75 A4 4 0 0 1 53.4 78.4 H42.6 A4 4 0 0 1 38.6 75 Z"
      fill={C.juice}
    />
    <ellipse cx="48" cy="42" rx="12" ry="2.9" fill={C.juiceLight} />
    <circle cx="44" cy="52" r="1.6" fill="#FDE3BC" />
    <circle cx="52" cy="60" r="1.2" fill="#FDE3BC" />
    <circle cx="47" cy="68" r="1.4" fill="#FDE3BC" />
    {/* glass highlight */}
    <rect x="37.5" y="36" width="3.2" height="34" rx="1.6" fill="#FFFFFF" opacity="0.55" />
    {/* orange slice on the rim */}
    <g transform="rotate(6 64 31)">
      <circle cx="64" cy="31" r="9" fill={C.orange} />
      <circle cx="64" cy="31" r="7" fill={C.juiceLight} />
      <path
        d="M64 25.5 V36.5 M58.5 27.8 L69.5 34.2 M69.5 27.8 L58.5 34.2"
        stroke={C.pulp}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="64" cy="31" r="1.1" fill={C.orange} opacity="0.9" />
    </g>
  </>
);

const ART: Record<DemoProductArtKind, ReactNode> = {
  pizza,
  "burger-beef": burgerBeef,
  "burger-chicken": burgerChicken,
  juice,
};

/** One deterministic illustration per product kind — aria-hidden by
 * design (the product NAME beside it carries the meaning). */
export function DemoProductArt({
  kind,
  className,
}: {
  kind: DemoProductArtKind;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 96 96"
      className={className}
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      {ART[kind]}
    </svg>
  );
}
