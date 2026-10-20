# Smart Order — Design System Master File (OPERATIONAL DAYLIGHT)

> **AUTHORITY:** This file describes the identity AS IMPLEMENTED in
> `src/app/globals.css` (r152 "Operational Daylight: Route & Node" +
> P16-4c United Carriers register + P18-W2-d two-voice law) and pinned by
> `tests/parity.mjs` (the parity snapshot is the gate — if this file and
> the CSS disagree, the CSS + parity win and this file must be fixed).
> The earlier generated draft (orange #EA580C + trust-blue #2563EB +
> "vibrant & block-based") was a contradiction of the shipped product and
> is retired.
>
> **When building a page:** check `design-system/smart-order/pages/*.md`
> first; if a page file exists it overrides this master file.

---

**Project:** smart-order — the ecosystem's daytime OPERATIONS ROOM.
**Register:** light-first "Operational Daylight" + the dark explicit
"night dispatch" override. Reference DNA: United Carriers' restrained
operational typography (adapted, never copied — see Do-Not-Copy).
**One-line law:** *a shipping document with a billboard laid over it —
machine facts in mono, merchant claims in display type, on daylight
paper, with exactly one saturated accent.*

---

## 1. Canonical color tokens (semantic roles)

### The daylight ground (`:root`, the default)

| Role | Token (CSS var) | Value | Notes |
|---|---|---|---|
| Ground / page | `--background` | `#F7F7F4` | crisp daylight paper, FLAT (no body radial) |
| Raised surface | `--card` / `--popover` | `#FFFFFF` | white cards on paper |
| Soft ground | `--muted` / `--secondary` | `#EFEFEA` | quiet fills, skeleton grounds |
| Primary ink | `--foreground` | `#1B2A41` | ink NAVY (12.6:1 on paper) — never pure black |
| Secondary ink | `--muted-foreground` | `#4E5A6E` | steel-navy, 6.4:1 |
| Muted ink | `--placeholder-text` | `#6E7684` | 4.6:1 on white cards |
| Hairline | `--border` | `#E2E2DC` | daylight hairline (1px default) |

### The ONE accent — DELIVERY ORANGE

| Role | Token | Value | Usage law |
|---|---|---|---|
| Primary / action | `--primary` | `#D14900` | the courier vest: primary buttons, active nodes, traveled road, live marker. White on it = 4.5:1 ✓ |
| Hover | `--accent-hover` | `#B23E00` | button hover step |
| Pressed | `--accent-pressed` | `#8F3A00` | button active step |
| Deep text accent | `--c-copper-deep` / `--accent-foreground` | `#8A3400` | orange AS TEXT (7.5:1 on paper) — links, emphasized facts |
| Soft wash | `--accent-soft` / `--c-copper-bg` | `#FCE3D6` | chip/stamp ground; featured-band wash ≤45% |
| 12% wash | `--accent` | `rgb(209 73 0 / 0.12)` | hover tints |

**Accent laws (absolute):**
- Orange = ACTION + LIVE STATE only. Never body text (use the deep step
  for text), never a full-surface wash, never decorative fills.
- **NEVER blue.** United Carriers' `#0016CB` is their brand core —
  forbidden here (the one historical exception, the landing night
  under-globe breath `#2962FF`, is landing-scoped and low-alpha).
- WhatsApp green `#25d366` is reserved for WhatsApp surfaces only.

### Status families (the 9 pastel `-bg/-ink/-deep` triplets)

| Family | bg / ink / deep | Semantic |
|---|---|---|
| copper | `#FCE3D6` / `#D14900` / `#8A3400` | the orange family (accent + charts-1) |
| mint | `#DCF0E4` / `#1E7A46` / `#14522D` | success — delivered, paid |
| sky (STEEL) | `#DFE9F0` / `#3E5C76` / `#2A3E52` | info — payment instructions |
| yellow | `#FCF1CD` / `#B45309` / `#6B4C0B` | warning — pending attention |
| rose | `#FBE3E6` / `#C4384A` / `#8C2733` | destructive — cancel/reject |
| grey | `#ECEDE7` / `#6E7684` / `#2F3745` | neutral cancelled |
| saffron | ramp mid `#E06B1B` (`--c-saffron`) | the «مميز» badge + cart count |
| lavender / sand / peach | see globals.css | chart spares only |

