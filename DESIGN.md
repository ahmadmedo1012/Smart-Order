# DESIGN.md — the Smart Order design language

> Context file for design/UX work. These are the system's laws as verified in
> code — follow them; change them only deliberately and update this file in the
> same commit.
>
> **Upstream source:** the Madarek design system (`madarek/frontend/src/styles/
> tokens.css` — the sibling-family single source of truth; it stands alone,
> no intermediate digest). **Token SSOT in this repo:**
> `src/app/globals.css` (`:root` = night layer, `.light` = cream layer,
> `@theme inline` = Tailwind bridge). Fonts: `public/fonts/fonts.css`. If this
> file and globals.css disagree, globals.css wins — fix the doc.

## Identity

Madarek night world (default theme): ground `#070B16` night-indigo, surfaces
`#0D1428 / #121A36`, ink `#F2EFE6` warm sand, accent `#E9B44C` gold (hover
`#F5D48A` · strong `#C9962F` · soft `#2C2312` · on-accent ink `#05070F`),
hairlines `#1B2444 / #263052`, secondary text `#C3C8DC`. Light mode is a
first-class parity mode: cream ground `#FBFAF9`, white cards, ink `#191918`,
copper accent `#B57438` (hover `#9A5F25` · strong/deep `#5C3416` · soft
`#F4E4D2` · fg `#1A0F06`), hairlines `#E9E7E2 / #D9D6D0`. All as
dual-lightness tokens (both layers AA-verified). The old flame system
(`#010000` ground / `#bc4700` flame / Cairo + Readex Pro / radius 8-12-18-28)
is RETIRED — do not reintroduce it; only "was ..." migration comments may
mention those hexes.

**Brand signature:** the gold-metal mark gradient `linear-gradient(145deg,
#C9962F, #E9B44C)` with void-ink glyph `#05070F` — carried by the raster
brand assets (the dead `shared/brand.tsx` component, zero consumers, was
removed in r132). `text-gradient-orange` rides gold → hover-gold at 135° in dark,
copper `#B57438 → #9A5F25` in light. Raster brand assets (favicon,
icon-192/512, apple-touch-icon, brand-icon, favicon.ico, og-default.png) are
night+gold. `public/showcase-store.webp` was recolored to the same identity in
r125 — the flame-era original is gone.

## Color

- **Tokens only.** Raw palette classes and arbitrary hexes are banned outside
  the token files (sanctioned raw-hex sites exist — WhatsApp brand colors,
  recharts selectors, device-mockup materials; audit before adding any).
- **9 pastel families** × {bg, ink, deep} in BOTH modes: peach · mint ·
  lavender · sky · yellow · rose · sand · grey · copper (`--c-*-bg/-ink/-deep`
  in `:root` and `.light`). Dark = space-tinted deep bgs + luminous inks;
  light = pastel bgs + saturated inks + deep text shades.
- **Status language = the canonical three-way split** (restored r125): base =
  the family ink (FILL/STROKE role — dots, usage bars, soft-tint borders;
  light: mint `#4FA66D` / yellow `#D6A330` / sky `#5C8FCE` / rose `#DD6E78`;
  dark: the luminous inks), `*-ink` = the family deep for TEXT (light:
  `#1F4F30 / #6B4C0B / #1F3D63 / #6B2128`, AA 6.2-11.2:1 on every consumer
  surface; dark: same as base), `*-soft` = the family -bg pastel tint.
  Fill foregrounds = `#191918` ink on the mids (Madarek `--danger-fg`
  pattern; NEVER white on the mid or luminous fills). Status semantics:
  NEW = gold, CONFIRMED/OUT_FOR_DELIVERY = info, PREPARING/READY-adjacent =
  warning/saffron, DELIVERED/PAID = success, REJECTED/REFUNDED =
  destructive.
- **WhatsApp green** (`#25D366` family) appears exclusively on
  WhatsApp-brand actions; it is a brand, not a success color.

## Typography

- **IBM Plex Sans Arabic is THE family** (body + display + headings,
  `--font-sans` = `--font-heading`), self-hosted 400/500/600/700 × {arabic,
  latin} subsets, `font-display: swap`, the two arabic subsets preloaded in
  `app/layout.tsx`. Accent cut: Plex Mono (latin) for codes/IDs. (r132: the
  dead Plex Serif italic + Noto Naskh Arabic faces — zero consumers — were
  removed with the `.font-naskh` rule.)
- Legacy `--font-cairo` is a documented shim NAME whose value is defined in
  `public/fonts/fonts.css` (`:root { --font-cairo: "IBM Plex Sans Arabic" }`,
  ~line 38) — kept as the load-bearing contract (an undefined var would
  invalidate the whole font-family declaration); the literal
  `"IBM Plex Sans Arabic"` fallback in every stack keeps things resolvable
  regardless. Cairo/Readex Pro files are deleted from the repo.
- Weights ≤ 700 (Plex Sans Arabic ships 400-700 only; 700 carries display —
  no true 800 exists).
- **No letter-spacing on Arabic, ever** — the `[dir=rtl] :lang(ar)` +
  heading guards in globals.css enforce it (Madarek ruling #2: tracking
  breaks cursive joins). Tracking is legal only on Latin-safe runs
  (Latin wordmarks). No synthetic italics on Arabic.
