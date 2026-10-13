# DESIGN.md — the Smart Order design language

> Context file for design/UX work. These are the system's laws as verified in
> code — follow them; change them only deliberately and update this file in the
> same commit.
>
> **Token SSOT in this repo:** `src/app/globals.css` (`:root` = the LIGHT
> default, `.dark` = the night-dispatch opt-in, `@theme inline` = Tailwind
> bridge). Fonts: `public/fonts/fonts.css`. If this file and globals.css
> disagree, globals.css wins — fix the doc.

## Identity — «Operational Daylight: Route & Node» (Phase 5, r152)

Smart Order is the ecosystem's **daytime operations room** — dispatch sheets,
courier vests, and shipping stamps. Phase 5 deliberately breaks the family
Madarek night monoculture: this product's contract is its own (Smart-Link
keeps the family night; Smart-Menu goes warm culinary; SmartBot goes petrol).

- **LIGHT-first.** `:root` is the light theme (`color-scheme: light`);
  `.dark` («إرساليات الليل» — night dispatch) is the explicit opt-in
  (next-themes `defaultTheme="light"` + the pre-paint boot script).
- Ground paper `#F7F7F4` · raised white `#FFFFFF` · soft `#EFEFEA` ·
  hairline `#E2E2DC` · ink NAVY `#1B2A41` · secondary `#4E5A6E` (6.4:1) ·
  muted `#6E7684`.
- Primary **DELIVERY ORANGE** `#D14900` (white on it 4.5:1 ✓ · hover
  `#B23E00` · pressed `#8F3A00` · as TEXT `--accent-ink` `#8A3400`, 7.5:1
  on paper). Info STEEL `#3E5C76` · success `#1E7A46` · warning amber ·
  destructive rose. Orange = the courier vest; navy = the dispatch ink.
- Night dispatch: ground `#0D1626`, surface `#152238`, surface-2 `#1B2A41`,
  paper ink `#F1F0EA`, LUMINOUS orange `#FF7A38` with dark on-orange ink
  `#241307` (6.9:1) · accent-as-text `#FFA170` (9:1) · hover `#FF8A50` ·
  pressed `#E85D10` · hairline `#24344F`.
- **WhatsApp green is reserved for WhatsApp UI only** (`--whatsapp`
  constant; text-on-fill rides `--whatsapp-foreground` per theme).

**Brand signature:** the orange press register (`active:bg-(--accent-pressed)`)
and the square shipping stamp. Raster brand assets (favicon, icons,
`og-default.png`) are PRE-FLIP captures — regeneration is pending (tracked
Phase 6 debt; manifest + viewport metas already ride the daylight pair).

## Color

- **Tokens only.** Raw palette classes and arbitrary hexes are banned outside
  the token files (sanctioned raw-hex sites exist — WhatsApp brand colors,
  recharts selectors, device-mockup materials; audit before adding any).
- **9 pastel families** × {bg, ink, deep} in BOTH modes: peach · mint ·
  lavender · sky · yellow · rose · sand · grey · copper (`--c-*-bg/-ink/-deep`
  in `:root` and `.dark`), re-anchored to the daylight world: sky = STEEL,
  mint = delivery green, yellow = amber, copper = THE delivery-orange family,
  grey = navy-grey neutrals. Light = pastel bgs + saturated inks + deep text
  shades; night = navy-tinted deep grounds + luminous inks.
- **Status language = the canonical three-way split:** base = the family ink
  (FILL/STROKE role — dots, usage bars, soft-tint borders), `*-ink` = the
  family deep for TEXT (light) / the luminous ink (night), `*-soft` = the
  family -bg pastel tint. Fill foregrounds = white on the light mids, dark
  void ink on the night luminous fills — never the wrong way. Status mapping
  (status-badges.tsx SSOT): NEW/READY = copper, CONFIRMED/OUT_FOR_DELIVERY =
  sky (steel), PREPARING = yellow (amber), DELIVERED/PAID = mint, CANCELLED/
  UNPAID = grey, REJECTED/REFUNDED = rose.