Text always rides the `-deep` step; fills/strokes the `-ink` step; soft
grounds the `-bg` step. Charts chain `--chart-1..5` → copper/mint/sky/
rose/lavender `-ink`.

### Night dispatch (`.dark`, explicit override — not the default stage)

`--background #0D1626`, `--card #152238`, `--foreground #F1F0EA`,
`--primary #FF7A38` (luminous orange, dark ink on it), text-accent
`#FFA170`, copper family flips dark. Same laws, night-lit.

### Landing scope (`.landing`, the Orbit-Ink editorial twin)

Warm paper `--ln-ink #FBFAF8` + navy ink `--ln-cream #1B2A41` + route
orange `--ln-lime #C24E00` (small-text tier `--ln-lime-text #B23E00`,
5.6:1) + steel `--ln-violet #3E5C76`; night stage `#05070D`. Landing-only
— product surfaces keep the daylight tokens above.

---

## 2. Typography — the TWO-VOICE LAW (P1, non-negotiable)

The product speaks with exactly two voices, and their jobs never mix:

| Voice | Stack (token) | Job | Sizing |
|---|---|---|---|
| **DISPLAY (claims)** | `--font-heading` / `--font-display`: Barlow Semi Condensed (Latin) → Tajawal / IBM Plex Sans Arabic (Arabic) | page h1/h2, claims, marketing, status claims | page titles `clamp(28px, 3.6vw, 40px)` 700; store h1 16px bold; hero `clamp(2.75rem, 8.2vw, 6.75rem)` lh ≥1.15 |
| **BODY (Arabic reading)** | `--font-sans`: IBM Plex Sans Arabic → Tajawal | all prose, labels, buttons | 13–16px, lh 1.5–1.8 |
| **FACTS (machine mono)** | `--font-mono`: IBM Plex Mono → Tajawal → IBM Plex Sans Arabic | ORDER NUMBERS (`SO-2026…`), amounts (formatLyd), timestamps, ages, phone numbers, counts, codes, KPI values, telemetry chips | 10–12px chips; 28px KPI values; 18–20px money totals. ALWAYS `tabular-nums` |

**Mono-facts checklist (value re-anchored P18-W2-d):** order numbers ·
receipt/totals money · prices (storefront price chips, variant chips) ·
zone fee + minimum · USSD codes + transfer numbers · timestamps
(`formatArabicDateTime`) · relative ages (`timeAgoAr`) · KPI values ·
feed-row facts · phone numbers (dir="ltr"). Arabic runs inside mono
(`د.ل`, `ص/م`) continue on the Arabic fallback of the mixed-script stack
— that is the intended rendering, not a bug.

**Dim-prefix headline grammar (UC P4, RTL-adapted):** the stable prefix
rides the dim ink and the live words carry the full ink — dim the
beginning, emphasize the end. Canonical spellings: tracking h2
«طلبك …status», checkout h1 «طلبك …claim», dashboard overview h1
«عمليات اليوم». Apply ONLY where a real stable-prefix exists; never
force a mid-phrase dim split.

**Arabic laws:** Western digits everywhere (`money.ts` policy; no
`toArabicNumber`); `tracking-normal` on Arabic headings (letter-spacing
breaks joined script; mono tracking survives only on pure-Latin runs);
`leading ≥1.15` on Arabic display; counted plurals via
`lib/arabic-plural` (صنف واحد/صنفان/٣ أصناف…); RTL logical properties
(`ps/pe/ms/me/start/end`) only — zero physical left/right.

**Fonts are self-hosted** (`public/fonts`, loaded via `fonts.css` BEFORE
the sheet; `--font-cairo` is the documented legacy shim NAME for
"IBM Plex Sans Arabic"). No Google Fonts imports, no new families —
except the landing display pair (W7-G doc-truth): `Archivo` + `Noto Kufi
Arabic` ride `next/font/google` in `layout.tsx`, which self-hosts the pair
at BUILD time (zero runtime Google fetch). That pair is the one
sanctioned exception; no other families.

---

## 3. Spacing, layout, breakpoints

- Space scale: 4/8/12/16/20/24/32/48/64 (`p-1…p-16` utilities; `--sp-*`
  legacy names ride the same rungs).
- Content caps: storefront `max-w-4xl`; checkout/track `max-w-lg` (≤lg)
  / `max-w-2xl` (lg+); dashboard shell `1280px` (`max-w-7xl`).