- Numbers everywhere: `tabular-nums` + `lining-nums` globally (this is a
  money product — 1 LYD = 1000 millimes, always Int millimes, never floats).

## Shape, space, elevation

- Radius ladder (Madarek "Notion-soft"): **6 / 8 / 10 / 12 / 16 / 20 / 28**
  (+ `9999` pills) via `--radius-xs … --radius-3xl` (`@theme`): buttons and
  inputs `rounded-lg` (12), cards `rounded-xl` (16 = Madarek `.card` r-xl),
  dialogs/sheets `rounded-2xl` (20), hero panels `rounded-3xl` (28). Never
  ad-hoc px radii.
- Spacing: Tailwind scale only (4px base).
- Elevation: `--elev-1..5` dual grammar — dark = fill-led + 1px inset white
  top-light; light = soft two-layer black (`--shadow-card/-h/-pop/-modal`
  compose on top). Glass: `rgba(11,16,32,0.78)` dark /
  `rgba(251,250,249,0.78)` light + 16px blur + theme hairline (`--glass-*`).
- Grounds are FLAT: no body radial in either theme (`--background-radial:
  none`); painted gold/copper hero washes live ONLY in `--menu-glow` hero
  scopes.
- Under `prefers-contrast: more`: elevations collapse to solid rings (white
  .36-.68 dark / black .32-.64 light), glass goes solid, borders strengthen —
  ported from Madarek tokens.css (`:root:not(.light)` + `.light` blocks).

## Motion

Madarek motion ladder: `--t-micro 80 / --t-fast 160 / --t-base 240 / --t-slow
380 / --t-slower 520 / --t-cinema 720ms` + canonical easings and springs
(`--ease-spring`, `--ease-bounce`, `--ease-smooth` = Madarek `--ease-out`).
Press register: buttons `active:scale-[0.97]`, cards lift `-3px` on hover
(`card-premium`). `[dir=rtl]` flips `--motion-direction: -1` for logical
translations. **Reduced motion** = the Madarek 0ms ZEROING: every `--t-*`
token drops to `0ms` (unlayered block — a layered redefinition would lose the
cascade to the unlayered `:root` ladder) + the universal `0.01ms` guard with
`iteration-count: 1`; state changes and final frames are preserved, nothing
is left mid-air.

## Components

- Primitives (`src/components/ui/*`) are the default choice — never
  re-implement a primitive. Buttons: h-12 default, `font-bold`,
  `rounded-lg`, `active:scale-[0.97]`, gold/copper focus rings
  (`--state-input-focus-halo` color-mix recipe, no raw oklch).
- **Status chips** (`shared/status-badges.tsx`, `ui/badge.tsx`):
  `bg-<status>/15 + text-<status>-ink + border-<status>/25` — soft tint +
  deep text + family border, plus a base-colored dot.
- **Empty states** (`shared/states.tsx`): accent-tinted icon ring
  (`--orange` 8% wash + 20% border), never hand-rolled.
- Icons: lucide named imports only. Forward motion in RTL points LEFT
  (`rtl:rotate-180` on arrows — e.g. the hero CTA); back affordances use
  ArrowRight/ChevronRight (RTL convention).
- Inputs: h-12 `rounded-lg`, placeholder rides full-strength
  `text-placeholder-text` (AA 5.0-6.8:1 — do NOT re-add opacity modifiers).

## RTL & layout

Arabic RTL-first (`lang="ar" dir="rtl"`); numeric/Latin runs (phones, order
codes, URLs) get `dir="ltr"` or `bdi` isolation. 1220px landing column;
mobile-first storefront with bottom nav + sticky order bar + safe-area
insets (`safe-bottom`). Touch targets ≥ 44px. Film-grain atmosphere overlay
at 2.2%/1.2% opacity (pointer-events none). Sticky footer discipline:
`min-h-dvh flex-col` + `mt-auto`.

## Mode rule (I-12)

Persuade surfaces (landing, auth) may carry the full gold identity
(gradients, glow, showcase). Operate surfaces (dashboard) get a thin header
accent AT MOST — never port marketing ambience into CRUD density.

## SEO/metadata conventions

Title template `%s | سمارت أوردر`. Open Graph cards point at
`/og-default.png` (1200×630, Madarek night/gold identity). `manifest.json`:
`theme_color #E9B44C`, `background_color #070B16`; viewport `themeColor`
dual `#FBFAF9`/`#070B16`. NOTE: `NEXT_PUBLIC_SITE_URL` must be a REAL url or
unset — an empty string crashes `new URL()` in `layout.tsx` metadata (dev
500s the whole site; fixed in `.env.example` r125).

## Do's and Don'ts

- Do keep WhatsApp green off non-WhatsApp surfaces.
- Do render status as soft tint + `-ink` text + base border/dot — the
  canonical split; text NEVER rides the base mid-tones (they fail AA in
  light).
- Do use the gold metal gradient only on the brand mark and primary CTAs.
- Don't introduce a second accent family (no blues, purples, emeralds —
  families outside the 9 pastel set are for charts/illustration only).
- Don't use emoji as icons — lucide stroke set only.
- Don't use generic Tailwind gray; the neutrals are night-indigo (dark) /
  warm cream (light).
- Don't animate layout properties; transform/opacity only.
- Don't track (letter-space) Arabic — ever.