## Typography

- **BODY = Tajawal** (self-hosted 400/500/700/800 × {arabic, latin} subsets,
  `font-display: swap`, the two arabic subsets preloaded in `app/layout.tsx`).
- **DISPLAY/HEADINGS = Barlow Semi Condensed** (self-hosted 600/700, latin
  only). `--font-heading` = `"Barlow Semi Condensed", var(--font-cairo),
  "Tajawal", …` — Barlow carries Latin display; Arabic headings chain to
  Tajawal (never Times). `--font-display` rides the same chain.
- **OPERATIONAL CODES = IBM Plex Mono** (`--font-mono`, latin): order IDs,
  page counts, pagination numerals — anything a dispatcher reads as a code.
- The legacy `--font-cairo` shim resolves to `"Tajawal"`
  (`public/fonts/fonts.css` ~line 38) — kept as the load-bearing contract
  (an undefined var would invalidate the whole font-family declaration).
- Weights ≤ 800 (Tajawal ships 400-800; 800 carries display).
- **No letter-spacing on Arabic, ever** — the `[dir=rtl] :lang(ar)` +
  heading guards in globals.css enforce it (tracking breaks cursive joins).
  Tracking is legal only on Latin-safe runs. No synthetic italics on Arabic.
- Numbers everywhere: `tabular-nums` + `lining-nums` globally (this is a
  money product — 1 LYD = 1000 millimes, always Int millimes, never floats).

## Shape, space, elevation — «stamps & roads»

- Radius ladder: **6 / 8 / 10 / 12 / 16 / 20 / 28** (+ `9999` pills) via
  `--radius-xs … --radius-3xl`: buttons/inputs `rounded-md` (10), cards
  `rounded-xl` (16), dialogs/sheets `rounded-2xl` (20). Never ad-hoc radii.
- **THE STAMP:** status and selection chips are SQUARE-CORNERED
  (`rounded-sm`) with a 1px family-ink border over the solid family ground
  + family deep ink — the shipping-stamp grammar (badge.tsx,
  status-badges.tsx, active filter pills/tabs, pagination active page,
  error states). A round pill reads as idle; a squared stamp reads as
  franked/selected. Do not round the stamps back into pills.
- **THE ROAD:** dividers between sections ride the dashed route line —
  `.route-divider` (2px dashed orange + circular node) /
  `.route-divider-quiet` (hairline road at rest) / `.route-spine-segment`
  (vertical 2px dashed inline-start spine); the tracking timeline draws the
  road with `border-s-2 border-dashed` segments between station nodes.
- Spacing: Tailwind scale only (4px base).
- Elevation: `--elev-1..5` — daylight = soft two-layer navy-inked black;
  night = fill-led + 1px inset white top-light (`--shadow-card/-h/-pop/
  -modal` compose on top). Glass: paper rgba + 16px blur + navy hairline.
- Grounds are FLAT: no body radial in either theme; orange hero washes live
  ONLY in `--menu-glow` hero scopes.
- Under `prefers-contrast: more`: elevations collapse to solid rings, glass
  goes solid, borders strengthen.

## Components

- Primitives (`src/components/ui/*`) are the default choice — never
  re-implement a primitive. Buttons: `h-11` 44px default (`h-12` 48 lg),
  `font-bold`, `active:scale-[0.97]`, orange press register
  `active:bg-(--accent-pressed)`, token focus rings (`--state-focus-ring-*`).
- **Status stamps** (`shared/status-badges.tsx`, `ui/badge.tsx`): solid
  family ground + family deep ink + 1px family-ink border + squared
  `rounded-sm` corner, plus a base-colored dot on status chips.