- Radii: `rounded-sm` (2–4px) = **stamps/chips/pills-when-active**;
  `rounded-md` = inputs/buttons; `rounded-xl` (12px) = cards/sections;
  `rounded-2xl` = dialogs. Round pills are IDLE filter chips only — the
  ACTIVE one squares (franked stamp).
- Breakpoints: Tailwind default; the tracking route map pivots
  vertical→horizontal at `lg` (1024px); mobile bottom nav < lg.
- Safe areas: `safe-top` / `safe-bottom` on every fixed bar.

---

## 4. Buttons & CTA variants

| Variant | Anatomy |
|---|---|
| Primary | solid `--primary`, white ink, `h-11` default / **`h-12` (size-lg) for every money-path CTA** (submit, cart checkout, track CTA); hover `--accent-hover`, active `--accent-pressed` |
| Outline | hairline `--border` + navy ink; hover = border-strong + muted bg |
| Ghost | text + accent-foreground; `h-8` in card headers |
| Icon buttons | **44px floor (`size-11`)** — cart, theme toggle, steppers, close, copy |
| Landing CTAs | `.ln-btn-solid` editorial inversion (paper bg + navy ink, 48px, 2px corners) + `.ln-btn-ghost` outline — landing scope only |
| Focus | global `:focus-visible` 2px ring (`--ring`) — never remove, never double |

Laws: disabled CTAs EXPLAIN themselves inline (checkout submit reason
line, product-dialog required-options line) — a disabled button with no
reason is a defect. Money CTAs across one funnel share ONE size
spelling. Destructive actions always ride a ConfirmDialog with a note.

---

## 5. Forms, validation, focus

- Inputs: `h-11`, `rounded-md`, `border-input` (#6E7684, 4.6:1 for
  WCAG 1.4.11), `text-base` (no iOS zoom), focus = primary border +
  `--state-input-focus-halo`; `aria-invalid` = rose border + error halo.
- Arabic validation copy per the family law (r151-4c): «رقم الهاتف غير
  صحيح — مثال: 0912345678» style (state the rule + a correct example).
- Errors: `FieldError` = quiet rose stamp (squared, `--c-rose` family).
- Collect ALL field errors in one pass; focus + scroll the first failing
  field; toast as reinforcement only.
- Selects/toggles/tabs keep `aria-pressed` group semantics (filter strips
  are NOT tablists); dirty forms guard `beforeunload`.

---

## 6. Surfaces, borders, shadows, elevation

- Paper → card → popover layering; NO glass blur on product surfaces
  (backdrop-blur only on sticky bars at 92–95% opacity).
- Elevation tokens: `--elev-1/2/3` (shadow-sm/md/lg); hovers use
  border-strong FIRST, shadow/translate second (`-translate-y-px` max on
  small cards).
- The ROUTE & NODE motif is the product's signature: dashed route line
  (`.route-divider`, `.tk-route*`) + circular nodes; section dividers,
  empty states, skeletons (RouteNodeDot), tracking spine, checkout
  journey indicator, sidebar rail all speak it.

---

## 7. Icons

Lucide only, `size-4` inline / `size-5` in 44px wells; stroke width
default (2). Icon wells: 44px (`size-11`) pastel `-bg` ground with 1.5px
inset `-ink`/30% rim (dashboard KPI/stamps). No emojis as icons, ever.

---

## 8. Dialogs, drawers, sheets, navigation, tabs

- Dialogs: `rounded-2xl`, mobile = bottom sheet (`rounded-t-2xl`), Radix
  title+description contract (sr-only is fine), 44px close buttons,
  product dialog re-checks live availability on open.
- Cart drawer / mobile sheets: 44px rows, `safe-bottom`.
- Dashboard chrome: sidebar route-rail (dashed hairline + node dots,
  light-only), business switcher, mobile bottom nav (4 + «المزيد»
  bottom-sheet), 1280px cap, skip-link.
- Tabs: `underline-tabs` ACTIVE = franked stamp (squared, copper family);
  the generic underline indicator is RETIRED.
- Toasts: sonner; errors persist (duration: Infinity doctrine); new-order
  toasts carry a jump action.

---

## 9. Tables, lists, states

- Tables: hairline zebra `divide-border/60`, hover row wash, mono facts
  columns (order#, phone, total, timestamp); `md:hidden` card-list twin
  is mandatory (responsive fallback, same data).
- Empty states: `EmptyState` with RouteStationRoad scene + one real next
  action (never a dead end).
- Loading: shape-matched skeletons (HeaderSkeleton / KpiGridSkeleton /
  TableSkeleton / CardListSkeleton / SectionSkeleton dashed variant) +
  `role=status aria-busy` + sr-only label.
- Errors: `ErrorState` with retry; API failures keep last-known data when
  any exists (checkout store-load rule); offline = quiet hint + manual
  retry (tracking poll-failure idiom).
- Status chips: `ORDER_STATUS_CHIP` / `PaymentStatusBadge` — squared
  stamps, family borders, deep-ink text; `aria-live` on the live one.

---

## 10. Motion rules + reduced-motion

Durations: `--t-fast 160ms` (state) · `--t-base 240ms` (hover/section) ·
`--t-slow 380ms` · entrance pops 700ms (KPI values). Eases:
`--ease-smooth` state changes, `--ease-spring` playful pops (0.34,1.36,
0.64,1). Entrance staggers ≤60ms/step, capped.

**Reduced motion:** the global `prefers-reduced-motion` belt halts the
route runner, pulses (`animate-pulse-soft`), marquee, and grain; content
never depends on motion. Polling is visibility-gated (15s track / 20s
dashboard — hidden tabs skip fetches entirely).

**Honesty laws (data + motion):** never fabricate operational data — no
GPS/ETA/courier chips, no fake timestamps, no decorative "live" pings.
Visualizations ride REAL rows only (tracking statusHistory, week series,
plan usage). Clock text renders mount-gated (SSR paints no clock text →
zero hydration drift).

---

## 11. Contrast requirements + state colors

Minimums: body/labels 4.5:1; 11px mono facts ride the FULL muted ink
(`--muted-foreground`, never /70 alpha — the pending-station lesson);
large display 3:1; focus indicators 3:1. The deep text steps (`-deep`
family, `--c-copper-deep`) exist exactly for AA-on-soft-ground duties.
State colors = the status families above; disabled = 40% opacity + honest
reason line, `cursor-not-allowed`.

---

## 12. Mobile adaptation (390px)

- Zero horizontal overflow (scrollWidth == viewport) — route-map SVGs use
  fixed slots inside card padding; the horizontal chapter bleeds only
  into card padding, never the page.
- 44px touch floor everywhere (title rows get `min-h-11` hit areas);
  48px money CTAs.
- Sticky money bars carry `safe-bottom`; headers `safe-top`.
- Grids: storefront 2-col; KPI 2×2; tables → card lists.
- Featured band panel + mono price chips survive at 390 (compact stamp
  rungs: 10–11px).

---

## 13. DO-NOT-COPY (the UC reference boundary)

United Carriers is the typography/composition DNA source — the mapping,
never the identity:

- ❌ their electric blue `#0016CB` / any blue accent
- ❌ BT Steinhart or any new display face; the black hero stage; the
  preloader gate; the home-vs-interior nav swap
- ❌ the globe-as-identity (dot-matrix world, freight arcs, country pills)
  — Smart Order's dotted globe + route arcs (P12) is its own object
- ❌ freight imagery (ports/cranes/containers) — imagery comes from our
  real surfaces (storefronts, receipts, route maps)
- ❌ fabricating liveness — their globe is fed by real offices; our
  visuals are fed by real order rows or they don't render

---

## Pre-delivery checklist

- [ ] Two-voice: every machine fact on the surface rides `font-mono
      tabular-nums`; every claim rides the display voice
- [ ] Orange only as action/live; deep step for orange text; zero blue
- [ ] Squared stamps for active chips/badges; round pills only idle
- [ ] 44px interactive floor; 48px money CTAs; visible focus rings
- [ ] Arabic: Western digits, counted plurals, no letter-spacing on
      joined script, logical RTL properties
- [ ] States: skeleton shape-matched, empty state with action, error with
      retry, disabled with inline reason
- [ ] No fabricated operational data; no clock text in SSR
- [ ] `prefers-reduced-motion` halts pulses/runners/marquee
- [ ] 390px: no horizontal overflow, safe areas respected
- [ ] Gates green: `eslint .` · `tsc --noEmit` · `node --test tests/unit`
      · `node tests/parity.mjs` (the parity snapshot IS this document's
      enforcement arm)