- **Dashboard chrome (Phase 6 grammar):** PageHeader carries an optional
  quiet route divider + a mono `meta` line for counts; UnderlineTabs'
  active tab and FilterPills' active pill speak the stamp language;
  TablePagination numerals ride Plex Mono with squared controls;
  ConfirmDialog gets a header hairline + squared destructive confirm;
  skeletons carry node punctuation (route-station dots) and dashed
  section variants; FieldError is a quiet rose stamp.
- **Empty states** (`shared/states.tsx`): stations on the route
  (RouteStationRoad — dashed road + terminal nodes), never hand-rolled.
- Icons: lucide named imports only. Forward motion in RTL points LEFT
  (`rtl:rotate-180`); back affordances use ArrowRight/ChevronRight.
- Inputs: h-11/h-12 `rounded-md`, placeholder rides full-strength
  `text-placeholder-text` (AA — do NOT re-add opacity modifiers).

## Motion

Ladder (theme-independent): `--t-micro 80 / --t-fast 160 / --t-base 240 /
--t-slow 380 / --t-slower 520 / --t-cinema 720ms` + canonical easings and
springs. Press register: buttons `active:scale-[0.97]` + the orange pressed
ramp; cards lift `-3px` on hover (`card-premium`). `[dir=rtl]` flips
`--motion-direction: -1`. **Reduced motion** = the 0ms ZEROING: every
`--t-*` token drops to `0ms` (unlayered block) + the universal `0.01ms`
guard with `iteration-count: 1`; state changes and final frames are
preserved, nothing is left mid-air.

## RTL & layout

Arabic RTL-first (`lang="ar" dir="rtl"`); numeric/Latin runs (phones, order
codes, URLs) get `dir="ltr"` or `bdi` isolation. 1220px landing column;
mobile-first storefront with bottom nav + sticky order bar + safe-area
insets. Touch targets ≥ 44px — the 44/48/52 control canon (default Button
`h-11`, pinned by parity). Film-grain atmosphere overlay at 2.2%/1.2%
opacity (pointer-events none). Sticky footer: `min-h-dvh flex-col` +
`mt-auto`.

## Mode rule (I-12)

Persuade surfaces (landing, auth) may carry the full orange identity
(gradients, glow, showcase). Operate surfaces (dashboard) get a thin header
accent AT MOST — never port marketing ambience into CRUD density. The
landing is a FIXED daylight world — no theme toggle on it (the toggle
appears on store/dashboard/auth surfaces only). Product surfaces
(store/checkout/dashboard/tracking) are full dual-lightness.

## SEO/metadata conventions

Title template `%s | سمارت أوردر`. Open Graph cards point at
`/og-default.png` (1200×630 — pre-flip raster, regen pending).
`manifest.json`: `theme_color #D14900`, `background_color #F7F7F4`; viewport
`themeColor` dual `#F7F7F4`/`#0D1626`. NOTE: `NEXT_PUBLIC_SITE_URL` must be
a REAL url or unset — an empty string crashes `new URL()` in `layout.tsx`
metadata (dev 500s the whole site).

## Anti-patterns (do not resurrect)

- **The Madarek night/gold identity** — indigo `#070B16` ground, gold
  `#E9B44C`, sand `#F2EFE6`, night-first default. RETIRED for this product;
  only "was …" migration comments may mention those hexes. The night
  DISPATCH (`.dark` #0D1626/#FF7A38) is this product's own dark mode, not
  a Madarek port.
- Rounding the stamps back into pills (selection/status grammar is square).
- Solid hairlines where the road grammar asks for dashes (section
  dividers, tracking spine) — and dashes where UI density asks for solid.
- A second accent family (no blues/purples/emeralds outside the 9 pastel
  set — charts/illustration only). Generic Tailwind gray (neutrals are
  navy-inked).
- WhatsApp green off non-WhatsApp surfaces; white on the light mid fills or
  dark ink on night pastels; emoji as icons (lucide only).
- Animating layout properties (transform/opacity only); letter-spacing on
  Arabic; ad-hoc px radii.
