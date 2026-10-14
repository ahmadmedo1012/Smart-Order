#!/usr/bin/env node
/**
 * test(r152): PHASE 5 PARITY SNAPSHOT — "Operational Daylight: Route & Node".
 *
 * ═════════════════════════════════════════════════════════════════════
 * THE PHASE 5 PER-PRODUCT DECISION (mission r152, documented):
 * Smart Order RETIRES the family Madarek token VALUES. The four-product
 * monoculture is broken deliberately: Smart-Link keeps the family night,
 * Smart-Menu goes warm culinary light, SmartBot goes petrol dark, and
 * THIS product re-anchors to a LIGHT-FIRST daylight operations world —
 * paper #F7F7F4, navy ink #1B2A41, DELIVERY ORANGE #D14900, steel info
 * #3E5C76, Tajawal + Barlow Semi Condensed + IBM Plex Mono, and the
 * dashed route-line/node motif. The dark theme survives as the explicit
 * "night dispatch" override (.dark). Token NAMES are unchanged (150+
 * consumers); every VALUE below is re-anchored to this contract. The
 * structural/family chain shape (status → pastel families, charts,
 * accent → copper family) is PINNED RAW as before — the SSOT idiom
 * survives the palette flip.
 * ═════════════════════════════════════════════════════════════════════
 *
 * Run: `npm run test:parity` (plain node — Smart-Order ships no unit-test
 * runner; its e2e script targets a live dev server, so this is a
 * dependency-free node script). Exit code 1 on any drift — CI-able.
 *
 * HOW IT READS THE CSS
 * ─────────────────────
 * - Only the theme blocks matter: :root (DAYLIGHT, the r152 default) and
 *   .dark (night dispatch override) — extracted brace-matched from the TOP
 *   LEVEL so @media (prefers-contrast / reduced-motion) overrides can never
 *   mask the resting values. The radius ladder lives in the Tailwind
 *   `@theme inline` block — extracted the same way.
 * - The dark scope is the real cascade: {.dark} overlays {:root}; tokens
 *   .dark does not redefine (radius, motion, families, elev…) inherit :root.
 * - var() chains are resolved inside the final scope; comparisons are
 *   normalization-tolerant (whitespace, `a,b` vs `a, b`, hex case) so the
 *   pins are about VALUES, not formatting.
 *
 * Token-name bridge (Smart-Order keeps its own shadcn/utility vocabulary):
 *   ground --bg → --background · surface --surface → --card
 *   bg-soft/surface-2 → --secondary · ink --text → --foreground
 *   ink-secondary → --muted-foreground · ink-muted → --placeholder-text
 *   accent --accent → --primary · accent-fg → --primary-foreground
 *   accent-ink → --accent-foreground · accent-soft → --c-copper-bg
 *   danger --danger → --destructive / --destructive-soft / --destructive-ink
 *   radius --r-* → --radius-* (Tailwind @theme, same 6/8/10/12/16/20/28)
 *
 * P4-W3c — the pastel families: WHO consumes the 54 --c-* tokens
 * ─────────────────────────────────────────────────────────────────────
 * Smart-Menu's idiom, adopted here (B2): the families are consumed via
 * the SEMANTIC layer that chains through them — --success/-ink/-soft →
 * mint, --warning* → yellow, --info* → sky, --destructive* → rose,
 * --chart-1..5 → copper/mint/sky/rose/lavender -ink, --accent-foreground
 * → copper -ink (dark) / -deep (light), --accent-soft → copper -bg.
 * Every status chip (OrderStatusBadge/PaymentStatusBadge), dashboard
 * stat tone, alert tint and chart color is therefore family-backed; the
 * family set is the SINGLE SOURCE (globals.css chains, no duplicated
 * literals). Direct product surfaces for the -bg pastel grounds: the
 * dashboard KPI icon wells + plan-usage chips (accent-soft) and the
 * per-card soft grounds (bg-success-soft etc.).
 *
 * N/A families (documented, per the audit's "no forced usage" rule):
 *   - peach/sand/grey: Madarek consumes these in its training/student/
 *     quality modules — surfaces this product does not have. Smart-Order
 *     is a single-accent commerce product; its non-status surfaces ride
 *     copper/muted. No natural surface → pinned for parity, not adopted.
 *   - lavender -bg/-deep: lavender appears only as --chart-5's ink; no
 *     lavender-grounded surface exists (in the Smart family lavender IS
 *     SmartBot's identity color — this repo links out, never paints it).
 *   - --radius-3xl (28): pinned but RESERVED — no 28px surface exists
 *     (cards 16, storefront dialog 20, hero orbs rounded-full).
 *   - --t-micro: consumed since P4-W3c as the canonical press tier
 *     (button + quick-add active:duration), Madarek §4.3 idiom.
 *
 * Every pinned literal was verified against the live SSOT
 * (madarek/frontend/src/styles/tokens.css) at authoring time; the
 * P4-W3c chains are additionally pinned RAW (see FAMILY_WIRING below)
 * so the single-source shape itself is under test, not just values.
 *
 * r127 (F7): whatsapp-ink — the last raw-hex straggler (audit r127-A4:
 * button.tsx painted its on-green ink as a literal text-[#07361d]
 * beside the token-ridden bg-whatsapp) is tokenized: --whatsapp-foreground
 * in BOTH theme blocks + the @theme bridge + a consumption/no-raw-hex gate.
 * Suite: 231 (197 product + 34 r128-F8 landing-layer pins: 25 .landing
 * token values + 9 raw gates — marquee keyframes/gap/loop/RM, --sp consumer,
 * scroll-spy ids, .ln-grain, and the .landing scope-isolation negatives).
 * ⚠ r136 header-truth: 231 هو العدد التاريخي لحقبة r128 — العدد الحي
 * 347 (r133 الكنسوز الدقيقة 276→346 + مسمار button-lg لـ r134). السطر
 * يبقى كما هو أعلاه لأنه جزء من السرد، والحساب الفعلي يطبع في نهاية
 * التشغيل (passed=347).
 *
 * r129 (F4): 231 → 276. The r129-A7 audit proved the suite's blind spot —
 * 231/231 green while 7 bridge tokens (--sp-3/-4/-7/-8, --r-2xl,
 * --page-gutter-mobile, --motion-duration-ambient-scene; 46 var() sites)
 * were defined NOWHERE and every containing declaration resolved to 0/none.
 * The fix layer adds: the MASTER var()-RESOLVER GATE (every var() in
 * landing.css must resolve against landing ∪ globals ∪ fonts — would have
 * caught the P0), the 7 bridge-value pins, the tactile/canvas/constellation
 * docking gates, the OrbitScene port pins (palette triplets, omega rad/ms,
 * biasX, intro key, DPR cap) and the r129 token-matrix additions
 * (--ring fleet reconciliation, --c-ember light, --accent-hover,
 * --ease-spring-snappy, --hover-lift, --gold-soft, --brand-purple, the
 * global --r-* ladder).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  ' '
);

// ── token file → theme scopes ────────────────────────────────────────────────

function topLevelBlocks(source) {
  const blocks = [];
  let i = 0;
  while (i < source.length) {
    const open = source.indexOf('{', i);
    if (open === -1) break;
    let depth = 1;
    let j = open + 1;
    while (j < source.length && depth > 0) {
      if (source[j] === '{') depth += 1;
      else if (source[j] === '}') depth -= 1;
      j += 1;
    }
    blocks.push({ prelude: source.slice(i, open).trim(), body: source.slice(open + 1, j - 1) });
    i = j;
  }
  return blocks;
}

const blocks = topLevelBlocks(css);
function block(prelude) {
  const b = blocks.find((x) => x.prelude === prelude);
  if (!b) throw new Error(`top-level block not found: ${prelude}`);
  return b.body;
}
// the radius ladder lives in the Tailwind theme blocks — merge every
// @theme / @theme inline block (document order, outermost wins)
function themeDecls() {
  const out = {};
  for (const b of blocks) {
    if (/@theme(?:\s+inline)?\s*$/.test(b.prelude)) Object.assign(out, parseDecls(b.body));
  }
  if (Object.keys(out).length === 0) throw new Error('Tailwind @theme block not found');
  return out;
}

function parseDecls(blockText) {
  const out = {};
  for (const m of blockText.matchAll(/--([A-Za-z0-9_-]+)\s*:\s*([^;]+);/g)) {
    out[`--${m[1]}`] = m[2].trim();
  }
  return out;
}

// r152: DAYLIGHT is the :root default; .dark (night dispatch) is the
// explicit override. The scope variables keep their historical names
// (dark/light) so the assertion tables below read naturally.
const light = parseDecls(block(':root'));
const theme = themeDecls();
// real cascade: .dark overlays :root; everything else inherits
const dark = { ...light, ...parseDecls(block('.dark')) };

function resolve(scope, value, depth = 0) {
  if (depth > 10) return value;
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*)\s*)?\)/g, (_m, name, fb) => {
    if (scope[name] !== undefined) return resolve(scope, scope[name], depth + 1);
    return fb ?? `var(${name})`;
  });
}

function norm(v) {
  return v
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/#[0-9a-f]{3,8}/gi, (h) => h.toUpperCase())
    .trim();
}

// ── assertion harness ────────────────────────────────────────────────────────

let passed = 0;
const failures = [];

function pin(scope, mode, token, expected) {
  const raw = scope[token];
  if (raw === undefined) {
    failures.push(`${mode} ${token} is missing from globals.css`);
    return;
  }
  const actual = norm(resolve(scope, raw));
  if (actual !== norm(expected)) {
    failures.push(`${mode} ${token} drifted from the Madarek canonical: got ${actual}, want ${norm(expected)}`);
  } else {
    passed += 1;
  }
}

function pinAll(scope, mode, table) {
  for (const [token, value] of Object.entries(table)) pin(scope, mode, token, value);
}

// ── canonical snapshot (madarek tokens.css, live-verified) ──────────────────

/* r152 tables — the DAYLIGHT contract (light = :root default) and the
   NIGHT DISPATCH override (dark = .dark). Every value re-anchored per
   the Phase 5 per-product decision documented in the header. */
const GROUNDS_LIGHT = {
  '--background': '#F7F7F4', // daylight paper ground
  '--card': '#FFFFFF', // raised white
  '--secondary': '#EFEFEA', // soft
  '--foreground': '#1B2A41', // ink navy — 12.6:1 on paper
  '--muted-foreground': '#4E5A6E', // secondary steel-navy
  '--placeholder-text': '#6E7684', // muted
  '--border': '#E2E2DC', // daylight hairline
};
const GROUNDS_DARK = {
  '--background': '#0D1626', // night dispatch ground
  '--card': '#152238',
  '--secondary': '#1B2A41',
  '--foreground': '#F1F0EA', // paper ink at night
  '--muted-foreground': '#B9C2D2',
  '--placeholder-text': '#8C97AC',
  '--border': '#24344F', // night hairline
};
const ACCENT_LIGHT = {
  '--primary': '#D14900', // DELIVERY ORANGE (white on it 4.5:1)
  '--primary-foreground': '#FFFFFF',
  '--accent-foreground': '#8A3400', // orange-deep text accent (7.5:1 on paper)
  '--accent-soft': '#FCE3D6', // chains --c-copper-bg
  '--c-copper-bg': '#FCE3D6',
  '--accent-hover': '#B23E00',
  '--accent-pressed': '#8F3A00', // r152 press register
};
const ACCENT_DARK = {
  '--primary': '#FF7A38', // luminous delivery orange
  '--primary-foreground': '#241307', // dark on-orange ink (6.9:1)
  '--accent-foreground': '#FF9A62', // luminous orange as text at night (8.7:1, chains --c-copper-ink)
  '--accent-soft': '#38200F', // chains --c-copper-bg (night)
  '--c-copper-bg': '#38200F',
  '--accent-hover': '#FF8A50',
  '--accent-pressed': '#E85D10',
};
const STATUS_LIGHT = {
  '--success': '#1E7A46', '--success-soft': '#DCF0E4', '--success-ink': '#14522D',
  '--warning': '#B45309', '--warning-soft': '#FCF1CD', '--warning-ink': '#6B4C0B',
  '--destructive': '#C4384A', '--destructive-soft': '#FBE3E6', '--destructive-ink': '#8C2733',
  '--info': '#3E5C76', '--info-soft': '#DFE9F0', '--info-ink': '#2A3E52',
};
const STATUS_DARK = {
  '--success': '#6FD99B', '--success-soft': '#0F2A1E', '--success-ink': '#6FD99B',
  '--warning': '#F2C48D', '--warning-soft': '#2E2610', '--warning-ink': '#F2C48D',
  '--destructive': '#F4938F', '--destructive-soft': '#301723', '--destructive-ink': '#F4938F',
  '--info': '#8FBBF2', '--info-soft': '#14263E', '--info-ink': '#8FBBF2',
};
const FAMILIES_LIGHT = {
  peach: ['#FDE8DE', '#E06A45', '#7A3018'],
  mint: ['#DCF0E4', '#1E7A46', '#14522D'],
  lavender: ['#ECEAF8', '#7C63DB', '#3F2D7A'],
  sky: ['#DFE9F0', '#3E5C76', '#2A3E52'],
  yellow: ['#FCF1CD', '#B45309', '#6B4C0B'],
  rose: ['#FBE3E6', '#C4384A', '#8C2733'],
  sand: ['#F1EEE1', '#A08A5B', '#55471F'],
  grey: ['#ECEDE7', '#6E7684', '#2F3745'],
  copper: ['#FCE3D6', '#D14900', '#8A3400'],
};
const FAMILIES_DARK = {
  peach: ['#32201A', '#F2A07F', '#FCD9C4'],
  mint: ['#0F2A1E', '#6FD99B', '#C9EAD3'],
  lavender: ['#232040', '#B7A0F4', '#DCD2F9'],
  sky: ['#14263E', '#8FBBF2', '#C9DCEE'],
  yellow: ['#2E2610', '#F2C48D', '#F8E5B5'],
  rose: ['#301723', '#F4938F', '#FACDD2'],
  sand: ['#26221A', '#D9C18C', '#EFE2C5'],
  grey: ['#1A2438', '#A9B0C8', '#D5DAE8'],
  copper: ['#38200F', '#FF9A62', '#FFC9A8'],
};
// Tailwind @theme spellings (Madarek --r-* ladder, same values; no --r-full
// token — rounded-full uses the Tailwind default)
const RADIUS = {
  '--radius-xs': '6px', '--radius-sm': '8px', '--radius-md': '10px', '--radius-lg': '12px',
  '--radius-xl': '16px', '--radius-2xl': '20px', '--radius-3xl': '28px',
};
const MOTION = {
  '--t-micro': '80ms', '--t-fast': '160ms', '--t-base': '240ms',
  '--t-slow': '380ms', '--t-slower': '520ms', '--t-cinema': '720ms',
};
const ELEV_DARK = {
  '--elev-1': '0 1px 2px rgba(0, 0, 0, 0.30), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
  '--elev-2': '0 4px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  '--elev-3': '0 8px 16px rgba(0, 0, 0, 0.40), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
  '--elev-4': '0 16px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.07)',
  '--elev-5': '0 32px 64px rgba(0, 0, 0, 0.50), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
};
const ELEV_LIGHT = {
  /* r152: daylight recipes — navy-inked soft two-layer (the ink color
     rides the elevation so paper never gets muddy grey shadows). */
  '--elev-1': '0 1px 2px rgba(27, 42, 65, 0.06), 0 1px 1px rgba(27, 42, 65, 0.04)',
  '--elev-2': '0 4px 8px rgba(27, 42, 65, 0.08), 0 2px 4px rgba(27, 42, 65, 0.05)',
  '--elev-3': '0 8px 16px rgba(27, 42, 65, 0.10), 0 4px 8px rgba(27, 42, 65, 0.06)',
  '--elev-4': '0 16px 32px rgba(27, 42, 65, 0.12), 0 8px 16px rgba(27, 42, 65, 0.07)',
  '--elev-5': '0 32px 64px rgba(27, 42, 65, 0.14), 0 16px 32px rgba(27, 42, 65, 0.08)',
};

// ── assertions ───────────────────────────────────────────────────────────────

pinAll(light, 'light', GROUNDS_LIGHT);
pinAll(dark, 'dark', GROUNDS_DARK);
pinAll(light, 'light', ACCENT_LIGHT);
pinAll(dark, 'dark', ACCENT_DARK);
pinAll(light, 'light', STATUS_LIGHT);
pinAll(dark, 'dark', STATUS_DARK);
pin(light, 'glass-light', '--glass-bg', 'rgba(247, 247, 244, 0.82)');
pin(dark, 'glass-dark', '--glass-bg', 'rgba(13, 22, 38, 0.80)');

for (const [family, [bg, ink, deep]] of Object.entries(FAMILIES_DARK)) {
  pin(dark, 'family-dark', `--c-${family}-bg`, bg);
  pin(dark, 'family-dark', `--c-${family}-ink`, ink);
  pin(dark, 'family-dark', `--c-${family}-deep`, deep);
}
for (const [family, [bg, ink, deep]] of Object.entries(FAMILIES_LIGHT)) {
  pin(light, 'family-light', `--c-${family}-bg`, bg);
  pin(light, 'family-light', `--c-${family}-ink`, ink);
  pin(light, 'family-light', `--c-${family}-deep`, deep);
}

// radius ladder lives in the Tailwind @theme block (theme-independent)
pinAll(theme, 'radius(@theme)', RADIUS);
// motion is theme-independent (:root) — assert in both scopes
for (const scope of [dark, light]) {
  pinAll(scope, 'motion', MOTION);
}
pinAll(light, 'elev-light', ELEV_LIGHT);
pinAll(dark, 'elev-dark', ELEV_DARK);

// ── r126 pins: focus contract + z-order ladder (audit P4-A5 ring gap) ───────
// The light --ring was raw copper #B57438 = 3.65:1 (FAIL); the Madarek
// contract (rubric §B23) requires ≥4.5:1 in BOTH themes. The 2px/2px ring
// rides --state-focus-ring-* tokens, mirrored by the shadcn --ring bridge.
/* r152: the ring contract re-anchored — daylight rides the orange-deep
   text accent #8A3400 (7.5:1 on paper); night dispatch rides the
   luminous orange text tier #FFA170 (9.0:1 on the night ground). Both
   clear the 4.5:1 floor with margin. */
const FOCUS_LIGHT = {
  '--ring': '#8A3400',
  '--state-focus-ring-color': '#8A3400',
  '--state-focus-ring-width': '2px',
  '--state-focus-ring-offset': '2px',
};
const FOCUS_DARK = {
  '--ring': '#FFA170',
  '--state-focus-ring-color': '#FFA170',
  '--state-focus-ring-width': '2px',
  '--state-focus-ring-offset': '2px',
};
pinAll(light, 'focus-light', FOCUS_LIGHT);
pinAll(dark, 'focus-dark', FOCUS_DARK);

// Z-order ladder (Madarek tokens.css §3a, theme-independent :root tokens)
const Z_LADDER = {
  '--z-base': '0',
  '--z-dropdown': '100',
  '--z-popover': '200',
  '--z-tooltip': '250',
  '--z-sheet': '300',
  '--z-modal': '400',
  '--z-toast': '500',
  '--z-lightbox': '600',
};
for (const scope of [dark, light]) {
  pinAll(scope, 'z-ladder', Z_LADDER);
}

// Default transition bridge (@theme): every bare transition-* utility rides
// the ladder (160ms = --t-fast) + the canonical settle curve.
pin(theme, 'motion(@theme)', '--default-transition-duration', '160ms');
pin(theme, 'motion(@theme)', '--default-transition-timing-function', 'cubic-bezier(0.16, 1, 0.3, 1)');

// ── r126 consumption gates — existence pins cannot catch dead tokens ────────
// (The r125 audit proved it: the motion ladder passed 131/131 with ZERO
// consumers. These assert the tokens are actually wired.)
const rawCss = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8').replace(/\s+/g, ' ');
const rawButton = readFileSync(new URL('../src/components/ui/button.tsx', import.meta.url), 'utf8');
const rawDialog = readFileSync(new URL('../src/components/ui/dialog.tsx', import.meta.url), 'utf8');
const rawSheet = readFileSync(new URL('../src/components/ui/sheet.tsx', import.meta.url), 'utf8');
const rawSwitch = readFileSync(new URL('../src/components/ui/switch.tsx', import.meta.url), 'utf8');
const rawSonner = readFileSync(new URL('../src/components/ui/sonner.tsx', import.meta.url), 'utf8');
const rawProviders = readFileSync(new URL('../src/app/providers.tsx', import.meta.url), 'utf8');
const rawThemeColorSync = readFileSync(new URL('../src/components/theme-color-sync.tsx', import.meta.url), 'utf8');
const rawNextConfig = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');
const rawDropdown = readFileSync(new URL('../src/components/ui/dropdown-menu.tsx', import.meta.url), 'utf8');
const rawInput = readFileSync(new URL('../src/components/ui/input.tsx', import.meta.url), 'utf8');
const CONSUMPTION = [
  ['globals :focus-visible consumes --state-focus-ring-* (the ONE focus language)',
    /outline: var\(--state-focus-ring-width, 2px\) solid var\(--state-focus-ring-color, var\(--ring\)\)/.test(rawCss) &&
    rawCss.includes('outline-offset: var(--state-focus-ring-offset, 2px)')],
  ['sonner toaster pinned to the --z-toast rung',
    rawCss.includes('[data-sonner-toaster]') && rawCss.includes('z-index: var(--z-toast)')],
  ['button consumes the motion ladder (duration-(--t-fast) + ease-smooth + the micro press tier)',
    rawButton.includes('duration-(--t-fast)') && rawButton.includes('ease-smooth') &&
    rawButton.includes('active:duration-(--t-micro)')],
  ['dialog consumes the motion + z ladders (duration-(--t-base) + z-(--z-modal))',
    rawDialog.includes('duration-(--t-base)') && rawDialog.includes('z-(--z-modal)')],
  // P4-W3c (B1): the three recipe gates the P4-F5b follow-up named —
  // sheet, dropdown, input join button/dialog at the consumption table.
  // r131 (F1, A5 P1-4): sheet open duration snapped --t-slow 380ms →
  // --t-base 240ms (canonical sheet rung, madarek .sheet-panel rides
  // --motion-duration-medium = 240ms) — BOTH directions now t-base.
  ['sheet consumes the motion + z ladders (z-(--z-sheet) + duration-(--t-base) both directions + ease-smooth)',
    rawSheet.includes('z-(--z-sheet)') && rawSheet.includes('duration-(--t-base)') &&
    rawSheet.includes('data-[state=open]:duration-(--t-base)') && rawSheet.includes('ease-smooth')],
  ['dropdown-menu consumes the z ladder + elevation bridge (z-(--z-dropdown) + rounded-md + shadow-md)',
    rawDropdown.includes('z-(--z-dropdown)') && rawDropdown.includes('rounded-md') &&
    rawDropdown.includes('shadow-md')],
  ['input consumes the motion ladder + the token-based focus halo (duration-(--t-fast) + --state-input-focus-halo + accent border)',
    rawInput.includes('duration-(--t-fast)') &&
    rawInput.includes('focus-visible:shadow-(--state-input-focus-halo)') &&
    rawInput.includes('focus-visible:border-primary')],
];
for (const [name, okFlag] of CONSUMPTION) {
  if (okFlag) passed += 1;
  else failures.push(`consumption gate FAILED: ${name}`);
}

// ── r131 (F1) canon gates — the r131 re-base laws, pinned so a future ───────
// edit cannot silently regress them (same shape as the r126 consumption
// gates: raw source gates, not existence pins).
const R131_F1 = [
  // Switch: RTL thumb mirror (A12 #1 — the physical +translate pushed the
  // checked thumb OFF the track under dir=rtl).
  ['switch thumb carries the rtl: mirror (SM/SB fleet pattern)',
    rawSwitch.includes('data-[state=checked]:rtl:-translate-x-[calc(100%-2px)]')],
  ['switch ships a ≥44px hit target (SM pseudo-hit pattern, after:-inset-*)',
    rawSwitch.includes("after:-inset-x-1.5") && rawSwitch.includes("after:-inset-y-3.2") &&
    rawSwitch.includes("after:content-['']")],
  // Sheet: logical sides only — no physical placement/border utilities.
  ['sheet sides are LOGICAL (no physical right-0/left-0/border-l/border-r; docks end-0/start-0)',
    !rawSheet.includes('right-0') && !rawSheet.includes('left-0') &&
    !rawSheet.includes('border-l') && !rawSheet.includes('border-r') &&
    rawSheet.includes('end-0') && rawSheet.includes('start-0')],
  ['sheet canonical geometry (min(420px,90vw) width + r-2xl leading corners + end-4 close + 4px scrim)',
    rawSheet.includes('w-[min(420px,90vw)]') && rawSheet.includes('rounded-s-2xl') &&
    rawSheet.includes('rounded-e-2xl') && rawSheet.includes('end-4') &&
    rawSheet.includes('backdrop-blur-[4px]')],
  ['sheet grabber handle (madarek .sheet-grabber) + legacy side aliases preserved',
    rawSheet.includes('SheetGrabber') && rawSheet.includes('side === "left" ? "end"')],
  // Toaster: quiet canon — unstyled skin in globals, error manual-dismiss.
  ['toaster rides unstyled mode at the dir-aware bottom-END (no richColors)',
    rawSonner.includes('unstyled') && !rawSonner.includes('richColors') &&
    rawSonner.includes('bottom-left')],
  ['error toasts are manual-dismiss (toast.error widened to Infinity; rest 6s)',
    rawSonner.includes('duration: Infinity') && rawSonner.includes('duration={6000}')],
  ['globals owns the quiet toast card (status hairline inline-start + 28px pastel well + surface bg + elev)',
    rawCss.includes('border-inline-start-color: var(--destructive)') &&
    rawCss.includes('background: var(--toast-well-bg, var(--accent-soft))') &&
    rawCss.includes('inline-size: 28px') &&
    rawCss.includes('box-shadow: var(--elev-3)')],
  // Print: paper forces the light palette (dark ink printed near-white).
  ['print block forces the LIGHT palette (color-scheme light + pastel families on :root/.dark/.light)',
    rawCss.includes('@media print {') &&
    rawCss.includes(':root, .dark, .light { color-scheme: light;')],
  // Providers: root MotionConfig + lazy toaster + theme-color sync.
  ['root MotionConfig reducedMotion="user" (promoted from the dashboard shell)',
    rawProviders.includes('reducedMotion="user"')],
  ['toaster lazy-mounted out of the critical path (dynamic ssr:false)',
    rawProviders.includes('ssr: false') && !rawProviders.includes('Toaster position=')],
  ['theme-color metas follow the manual toggle (r152 daylight pair: paper #F7F7F4 / night #0D1626)',
    rawThemeColorSync.includes('{ dark: "#0D1626", light: "#F7F7F4" } as const') &&
    rawThemeColorSync.includes('meta[name="theme-color"]')],
  // Fonts: immutable 1y cache header (A8 perf).
  ['fonts served immutable (1y) — smart-link/smart-menu pattern',
    rawNextConfig.includes('/fonts/:path*') &&
    rawNextConfig.includes('public, max-age=31536000, immutable')],
];
for (const [name, okFlag] of R131_F1) {
  if (okFlag) passed += 1;
  else failures.push(`r131 F1 gate FAILED: ${name}`);
}

// ── P4-W3c (B2): FAMILY_WIRING — the semantic layer must chain through ──────
// the pastel families (Smart-Menu's SSOT idiom). Pins prove the VALUES;
// these raw-declaration gates prove the CHAIN SHAPE, so a future edit
// that re-duplicates a literal (forking the family from the status
// tokens) fails parity. rawCss is whitespace-collapsed → the spellings
// below match single-space source formatting.
function occurrences(needle) {
  return rawCss.split(needle).length - 1;
}
const FAMILY_WIRING = [
  ['status base+text chain through mint/yellow/sky/rose -ink in BOTH themes (8 chains)',
    ['--success: var(--c-mint-ink)', '--warning: var(--c-yellow-ink)',
     '--info: var(--c-sky-ink)', '--destructive: var(--c-rose-ink)',
     '--success-ink: var(--c-mint-deep)', '--warning-ink: var(--c-yellow-deep)',
     '--info-ink: var(--c-sky-deep)', '--destructive-ink: var(--c-rose-deep)']
      .map(occurrences)
      .reduce((a, b) => a + b, 0) === 8 + 4], // 4 identical in both themes + 4 -deep light-only
  ['status soft grounds chain through the family -bg slots in BOTH themes (8 chains)',
    ['--success-soft: var(--c-mint-bg)', '--warning-soft: var(--c-yellow-bg)',
     '--info-soft: var(--c-sky-bg)', '--destructive-soft: var(--c-rose-bg)']
      .map(occurrences)
      .reduce((a, b) => a + b, 0) === 8],
  ['charts chain through the family -ink slots in BOTH themes (10 chains)',
    ['--chart-1: var(--c-copper-ink)', '--chart-2: var(--c-mint-ink)', '--chart-3: var(--c-sky-ink)',
     '--chart-4: var(--c-rose-ink)', '--chart-5: var(--c-lavender-ink)']
      .map(occurrences)
      .reduce((a, b) => a + b, 0) === 10],
  ['accent chains through the copper family in BOTH themes (accent-foreground ×2 + accent-soft ×2)',
    occurrences('--accent-foreground: var(--c-copper-ink)') === 1 &&
    occurrences('--accent-foreground: var(--c-copper-deep)') === 1 &&
    occurrences('--accent-soft: var(--c-copper-bg)') === 2],
];
for (const [name, okFlag] of FAMILY_WIRING) {
  if (okFlag) passed += 1;
  else failures.push(`family wiring gate FAILED: ${name}`);
}

// ── r127 (F7): whatsapp ink — the last raw-hex straggler, tokenized ─────────
// The external brand block is theme-independent by definition (WhatsApp
// green + its dark on-green ink are the same in dark and light), so BOTH
// theme blocks carry the trio and the @theme bridge maps it into Tailwind
// (text-whatsapp-foreground). The old spelling text-[#07361d] is banned:
// a raw hex beside token-based utilities is exactly the drift the
// 131→195 suite exists to prevent (audit r127-A4, systemic #1).
const WHATSAPP_INK = [
  ['whatsapp ink: --whatsapp-foreground == #07361d in BOTH themes + the @theme bridge --color-whatsapp-foreground',
    norm(resolve(dark, dark['--whatsapp-foreground'] ?? '')) === '#07361D' &&
    norm(resolve(light, light['--whatsapp-foreground'] ?? '')) === '#07361D' &&
    norm(theme['--color-whatsapp-foreground'] ?? '') === 'var(--whatsapp-foreground)'],
  ['button whatsapp variant consumes the token (text-(--whatsapp-foreground)) — zero raw hex in button.tsx',
    rawButton.includes('text-(--whatsapp-foreground)') &&
    !/#[0-9a-fA-F]{3,8}\b/.test(rawButton)],
];
for (const [name, okFlag] of WHATSAPP_INK) {
  if (okFlag) passed += 1;
  else failures.push(`whatsapp ink gate FAILED: ${name}`);
}

// ── r128-F8 (B25): LANDING LAYER — pin the Orbit-Ink world in landing.css ────
// The landing layer is deliberately SEPARATE from globals.css (R4: product
// pins untouched). These pins read src/app/landing.css: the .landing token
// block (PORT-KIT §1 verbatim — canonical madarek tokens.css values), the
// marquee kit (§3: 48px gap + the +24px HALF-gap seam correction + 42s
// linear loop + the RM off-switch), the --sp scrub consumers, the R2-form
// scroll-spy selectors, the .ln-grain veil, and the scope contract itself.
// var() chains resolve against the REAL cascade: .landing overlays :root.
const landingCssRaw = readFileSync(new URL('../src/app/landing.css', import.meta.url), 'utf8');
const landingBlocks = topLevelBlocks(landingCssRaw.replace(/\/\*[\s\S]*?\*\//g, ' '));
const landingBody = landingBlocks.find((x) => x.prelude === '.landing')?.body;
if (!landingBody) throw new Error('.landing top-level block not found in landing.css');
const landingScope = { ...light, ...parseDecls(landingBody) };
const landingRaw = landingCssRaw.replace(/\s+/g, ' ');
/* r152: the landing layer re-anchored to the SAME daylight contract —
   Orbit-Ink retired. Role map: --ln-ink = paper GROUND (+ on-accent
   text), --ln-cream = navy INK, --ln-lime = delivery orange,
   --ln-violet = steel. The landing stays a FIXED world (theme-locked
   LIGHT now — .landing carries no .dark overrides by design). */
const LANDING_TOKENS = {
  '--ln-ink': '#F7F7F4',
  '--ln-ink-2': '#EFEFEA',
  '--ln-cream': '#1B2A41',
  '--ln-cream-dim': '#4E5A6E',
  '--ln-lime': '#D14900',
  '--ln-lime-deep': '#B23E00',
  '--ln-violet': '#3E5C76',
  '--ln-violet-deep': '#2A3E52',
  '--ln-line': 'rgba(27, 42, 65, 0.14)',
  '--ln-line-soft': 'rgba(27, 42, 65, 0.07)',
  '--ln-grain-op': '0.05',
  '--ln-radius-pill': '9999px', // resolves the scoped --r-full bridge
  '--ln-h1': 'clamp(2.75rem, 8.2vw, 6.75rem)',
  // r151 (LIVE-AUDIT-SO1 P2-2): the nail rides the licensed floor change —
  // hero Arabic leading 1.04 → 1.15 (the family Arabic heading floor,
  // r131-F2; live audit measured 88px/91.52px clashing diacritics).
  '--ln-h1-lh': '1.15',
  '--ln-t-fast': '160ms',
  '--ln-t-base': '240ms',
  '--ln-t-slow': '380ms',
  '--ln-t-cinema': '720ms',
  '--ln-t-reveal': '360ms',
  '--ln-ease': 'cubic-bezier(0.4, 0, 0.2, 1)',
  '--ln-ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
  '--ln-ease-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
  '--ln-ease-spring': 'cubic-bezier(0.34, 1.36, 0.64, 1)',
  '--ln-ease-linear': 'linear',
  '--ln-dur-marquee': '42s',
};
for (const [token, value] of Object.entries(LANDING_TOKENS)) {
  pin(landingScope, 'landing', token, value);
}
const LANDING_LAYER = [
  ['marquee keyframes: from translateX(0) → to translateX(calc(50% + 24px)) — the HALF-gap seam correction',
    /@keyframes ln-marquee \{ from \{ transform: translateX\(0\); \} to \{ transform: translateX\(calc\(50% \+ 24px\)\); \} \}/.test(landingRaw)],
  ['marquee track geometry: 48px column gap (seam = exactly HALF the gap)',
    /\.landing \.ln-marquee-track \{[^}]*gap: 48px;/.test(landingRaw)],
  ['marquee loop: ln-marquee var(--ln-dur-marquee) var(--ln-ease-linear) infinite',
    /animation: ln-marquee var\(--ln-dur-marquee\) var\(--ln-ease-linear\) infinite;/.test(landingRaw)],
  ['marquee RM off-switch: prefers-reduced-motion sets the track animation to none',
    /@media \(prefers-reduced-motion: reduce\) \{ \.landing \.ln-marquee-track \{ animation: none; \}/.test(landingRaw)],
  ['--sp consumer: journey light path scrubs stroke-dashoffset calc(1 - var(--sp, 0))',
    landingRaw.includes('stroke-dashoffset: calc(1 - var(--sp, 0));')],
  ['scroll-spy in R2 form: header[data-active-section] selectors cover all six landing ids',
    ['trust', 'sectors', 'journey', 'progress', 'venues', 'roles'].every(
      (id) => landingRaw.includes(`header[data-active-section="${id}"]`),
    )],
  ['.ln-grain veil present (the --ln-grain-op consumer)',
    /\.landing \.ln-grain \{/.test(landingRaw)],
  ['landing scope isolation: globals.css carries ZERO --ln-* declarations (R4 — product pins untouched)',
    !/--ln-[\w-]+\s*:/.test(rawCss)],
  ['landing scope isolation (negative): the Orbit-Ink ground tokens stay out of :root (no --ln-ink / --ln-cream in globals.css)',
    !rawCss.includes('--ln-ink') && !rawCss.includes('--ln-cream')],
];
for (const [name, okFlag] of LANDING_LAYER) {
  if (okFlag) passed += 1;
  else failures.push(`landing layer gate FAILED: ${name}`);
}

// ── P9-3-d (E3): the landing NIGHT DISPATCH stage — dark pins ───────────────
// The dark landing rides the app's REAL class convention: next-themes
// attribute="class" + the pre-paint boot in layout.tsx toggle .dark/.light
// on <html>; globals.css gates its own night dispatch on .dark. The landing
// token twin gates on html.dark .landing (specificity (0,2,1) > the daylight
// .landing (0,1,0) — value flip, zero edits to the daylight rules above).
// Additive pins only: every daylight pin above still passes byte-identical.
const landingDarkBody = landingBlocks.find((x) => x.prelude === 'html.dark .landing')?.body;
if (!landingDarkBody) throw new Error('html.dark .landing top-level block not found in landing.css (P9-3-d dark stage missing)');
const landingDarkScope = { ...dark, ...parseDecls(landingDarkBody) };
const LANDING_DARK_TOKENS = {
  /* night ground family — the globals.css night dispatch values */
  '--ln-ink': '#0D1626',       // night ground
  '--ln-ink-2': '#152238',     // raised navy surface
  '--ln-cream': '#F1F0EA',     // paper ink — 15.8:1 AAA
  '--ln-cream-dim': '#B9C2D2', // night secondary — 10.1:1 AAA
  /* the luminous orange tier (globals night --primary): 7.0:1 text on
     ground / 7.0:1 as on-fill ink — daylight #D14900 measures 4.0:1 (below the floor) */
  '--ln-lime': '#FF7A38',
  '--ln-lime-deep': '#FF8A50', // night hover BRIGHTENS (globals accent-hover)
  /* luminous steel — daylight #3E5C76 is 2.3:1 on the night ground */
  '--ln-violet': '#8FBBF2',    // 9.1:1
  /* pale navy hairlines */
  '--ln-line': 'rgba(185, 194, 210, 0.16)',
  '--ln-line-soft': 'rgba(185, 194, 210, 0.08)',
  '--ln-grain-op': '0.03',     // white-speck grain at whisper opacity
  /* §15a hazard trio — the night text tiers */
  '--ln-amber': '#F2C48D',     // luminous road-sign amber — 11.3:1
  '--ln-danger': '#F4938F',    // luminous rose — 8.1:1
  '--ln-danger-deep': '#FFB4AF',
  /* night glass: raised navy at the glass alphas */
  '--ln-glass': 'rgba(21, 34, 56, 0.72)',
  '--ln-glass-strong': 'rgba(21, 34, 56, 0.90)',
};
for (const [token, value] of Object.entries(LANDING_DARK_TOKENS)) {
  pin(landingDarkScope, 'landing-dark', token, value);
}

const landingHeaderSrc = readFileSync(new URL('../src/components/landing/LandingHeader.tsx', import.meta.url), 'utf8');
const heroDepthSrc = readFileSync(new URL('../src/components/landing/HeroDepthLayer.tsx', import.meta.url), 'utf8');
const globalErrorSrc = readFileSync(new URL('../src/app/global-error.tsx', import.meta.url), 'utf8');
const LANDING_DARK_LAYER = [
  ['dark gate rides the REAL class convention (html.dark .landing — mirrors globals.css .dark; next-themes attribute="class")',
    landingBlocks.some((x) => x.prelude === 'html.dark .landing')],
  ['dark grain twin: white speck (feColorMatrix rows → 1) under html.dark — black noise would vanish on navy',
    /html\.dark \.landing \.ln-grain \{[^}]*background-image: url\("data:image\/svg\+xml,[^"]*0 0 0 0 1 0 0 0 0 1 0 0 0 0 1/.test(landingCssRaw)],
  ['dark scrolled rail twin: rgb(13 22 38 / 0.92) — the night ground at the 92% spec',
    /html\.dark \.landing \.landing-header\.scrolled \{ background: rgb\(13 22 38 \/ 0\.92\); \}/.test(landingRaw)],
  ['dark roadmark twin: raised-navy sign glass rgba(21, 34, 56, 0.85) — white 0.85 would blast at night',
    /html\.dark \.landing \.ln-roadmark \{ background: rgba\(21, 34, 56, 0\.85\); \}/.test(landingRaw)],
  ['dark station-sign twin: raised-navy chip rgba(21, 34, 56, 0.70)',
    /html\.dark \.landing \.ln-station-sign \{ background: rgba\(21, 34, 56, 0\.70\); \}/.test(landingRaw)],
  ['dark dash-roles twin: raised-navy card glass rgba(21, 34, 56, 0.78)',
    /html\.dark \.landing \.ln-dash-roles \{ background: rgba\(21, 34, 56, 0\.78\); \}/.test(landingRaw)],
  ['dark selection twin: luminous steel + night ink (the daylight violet-deep + ink pair breaks dark-on-dark)',
    /html\.dark \.landing ::selection \{ background: #8FBBF2; color: #0D1626; \}/.test(landingRaw)],
  ['dark ghost-pill twin: pale hairline rgb(185 194 210 / 0.30) — the navy 0.34 hairline vanishes on navy',
    /html\.dark \.landing \.ln-btn-ghost \{[^}]*border: 1px solid rgb\(185 194 210 \/ 0\.30\);/.test(landingRaw)],
  ['dark accent washes ride the LUMINOOUS orange (rgba(255, 122, 56, ·) — the daylight 209,73,0 tints dim to mud on navy)',
    /html\.dark \.landing \.ln-station-node\.is-active \{ background: rgba\(255, 122, 56, 0\.08\); \}/.test(landingRaw) &&
    /html\.dark \.landing \.ln-dash-action:hover \{ background: rgba\(255, 122, 56, 0\.12\); \}/.test(landingRaw) &&
    /html\.dark \.landing \.ln-pay-ico \{ background: rgba\(255, 122, 56, 0\.11\); \}/.test(landingRaw)],
  ['dark keep-pill twin: night ground glass rgb(13 22 38 / 0.55)',
    /html\.dark \.landing \.ln-keep-pill \{ background: rgb\(13 22 38 \/ 0\.55\); \}/.test(landingRaw)],
  ['dark quiet cells: pale washes (fulfillment/items/pay-fact ride rgba(185, 194, 210, 0.05))',
    /html\.dark \.landing \.ln-dash-fulfillment \{ background: rgba\(185, 194, 210, 0\.05\); \}/.test(landingRaw) &&
    /html\.dark \.landing \.ln-pay-fact \{ background: rgba\(185, 194, 210, 0\.05\); \}/.test(landingRaw)],
  ['dark FAQ item twin: pale wash rgb(185 194 210 / 0.03)',
    /html\.dark \.landing \.ln-faq-item \{ background: rgb\(185 194 210 \/ 0\.03\); \}/.test(landingRaw)],
  ['E3 toggle wiring: LandingHeader imports the family ThemeToggle (shared component, no fork)',
    landingHeaderSrc.includes('import { ThemeToggle } from "@/components/shared/theme-toggle";')],
  ['E3 toggle wiring: the toggle rides its own .landing-header-tools slot AFTER the burger (end-of-rail; survives the ≤1080px CTA hide)',
    /<div className="landing-header-tools">\s*<ThemeToggle \/>\s*<\/div>/.test(landingHeaderSrc) &&
    landingHeaderSrc.indexOf('className="landing-header-tools"') > landingHeaderSrc.indexOf('className="landing-burger"')],
  ['E3 hero depth layer: waypoints paint currentColor (theme-blind fix — the hardcoded navy fill is gone)',
    heroDepthSrc.includes('fill="currentColor"') && !heroDepthSrc.includes('fill="rgba(27,42,65,0.5)")')],
  ['E3 hero depth layer: both stages owned in CSS — daylight keeps the byte-identical ink, night points to pale ink',
    /\.landing \.ln-hero-depth \{ color: rgba\(27, 42, 65, 0\.5\); \}/.test(landingRaw) &&
    /html\.dark \.landing \.ln-hero-depth \{ color: rgba\(185, 194, 210, 0\.5\); \}/.test(landingRaw)],
  ['E5 emoji ban (global-error): the warning glyph is an inline lucide-style SVG, zero emoji code points in the file',
    globalErrorSrc.includes('<svg') && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(globalErrorSrc)],
];
for (const [name, okFlag] of LANDING_DARK_LAYER) {
  if (okFlag) passed += 1;
  else failures.push(`landing dark-stage gate FAILED: ${name}`);
}

// ── P4-W3c (B1): the ≥1-consumer tripwire ────────────────────────────────────
// Audit systemic #1: pinned tokens drifted into dead definitions. Every
// pinned token in the four high-traffic families must have ≥1 REAL
// consumer somewhere in src/ — a var()/arbitrary-utility reference or a
// @theme bridge in globals.css, or a spelling in product code
// (z-(--z-modal), duration-(--t-fast), rounded-xl …). Declarations
// (`--x:`) and the reduced-motion re-declarations do NOT count.
const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(join(dir, entry.name), out);
    else if (/\.(tsx?|css)$/.test(entry.name)) out.push(join(dir, entry.name));
  }
  return out;
}
const corpus = [rawCss];
const codeTexts = [];
for (const f of walk(srcRoot)) {
  if (f.endsWith('globals.css')) continue; // already in corpus as rawCss
  codeTexts.push(readFileSync(f, 'utf8'));
}
function consumerCount(name) {
  const any = new RegExp(`${name}(?![\\w-])`, 'g');
  const decl = new RegExp(`${name}(?![\\w-])\\s*:`, 'g');
  let count = 0;
  for (const text of corpus.concat(codeTexts)) {
    count += (text.match(any) || []).length - (text.match(decl) || []).length;
  }
  return count;
}
function utilityCount(spelling) {
  const re = new RegExp(`${spelling}(?![\\w-])`, 'g');
  let count = 0;
  for (const text of codeTexts) count += (text.match(re) || []).length;
  return count;
}
const TRIPWIRE = [
  // backgrounds — the ground/surface slots (each must stay bridged or
  // directly consumed)
  ...['--background', '--card', '--popover', '--secondary', '--muted']
    .map((t) => [`backgrounds: ${t} has ≥1 consumer`, consumerCount(t) >= 1]),
  // foregrounds — every ink slot incl. the rare --placeholder-text
  ...['--foreground', '--card-foreground', '--popover-foreground', '--secondary-foreground',
      '--muted-foreground', '--placeholder-text', '--primary-foreground', '--accent-foreground']
    .map((t) => [`foregrounds: ${t} has ≥1 consumer`, consumerCount(t) >= 1]),
  // radius — @theme rungs consumed via rounded-* utilities (3xl is the
  // documented RESERVED rung — see the header; it stays pinned, not
  // tripwired)
  ...[['--radius-xs', 'rounded-xs'], ['--radius-sm', 'rounded-sm'], ['--radius-md', 'rounded-md'],
      ['--radius-lg', 'rounded-lg'], ['--radius-xl', 'rounded-xl'], ['--radius-2xl', 'rounded-2xl']]
    .map(([t, u]) => [`radius: ${t} has ≥1 consumer (rounded-* utility or var())`,
      utilityCount(u) + consumerCount(t) >= 1]),
  // motion — the full --t-* ladder incl. the micro press tier
  ...['--t-micro', '--t-fast', '--t-base', '--t-slow', '--t-slower', '--t-cinema']
    .map((t) => [`motion: ${t} has ≥1 consumer`, consumerCount(t) >= 1]),
];
for (const [name, okFlag] of TRIPWIRE) {
  if (okFlag) passed += 1;
  else failures.push(`consumer tripwire FAILED: ${name}`);
}

// ── r129 (F4): MASTER var()-RESOLVER GATE ─────────────────────────────────────
// The r129-A7 audit's process finding: 231/231 pins were green while 7
// bridge tokens consumed by 46 var() sites were defined NOWHERE — value
// pins can never catch an unresolvable var() chain. This gate extracts
// EVERY var() reference from landing.css and asserts each resolves in
// the served token blocks (landing.css ∪ globals.css ∪ public/fonts/
// fonts.css declarations, any selector scope — declarations inside
// media queries count too). Whitelist: the runtime-set element vars
// written imperatively by hooks/components (--p/--sp scroll progress,
// --mag-x/--mag-y magnetic, --dot/--ln-ci/--ln-ri constellation,
// --m milestone thresholds) — those are element-level by design.
{
  const fontsCss = (() => {
    try {
      return readFileSync(new URL('../public/fonts/fonts.css', import.meta.url), 'utf8');
    } catch {
      return '';
    }
  })();
  const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const definedNames = new Map();
  for (const text of [stripComments(css), stripComments(landingCssRaw), stripComments(fontsCss)]) {
    for (const m of text.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      if (!definedNames.has(m[1])) definedNames.set(m[1], m[2].trim());
    }
  }
  const RUNTIME_VARS = new Set([
    '--p', '--sp', '--m', '--mag-x', '--mag-y', '--dot', '--ln-ci', '--ln-ri',
  ]);
  const refs = new Map(); // name -> count
  for (const m of stripComments(landingCssRaw).matchAll(/var\(\s*(--[\w-]+)/g)) {
    refs.set(m[1], (refs.get(m[1]) ?? 0) + 1);
  }
  const unresolved = [...refs.keys()].filter((n) => !definedNames.has(n) && !RUNTIME_VARS.has(n));
  const totalRefs = [...refs.values()].reduce((a, b) => a + b, 0);
  if (unresolved.length === 0 && totalRefs > 0) {
    passed += 1; // the gate itself — one pin: 0 undefined / all resolved
  } else {
    failures.push(
      `resolver gate FAILED: ${unresolved.length} undefined var() name(s) in landing.css [${unresolved.join(', ')}] — ${totalRefs} total references checked`,
    );
  }
}

// ── r129 (F4): the 7 bridge-value pins (the P0 cluster, now defined) ─────────
// Mirrored from smart-link landing.css:60-83 (canonical madarek values).
// Each was referenced-but-undefined at r128 (46 consumer sites rendering
// 0/none) — these pins pin the DEFINITION so the drift can never return.
const BRIDGE_TOKENS = {
  '--sp-3': '12px',   // tokens.css:19 — 14 refs
  '--sp-4': '16px',   // tokens.css:19 — 16 refs
  '--sp-7': '32px',   // tokens.css:20 — station-card padding
  '--sp-8': '40px',   // tokens.css:20 — constellation gaps
  '--r-2xl': '20px',  // tokens.css:35 — 6 border-radius sites
  '--page-gutter-mobile': '20px', // tokens.css:358 — ≤920px chapter gutters
  '--motion-duration-ambient-scene': '22s', // tokens.css:209 — finale converge
};
for (const [token, value] of Object.entries(BRIDGE_TOKENS)) {
  pin(landingScope, 'bridge', token, value);
}

// ── r129 (F4): landing-layer raw gates (tactile + canvas + constellation) ───
const R129_LAYER = [
  ['finale o2 converge consumes the ambient-scene duration (the dead-verb fix)',
    landingRaw.includes('animation: ln-cta-converge var(--motion-duration-ambient-scene)')],
  ['canvas keyframes: ln-scene-in → opacity 1 (literal end-state, no var() inside)',
    landingRaw.includes('@keyframes ln-scene-in { to { opacity: 1; } }')],
  ['canvas keyframes: ln-scene-in-dim → opacity 0.35 (the ≤768px dim ceiling)',
    landingRaw.includes('@keyframes ln-scene-in-dim { to { opacity: 0.35; } }')],
  ['canvas base rule: .ln-hero-canvas carries the 380ms/+160ms entrance over --ln-t-slow/--ln-t-fast',
    /animation: ln-scene-in var\(--ln-t-slow\) var\(--ln-ease-out\) var\(--ln-t-fast\) forwards;/.test(landingRaw)],
  ['returning-visitor calm: [data-intro-seen] shortens the canvas entrance to --ln-t-fast/zero delay',
    /\.landing\[data-intro-seen='true'\] \.ln-hero-canvas \{ animation-duration: var\(--ln-t-fast\); animation-delay: 0s; \}/.test(landingRaw)],
  ['::selection rides the steel depth pair (r152 daylight: steel bg + paper text)',
    /\.landing ::selection \{ background: var\(--ln-violet-deep\); color: var\(--ln-ink\); \}/.test(landingRaw)],
  ['press states P4-01: gold/ghost/text compress to --press-scale over the micro tier',
    /\.landing \.ln-btn-gold:active, \.landing \.ln-btn-ghost:active, \.landing \.ln-btn-text:active \{ transform: scale\(var\(--press-scale, 0\.97\)\); transition-duration: var\(--t-micro\); \}/.test(landingRaw)],
  ['press states P4-01 magnetic variant: gold preserves its translate while pressing',
    /\.landing \.ln-btn-gold:active \{ transform: translate\(var\(--mag-x, 0\), var\(--mag-y, 0\)\) scale\(var\(--press-scale, 0\.97\)\); \}/.test(landingRaw)],
  ['RM press form P4-07: scale disabled, lime-deep active tint stays',
    /\.landing \.ln-btn-gold:active, \.landing \.ln-btn-ghost:active, \.landing \.ln-btn-text:active \{ transform: none; background: var\(--ln-lime-deep\); \}/.test(landingRaw)],
  ['footer link hover underline P4-13: 2px thickness, 4px offset',
    landingRaw.includes('text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px;')],
  ['mobile drawer safe-area P4-06: padding-block-end rides env(safe-area-inset-bottom, --sp-4)',
    landingRaw.includes('padding-block-end: env(safe-area-inset-bottom, var(--sp-4));')],
  ['resting card shadows P3-28/30/35: station/stat/role carry 0 1px 2px rgba(0,0,0,0.06) (3 sites)',
    landingRaw.split('box-shadow: 0 1px 2px rgba(0,0,0,0.06);').length - 1 === 3],
  ['progress visual resting hairline P3-29 (r152): inset 0 1px 0 rgba(27,42,65,0.04)',
    landingRaw.includes('box-shadow: inset 0 1px 0 rgba(27,42,65,0.04);')],
  ['cta-lede measure P4-10 resolved tail: 72ch (was 54ch)',
    /\.landing \.ln-cta-lede \{[^}]*max-inline-size: 72ch;/.test(landingRaw)],
  ['burger fold at the canonical 1080px (was 1024) + the min-1081 drawer guard',
    /@media \(max-width: 1080px\) \{ \.landing \.landing-nav-links \{ display: none; \}/.test(landingRaw) &&
    /@media \(min-width: 1081px\) \{ \.landing \.landing-mobile-menu \{ display: none !important; \}/.test(landingRaw)],
  ['universal cream focus ring: .landing :focus-visible 2px/3px (no product gold leak)',
    /\.landing :focus-visible \{ outline: 2px solid var\(--ln-cream\); outline-offset: 3px; \}/.test(landingRaw)],
  ['focus restores P4-09 (r152): the accent pill takes the NAVY ring (paper would vanish on the paper ground)',
    /\.landing \.ln-btn-gold:focus-visible \{ outline-color: var\(--ln-cream\); \}/.test(landingRaw)],
  ['hero sky: the ONE sanctioned steel depth radial rgb(62 92 118 / 0.10) (r152 daylight)',
    landingRaw.includes('radial-gradient(46% 54% at 30% 44%, rgb(62 92 118 / 0.10) 0%, transparent 70%)')],
  ['hero sky ::after navy breath: ellipse at 70% 60%, α 0.02 (r152)',
    landingRaw.includes('radial-gradient(ellipse at 70% 60%, rgba(27,42,65,0.02) 0%, transparent 60%)')],
  ['starfield resting opacity P4-16: .ln-keep-sky .ln-hero-depth at 0.5 (was 1 — ~2× too bright)',
    /\.landing \.ln-keep-sky \.ln-hero-depth \{[^}]*opacity: 0\.5;/.test(landingRaw)],
  ['label halo P4-18: .ln-label::before radial lime α0.12 + 6px blur',
    /\.landing \.ln-label::before \{[^}]*opacity: 0\.12; filter: blur\(6px\);/.test(landingRaw)],
  ['skip link: canonical lime pill, centered, z-2100 above the z-2000 grain veil',
    /\.landing a\.ln-skip-link \{[^}]*z-index: 2100;[^}]*background: var\(--ln-lime\);/.test(landingRaw)],
  ['constellation resting life: .is-resting scale(1.45) + the 4px navy halo ring (r152)',
    /\.landing \.ln-constellation-dot\.is-resting \{ transform: scale\(1\.45\); box-shadow: 0 0 0 4px rgb\(27 42 65 \/ 0\.1\); \}/.test(landingRaw)],
  ['@390 trust tightening (canonical landing.css:1723-1725)',
    /@media \(max-width: 390px\) \{ \.landing \.ln-trust-inner \{ gap: var\(--sp-3\); font-size: 12\.5px; \}/.test(landingRaw)],
  ['RM progress guard P3-32: the ribbon stays visible under reduced motion',
    /\.landing \.landing-progress \{ opacity: 1 !important; \}/.test(landingRaw)],
];
for (const [name, okFlag] of R129_LAYER) {
  if (okFlag) passed += 1;
  else failures.push(`r129 layer gate FAILED: ${name}`);
}

// ── r142 «الخط»: the RouteSpine page-road pins (the OrbitScene port
//    retires with the orbit identity; the same craft discipline is
//    re-asserted on the page-scale road engine) ─────────────────────────
const routeSpineSrc = readFileSync(new URL('../src/components/landing/RouteSpine.tsx', import.meta.url), 'utf8');
const heroSectionSrc = readFileSync(new URL('../src/components/landing/hero-section.tsx', import.meta.url), 'utf8');
const pageSrc = readFileSync(new URL('../src/app/page.tsx', import.meta.url), 'utf8');
const journeySrc = readFileSync(new URL('../src/components/landing/OrderJourneySection.tsx', import.meta.url), 'utf8');
const constantsSrc = readFileSync(new URL('../src/lib/constants.ts', import.meta.url), 'utf8');
const ROUTE_SPINE = [
  ['RouteSpine: the road IS the page — one SVG line from the hero origin through every chapter to the finale',
    pageSrc.includes('<RouteSpine />') && routeSpineSrc.includes('getPointAtLength') && routeSpineSrc.includes('screenCTM')],
  ['RouteSpine: the parcel is GLUED to the drawn path (physical px, RTL-safe, scale-proof — the OrderJourney r141 kit at page scale)',
    routeSpineSrc.includes('getScreenCTM') && routeSpineSrc.includes('parcelRef')],
  ['RouteSpine: the shared-belt doctrine — ONE passive scroll listener + ONE rAF (imperative DOM writes, no render per frame)',
    (routeSpineSrc.match(/passive: true/g) || []).length >= 2 && routeSpineSrc.includes('requestAnimationFrame')],
  ['RouteSpine: waypoints are REAL anchors — every chapter plants a [data-route-stop] marker in document order',
    routeSpineSrc.includes('[data-route-stop]') || routeSpineSrc.includes("data-route-stop")],
  ['RouteSpine: gentle drawn-road sway (SWAY 18px on runs ≥ 320px, clamped to the corridor)',
    routeSpineSrc.includes('SWAY = 18') && routeSpineSrc.includes('SWAY_MIN = 320') && routeSpineSrc.includes('EDGE = 14')],
  ['RouteSpine: reduced-motion = COMPLETELY static road — no scroll listener, --sp pinned to 1, parcel parked',
    /prefers-reduced-motion/.test(routeSpineSrc) && routeSpineSrc.includes('--sp')],
  ['RouteSpine: no-JS degrades cleanly — the road paints nothing until first placement (opacity-gated)',
    routeSpineSrc.includes('opacity') && routeSpineSrc.includes('ResizeObserver')],
  ['hero: the dimensional road scene — package floats over the scooter on the route backdrop, the LINE originates under the box',
    heroSectionSrc.includes('/images/shipping/package-hero.webp') && heroSectionSrc.includes('/images/shipping/scooter.webp') && heroSectionSrc.includes('/images/shipping/route.webp') && heroSectionSrc.includes('ln-hero-scene-origin')],
  ['hero: the LCP doctrine holds — h1 server-rendered via the r92 settle (never opacity 0)',
    heroSectionSrc.includes('r92-hero-settle') && heroSectionSrc.includes('priority')],
  ['hero: the roadmark board — mono live figures with CountUp (the trust band folded into the hero chapter)',
    heroSectionSrc.includes('ln-roadmark') && heroSectionSrc.includes('<CountUp')],
  ['journey: the six stations derive from TRACKING_FLOW (lib/constants) — the REAL state machine, never a duplicated list',
    journeySrc.includes('TRACKING_FLOW') && constantsSrc.includes('TRACKING_FLOW: OrderStatus[]')],
  ['journey: the FULL union is covered — NEW → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED',
    /NEW:/.test(constantsSrc) && /CONFIRMED:/.test(constantsSrc) && /PREPARING:/.test(constantsSrc) && /READY:/.test(constantsSrc) && /OUT_FOR_DELIVERY:/.test(constantsSrc) && /DELIVERED:/.test(constantsSrc)],
  ['intro-seen key is product-scoped: smartorder.intro.seen (never the madarek key)',
    pageSrc.includes('smartorder.intro.seen') && !pageSrc.includes('madarek.intro.seen')],
];
for (const [name, okFlag] of ROUTE_SPINE) {
  if (okFlag) passed += 1;
  else failures.push(`RouteSpine gate FAILED: ${name}`);
}

// ── r129 (F4): health API mirror pins (smart-menu-real route.ts:15-79) ──────
const healthSrc = readFileSync(new URL('../src/app/api/health/route.ts', import.meta.url), 'utf8');
const HEALTH_API = [
  ['health commitSha: VERCEL_GIT_COMMIT_SHA || GIT_COMMIT_SHA || null (never fabricated)',
    healthSrc.includes('process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || null')],
  ['health payload carries the observability set (uptime/version/dbLatencyMs/env/connected)',
    healthSrc.includes('uptime: process.uptime()') &&
    healthSrc.includes('version: process.env.npm_package_version') &&
    healthSrc.includes('dbLatencyMs: health.latencyMs') &&
    healthSrc.includes('db: ok ? "connected" : "error"') &&
    healthSrc.includes('env: process.env.NODE_ENV')],
  ['health throttle: in-memory per-IP 30/min + the 429/retry-after path + getClientIp',
    healthSrc.includes('MAX_PER_WINDOW = 30') &&
    healthSrc.includes('{ status: 429, headers: { "retry-after": "10" } }') &&
    healthSrc.includes('getClientIp(request)')],
  ['health is never cached: export const revalidate = 0',
    /export const revalidate = 0;/.test(healthSrc)],
];
for (const [name, okFlag] of HEALTH_API) {
  if (okFlag) passed += 1;
  else failures.push(`health API gate FAILED: ${name}`);
}

// ── r152 matrix pins — the daylight re-anchor of the same slots ──────
// --c-ember = the delivery-orange STRONG step (light #B23E00 = hover;
// night #F26A1B is declared raw in .dark so no pin here).
pin(light, 'matrix-light', '--c-ember', '#B23E00');
// the accent hover/press steps (light #B23E00/#8F3A00; night #FF8A50/#E85D10).
pin(dark, 'matrix-dark', '--accent-hover', '#FF8A50');
pin(dark, 'matrix-dark', '--accent-pressed', '#E85D10');
pin(light, 'matrix-light', '--accent-hover', '#B23E00');
pin(light, 'matrix-light', '--accent-pressed', '#8F3A00');
// --gold-soft/--brand-purple — chained per-theme through the families.
pin(light, 'matrix-light', '--gold-soft', '#FCF1CD');
pin(dark, 'matrix-dark', '--gold-soft', '#2E2610');
pin(light, 'matrix-light', '--brand-purple', '#7C63DB');
pin(dark, 'matrix-dark', '--brand-purple', '#B7A0F4');
// canonical easings/hover step (tokens.css:153/171).
pin(dark, 'matrix-dark', '--ease-spring-snappy', 'cubic-bezier(0.5, 1.6, 0.4, 1)');
pin(dark, 'matrix-dark', '--hover-lift', '-1px');
// the global --r-* ladder (canonical §1.2 names; SO previously carried
// only the Tailwind --radius-* spellings).
const R_NAMES = {
  '--r-xs': '6px', '--r-sm': '8px', '--r-md': '10px', '--r-lg': '12px',
  '--r-xl': '16px', '--r-2xl': '20px', '--r-3xl': '28px', '--r-full': '9999px',
};
pinAll(dark, 'r-names', R_NAMES);

// ── r133 (G1): the Wave-2 fix-list pins ──────────────────────────────────────
// F1 landed the A1/A2/A9/A10/A11/A12/A13 fix list (A→F) as an uncommitted
// working tree; G1 byte-verified every diff and pins the regression-prone
// seams here. Sources are read raw; comments are stripped for the
// repo-wide microcopy sweeps so a fix-explanation comment can never
// satisfy or break a pin (F3's r133 lesson).
const R133_SRC = {
  settings: readFileSync(new URL('../src/app/dashboard/settings/page.tsx', import.meta.url), 'utf8'),
  shell: readFileSync(new URL('../src/components/dashboard/shell.tsx', import.meta.url), 'utf8'),
  orderDetail: readFileSync(new URL('../src/app/dashboard/orders/[id]/page.tsx', import.meta.url), 'utf8'),
  payDialog: readFileSync(new URL('../src/components/payment/payment-dialog.tsx', import.meta.url), 'utf8'),
  subsRoute: readFileSync(new URL('../src/app/api/subscriptions/route.ts', import.meta.url), 'utf8'),
  checkout: readFileSync(new URL('../src/components/storefront/checkout-client.tsx', import.meta.url), 'utf8'),
  trackPage: readFileSync(new URL('../src/app/track/[token]/page.tsx', import.meta.url), 'utf8'),
  trackClient: readFileSync(new URL('../src/components/storefront/tracking-client.tsx', import.meta.url), 'utf8'),
  login: readFileSync(new URL('../src/app/login/page.tsx', import.meta.url), 'utf8'),
  clientLib: readFileSync(new URL('../src/lib/client.ts', import.meta.url), 'utf8'),
  loginRoute: readFileSync(new URL('../src/app/api/auth/login/route.ts', import.meta.url), 'utf8'),
  registerRoute: readFileSync(new URL('../src/app/api/auth/register/route.ts', import.meta.url), 'utf8'),
  publicOrders: readFileSync(new URL('../src/app/api/public/orders/route.ts', import.meta.url), 'utf8'),
};
// r133 (G1) helpers: raw reader + repo-file constants + the comment-stripped
// microcopy sweep. The sweep walks every src/ ts/tsx/css/mjs file stripped of
// /* */ and // comments, so fix-explanation comments (which legitimately say
// فشل/تعذر) can never satisfy or break a pin — only shipped strings count.
const exists = (u) => existsSync(u);
const R = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const TSCONFIG = R('tsconfig.json');
const PKG = R('package.json');
const NEXTCFG = R('next.config.ts');
const ENVEX = R('.env.example');
const MICRO = (() => {
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
  const texts = [];
  (function walkSrc(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walkSrc(p);
      else if (/\.(tsx?|css|mjs)$/.test(e.name)) texts.push(strip(readFileSync(p, 'utf8')));
    }
  })(srcRoot);
  return {
    fashal: texts.some((t) => /فشل/.test(t)),
    bareTaathur: texts.some((t) => /تعذر(?!ّ)/.test(t)),
    ellipsis: texts.some((t) => /["'`][^"'`\n]*[\u0600-\u06FF][^"'`\n]*\.\.\.["'`]/.test(t)),
    wrongMask: texts.some((t) => /09X{9,}/.test(t)),
  };
})();
const R133_LAYER = [
  // ── A (A1 musts) ──────────────────────────────────────────────────────────
  ['A-M1 settings publish: reads the 200 {published:false,reason} answer (no false success)',
    /r\.data\.published === false/.test(R133_SRC.settings) && /r\.data\.reason/.test(R133_SRC.settings)],
  ['A-M2 zero-membership: shell EmptyState replaces the infinite skeleton',
    /businesses\.length === 0/.test(R133_SRC.shell) && R133_SRC.shell.includes('لا يوجد عمل مرتبط بحسابك')],
  // ── B (money/UX tail) ─────────────────────────────────────────────────────
  ['B-F7 PAID/REFUNDED ride ConfirmDialog: 0 direct setPaymentStatus onClick, REFUNDED destructive',
    (R133_SRC.orderDetail.match(/setConfirmPayment\(/g) || []).length >= 6 &&
    !/onClick=\{\(\) => setPaymentStatus\(/.test(R133_SRC.orderDetail) &&
    R133_SRC.orderDetail.includes('destructive={confirmPayment?.ps === "REFUNDED"}')],
  ['B-F11 wallet phone client: normalizeLibyanPhone gate + role=alert inline error',
    R133_SRC.payDialog.includes('const normalized = normalizeLibyanPhone(phone);') &&
    R133_SRC.payDialog.includes('id="payment-phone-error" role="alert"')],
  ['B-F11 wallet phone server: subscriptions route validates + normalizes (0912345678 example)',
    R133_SRC.subsRoute.includes('phone = input.phone ? normalizeLibyanPhone(input.phone) : null;') &&
    R133_SRC.subsRoute.includes('رقم الهاتف غير صحيح — مثال صحيح: 0912345678')],
  ['B-F14 poll give-up retry: pollFailed state + pollNonce re-arm (no silent forever-pulse)',
    R133_SRC.payDialog.includes('setPollFailed(true);') &&
    R133_SRC.payDialog.includes('setPollNonce((n) => n + 1);') &&
    /\[step, paymentId, pollNonce\]/.test(R133_SRC.payDialog)],
  ['B-F9 checkout success durable: router.replace → /track/{token}?placed=1 + placed banner',
    R133_SRC.checkout.includes('router.replace(`/track/${r.data.order.publicToken}?placed=1`)') &&
    R133_SRC.trackPage.includes('placed={placed === "1"}') &&
    R133_SRC.trackClient.includes('تم استلام طلبك!')],
  ['B-S5 login ?expired=1: quiet banner + replaceState consume',
    R133_SRC.login.includes('get("expired") === "1"') &&
    R133_SRC.login.includes('انتهت جلستك لأسباب أمنية') &&
    R133_SRC.login.includes('history.replaceState(null, "", "/login")')],
  ['B-S6 dirty-guard ×4: useDirtyClose hook + categories/delivery/payments/staff consumers',
    ['src/app/dashboard/categories/page.tsx', 'src/app/dashboard/delivery/page.tsx',
     'src/app/dashboard/payments/page.tsx', 'src/app/dashboard/staff/page.tsx']
      .every((p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').includes('useDirtyClose'))],
  // ── C (A2 quality) ────────────────────────────────────────────────────────
  ['C-N1 Arabic network errors: the one-seam fetch wrap in lib/client.ts (30 call sites inherit)',
    R133_SRC.clientLib.includes('تعذّر الاتصال بالشبكة — تحقّق من اتصالك وحاول مرة أخرى') &&
    /catch \{\s*throw new ApiError\(/.test(R133_SRC.clientLib)],
  ['C-N2 dbRateLimit awaited on login + register + public-orders (the r132 handoff executed)',
    R133_SRC.loginRoute.includes('await dbRateLimit(`login:${ip}`') &&
    R133_SRC.registerRoute.includes('await dbRateLimit(`register:${ip}`') &&
    R133_SRC.publicOrders.includes('await dbRateLimit(`order:${ip}`')],
  ['C raw plans-fetch ×2 → api.get (pricing-client + register; no raw fetch("/api/plans"))',
    !R('src/components/pricing/pricing-client.tsx').includes('fetch("/api/plans")') &&
    !R('src/app/register/page.tsx').includes('fetch("/api/plans")') &&
    R('src/components/pricing/pricing-client.tsx').includes('api.get<Plan[]>("/api/plans")') &&
    R('src/app/register/page.tsx').includes('api.get<Plan[]>("/api/plans")')],
  ['C tsconfig: noUnused* on, noImplicitAny escape closed, ghost excludes gone',
    TSCONFIG.includes('"noUnusedLocals": true') && TSCONFIG.includes('"noUnusedParameters": true') &&
    !TSCONFIG.includes('"noImplicitAny": false') && !TSCONFIG.includes('refs') && !TSCONFIG.includes('mini-services')],
  ['C scripts purge: forensic one-offs + og-template/dev-server/rules.txt/showcase webp gone; README documents keepers',
    !exists(new URL('../scripts/dev-server.sh', import.meta.url)) &&
    !exists(new URL('../scripts/make-brand-icon.py', import.meta.url)) &&
    !exists(new URL('../scripts/og-template.html', import.meta.url)) &&
    !exists(new URL('../scripts/impeccable-61-rules.txt', import.meta.url)) &&
    !exists(new URL('../scripts/make-og-manifest.py', import.meta.url)) &&
    !exists(new URL('../public/showcase-store.webp', import.meta.url)) &&
    exists(new URL('../scripts/README.md', import.meta.url))],
  // ── D (A11 a11y) ──────────────────────────────────────────────────────────
  ['D storefront filter strip: role=group + aria-pressed (the fake tablist is gone)',
    R('src/components/storefront/storefront.tsx').includes('role="group" aria-label="تصفية أقسام المنتجات"') &&
    R('src/components/storefront/storefront.tsx').includes('aria-pressed={activeCategory === "ALL"}') &&
    !R('src/components/storefront/storefront.tsx').includes('role="tablist"')],
  ['D dialog + sheet close: 44px hit floor (size-11 flex centering)',
    R('src/components/ui/dialog.tsx').includes('flex size-11 items-center justify-center') &&
    R('src/components/ui/sheet.tsx').includes('flex size-11 items-center justify-center')],
  ['D MagneticGoldLink: internal hrefs ride next/link (external keeps raw anchor)',
    R('src/components/landing/MagneticGoldLink.tsx').includes('import Link from "next/link"')],
  ['D sonner error toasts: assertive role=alert wrapper (every raw toast.error inherits)',
    R('src/components/ui/sonner.tsx').includes('<span role="alert">')],
  ['D skip targets: tabIndex={-1} mains (storefront + checkout + tracking + dashboard shell)',
    R('src/components/storefront/storefront.tsx').includes('<main id="main" tabIndex={-1}') &&
    R('src/components/storefront/checkout-client.tsx').includes('<main id="main" tabIndex={-1}') &&
    R133_SRC.trackClient.includes('<main id="main" tabIndex={-1}') &&
    R133_SRC.shell.includes('tabIndex={-1}')],
  ['D product-dialog options: aria-pressed chips (fake radio/checkbox roles gone)',
    R('src/components/storefront/product-dialog.tsx').includes('aria-pressed={isSelected}') &&
    !R('src/components/storefront/product-dialog.tsx').includes('role={g.maxSelect > 1 ? "checkbox" : "radio"}')],
  // ── E (A12/A9/A10/A13 rulings) ────────────────────────────────────────────
  ['E money grouping: formatLyd groups ≥1000 ar-LY dots (groupDots); formatLydAmount stays RAW for parseLyd round-trip',
    R('src/lib/money.ts').includes('function groupDots(') &&
    R('src/lib/money.ts').includes('groupDots(whole)') &&
    R('src/lib/money.ts').includes('RAW by design')],
  ['E toArabicNumber: hand-rolled dot grouping, no Intl (hydration-safe)',
    R('src/lib/plan-types.ts').includes('replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".")')],
  ['E timeAgoAr: counted plurals (منذ دقيقة واحدة / دقيقتين / دقائق)',
    R('src/lib/arabic.ts').includes('function sincePhrase(') &&
    R('src/lib/arabic.ts').includes('"دقيقتين"') && R('src/lib/arabic.ts').includes('"ساعتين"')],
  ['E DELIVERED = تم التسليم (R4 fleet ruling)',
    R('src/lib/constants.ts').includes('DELIVERED: "تم التسليم"')],
  ['E og:locale = ar_AR ×2 (root layout + store generateMetadata)',
    R('src/app/layout.tsx').includes('locale: "ar_AR"') &&
    R('src/app/store/[slug]/page.tsx').includes('locale: "ar_AR"')],
  ['E autofill/caret port (madarek base.css browser surfaces, globals.css)',
    R('src/app/globals.css').includes('caret-color: var(--primary);') &&
    R('src/app/globals.css').includes('-webkit-box-shadow: 0 0 0 1000px var(--background) inset')],
  ['E input/select/textarea hover borders (invalid keeps destructive on hover)',
    R('src/components/ui/input.tsx').includes('hover:not-aria-invalid:border-foreground/25') &&
    R('src/components/ui/select.tsx').includes('hover:not-aria-invalid:border-foreground/25') &&
    R('src/components/ui/textarea.tsx').includes('hover:not-aria-invalid:border-foreground/25')],
  ['E wallet phone mask 09XXXXXXXX (9 X — the R10 spelling)',
    R133_SRC.payDialog.includes('placeholder="09XXXXXXXX"')],
  ['E+F lucide ^1.43 + engines node>=22 + packageManager bun@1.3.14 (CI/Vercel contract — never npm)',
    PKG.includes('"lucide-react": "^1.43.0"') && PKG.includes('"node": ">=22"') &&
    PKG.includes('"packageManager": "bun@1.3.14"')],
  ['E og-default.png day + SWR cache rule (SO-N3)',
    NEXTCFG.includes('source: "/og-default.png"') && NEXTCFG.includes('stale-while-revalidate=604800')],
  ['E global-error.tsx: the root boundary exists (A13 S-05)',
    exists(new URL('../src/app/global-error.tsx', import.meta.url))],
  ['E .env.example: bank/WhatsApp/seed/proxy vars documented',
    ENVEX.includes('NEXT_PUBLIC_BANK_NAME') && ENVEX.includes('NEXT_PUBLIC_SUPPORT_WHATSAPP') &&
    ENVEX.includes('SEED_SECRET') && ENVEX.includes('TRUST_PROXY_DEPTH')],
  ['E lockfile convention: bun.lock present (CI/Vercel frozen contract), no package-lock.json (ci.yml documents the npm-detector trap)',
    exists(new URL('../bun.lock', import.meta.url)) &&
    !exists(new URL('../package-lock.json', import.meta.url))],
  // ── E microcopy sweeps (comment-stripped, src-wide — F3's r133 recipe) ────
  ['E فشل-ban sweep: 0 user-facing فشل in src (R3)',
    !MICRO.fashal],
  ['E تعذّر shadda sweep: 0 bare تعذر in src',
    !MICRO.bareTaathur],
  ['E ellipsis sweep: 0 "..." inside Arabic strings in src (R6 «…»)',
    !MICRO.ellipsis],
  ['E mask sweep: 0 09XXXXXXXXX (10-X) placeholders in src',
    !MICRO.wrongMask],
];
for (const [name, okFlag] of R133_LAYER) {
  if (okFlag) passed += 1;
  else failures.push(`r133 (G1) layer gate FAILED: ${name}`);
}

// ── r134 (W2 #19): canon rung pin — the button lg rung drifted to 44px and
// needed a MANUAL sibling canon-check to catch (nothing pinned it). Pinned
// here so the next drift fails the batch before the build, like every other
// canon value. Canon: madarek components.css .btn.lg block-size 48px
// (Smart-Menu button.tsx h-12 mirrors it).
// ── r150 (§8, 20-IDEAL-CTA completion): the family 44/48/52 control canon
// retires the r131 h-10 40px CTA rung — default = h-11 (44px), pinned in
// sync with Smart-Link's inner-page CTA canon (SL parity C3 pins the same
// 44/13/600/r10 contract). One canonical definition, two repositories.
const R134_LAYER = [
  ['r134 button lg rung: h-12 = 48px canon (madarek .btn.lg block-size 48px; Smart-Menu h-12)',
    R('src/components/ui/button.tsx').includes('lg: "h-12 gap-2.5 px-6 text-sm"')],
  ['r150 CTA canon: default h-11 = 44px — the h-10 40px CTA rung is RETIRED (§8; SL twin contract)',
    R('src/components/ui/button.tsx').includes('default: "h-11 px-5"') &&
    !R('src/components/ui/button.tsx').includes('default: "h-10')],
];
for (const [name, okFlag] of R134_LAYER) {
  if (okFlag) passed += 1;
  else failures.push(`r134 layer gate FAILED: ${name}`);
}

// ── r152 (PHASE 5): the DAYLIGHT FLIP gates — the theme-default
// contract, the font re-anchor, and the night-dispatch override. These
// pin the flip itself so a future edit cannot silently regress to the
// dark-default family monoculture. ──────────────────────────────────────
const rawLayout = readFileSync(new URL('../src/app/layout.tsx', import.meta.url), 'utf8');
const rawThemeProvider = readFileSync(new URL('../src/components/shared/theme-provider.tsx', import.meta.url), 'utf8');
const rawManifest = readFileSync(new URL('../public/manifest.json', import.meta.url), 'utf8');
const rawFontsCss = readFileSync(new URL('../public/fonts/fonts.css', import.meta.url), 'utf8');
const rawButton2 = readFileSync(new URL('../src/components/ui/button.tsx', import.meta.url), 'utf8');
const R152_LAYER = [
  ['daylight is the DEFAULT: :root declares color-scheme light (night is the .dark override)',
    rawCss.includes(':root { color-scheme: light;') && rawCss.includes('.dark { color-scheme: dark;')],
  ['night dispatch survives as the explicit .dark override (ground #0D1626 / luminous orange #FF7A38)',
    norm(resolve(dark, dark['--background'] ?? '')) === '#0D1626' &&
    norm(resolve(dark, dark['--primary'] ?? '')) === '#FF7A38'],
  ['the boot script paints LIGHT by default (dark only when stored)',
    rawLayout.includes("if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.add('light')}")],
  ['next-themes defaultTheme="light" (one resolution path with the boot script)',
    rawThemeProvider.includes('defaultTheme="light"')],
  ['first-paint preloads are the Tajawal arabic subsets (400 + 700)',
    rawLayout.includes('/fonts/tajawal-400-normal-arabic.woff2') &&
    rawLayout.includes('/fonts/tajawal-700-normal-arabic.woff2') &&
    !rawLayout.includes('plex-sans-arabic-400-normal-arabic.woff2" as="font"')],
  ['fonts.css: the P1 shim --font-cairo now resolves to "Tajawal" (the real loaded face)',
    rawFontsCss.includes(':root { --font-cairo: "Tajawal"; }')],
  ['fonts.css: Tajawal @font-face ×8 (400/500/700/800 × arabic+latin) — self-hosted, no external requests',
    (rawFontsCss.match(/font-family: 'Tajawal';/g) || []).length === 8 &&
    rawFontsCss.includes('/fonts/tajawal-800-normal-arabic.woff2')],
  ['fonts.css: Barlow Semi Condensed @font-face ×2 (600/700 latin) — the Latin display face',
    (rawFontsCss.match(/font-family: 'Barlow Semi Condensed';/g) || []).length === 2 &&
    rawFontsCss.includes('/fonts/barlow-semi-condensed-700-normal-latin.woff2')],
  ['globals @theme: --font-heading chains Barlow Semi Condensed FIRST (Latin display), Tajawal next (Arabic headings — never Times)',
    theme['--font-heading'] === '"Barlow Semi Condensed", var(--font-cairo), "Tajawal", "IBM Plex Sans Arabic", system-ui, sans-serif'],
  ['globals @theme: the --font-display bridge exists and rides the same Barlow→Tajawal chain',
    theme['--font-display'] === theme['--font-heading']],
  ['globals @theme: --font-sans is Tajawal-first (Arabic body)',
    theme['--font-sans'].startsWith('var(--font-cairo), "Tajawal"')],
  ['the woff2 files actually exist on disk (Tajawal ×8 + Barlow ×2)',
    ['tajawal-400-normal-arabic.woff2', 'tajawal-500-normal-arabic.woff2', 'tajawal-700-normal-arabic.woff2',
     'tajawal-800-normal-arabic.woff2', 'tajawal-400-normal-latin.woff2', 'tajawal-500-normal-latin.woff2',
     'tajawal-700-normal-latin.woff2', 'tajawal-800-normal-latin.woff2',
     'barlow-semi-condensed-600-normal-latin.woff2', 'barlow-semi-condensed-700-normal-latin.woff2']
      .every((f) => existsSync(new URL(`../public/fonts/${f}`, import.meta.url)))],
  ['viewport themeColor pair rides the daylight contract (light #F7F7F4 / dark #0D1626)',
    rawLayout.includes('color: "#F7F7F4"') && rawLayout.includes('color: "#0D1626"')],
  ['manifest: theme_color #D14900 (delivery orange) + background_color #F7F7F4 (paper)',
    rawManifest.includes('"theme_color": "#D14900"') && rawManifest.includes('"background_color": "#F7F7F4"')],
  ['primary button carries the delivery-orange press register (active:bg-(--accent-pressed))',
    rawButton2.includes('active:bg-(--accent-pressed)')],
  ['ROUTE & NODE motif primitives are defined (route-divider + route-spine-segment)',
    rawCss.includes('.route-divider {') && rawCss.includes('.route-spine-segment {')],
  ['tracking rides the dashed road: tracking-client threads border-s-2 border-dashed route segments',
    readFileSync(new URL('../src/components/storefront/tracking-client.tsx', import.meta.url), 'utf8')
      .includes('border-s-2 border-dashed')],
  ['status stamps: badge.tsx rides the squared stamp (rounded-sm) with family-ink borders',
    readFileSync(new URL('../src/components/ui/badge.tsx', import.meta.url), 'utf8')
      .includes('rounded-sm border px-2') &&
    readFileSync(new URL('../src/components/shared/status-badges.tsx', import.meta.url), 'utf8')
      .includes('border-(--c-copper-ink)/35')],
  ['empty states are stations on the route (RouteStationRoad in states.tsx)',
    readFileSync(new URL('../src/components/shared/states.tsx', import.meta.url), 'utf8')
      .includes('RouteStationRoad')],
];
for (const [name, okFlag] of R152_LAYER) {
  if (okFlag) passed += 1;
  else failures.push(`r152 daylight-flip gate FAILED: ${name}`);
}

// ── Phase 6 (P6-2-f1): the SHARED CHROME GRAMMAR gates — the Route &
// Node voice on the dashboard chrome components (stamps, roads, node
// punctuation, mono numerals). Same shape as the r152 layer: raw
// source consumption gates, so a future edit cannot silently regress
// the chrome back to the generic underline/slab/round-pill idiom. ────
const P6_CHROME = [
  ['page-header: quiet route divider option under the header row (route-divider route-divider-quiet)',
    R('src/components/dashboard/page-header.tsx').includes('route-divider route-divider-quiet')],
  ['page-header: mono page-meta numerals (font-mono + tabular-nums meta line)',
    R('src/components/dashboard/page-header.tsx').includes('font-mono text-xs tabular-nums')],
  ['underline-tabs: ACTIVE tab = shipping stamp (rounded-sm + copper family border/ground/deep ink)',
    R('src/components/dashboard/underline-tabs.tsx').includes('rounded-sm border px-4') &&
    R('src/components/dashboard/underline-tabs.tsx').includes('border-(--c-copper-ink)/35 bg-(--c-copper-bg) text-(--c-copper-deep)')],
  ['underline-tabs: the generic underline indicator is RETIRED (no h-0.5 scale-x span)',
    !R('src/components/dashboard/underline-tabs.tsx').includes('h-0.5') &&
    !R('src/components/dashboard/underline-tabs.tsx').includes('scale-x')],
  ['filter-pills: active pill is FRANKED (squared rounded-sm + copper family stamp + halo); idle stays round',
    R('src/components/dashboard/filter-pills.tsx').includes('rounded-sm border-(--c-copper-ink)/35') &&
    R('src/components/dashboard/filter-pills.tsx').includes('rounded-full border text-xs') &&
    R('src/components/dashboard/filter-pills.tsx').includes('color-mix(in_srgb,var(--orange)_16%,transparent)')],
  ['table-pagination: numerals ride IBM Plex Mono (font-mono tabular-nums on count + page buttons)',
    (R('src/components/dashboard/table-pagination.tsx').match(/font-mono tabular-nums/g) || []).length >= 2],
  ['table-pagination: squared stamp controls (rounded-sm) + active page = copper family stamp',
    R('src/components/dashboard/table-pagination.tsx').includes('rounded-sm px-2') &&
    R('src/components/dashboard/table-pagination.tsx').includes('border-(--c-copper-ink)/45 bg-(--c-copper-bg)')],
  ['confirm-dialog: header hairline (border-b) on both dialogs + destructive confirm squared to the stamp',
    (R('src/components/dashboard/confirm-dialog.tsx').match(/border-b border-border pb-4/g) || []).length >= 2 &&
    R('src/components/dashboard/confirm-dialog.tsx').includes('rounded-sm border-(--c-rose-ink)/45')],
  ['skeletons: RouteNodeDot station punctuation rides the table/card/list rows',
    (R('src/components/dashboard/skeletons.tsx').match(/<RouteNodeDot/g) || []).length >= 3],
  ['skeletons: dashed-hairline section variant (SectionSkeleton) consumed by the section fallbacks',
    R('src/components/dashboard/skeletons.tsx').includes('border border-dashed border-border/90') &&
    (R('src/components/dashboard/skeletons.tsx').match(/<SectionSkeleton/g) || []).length >= 6],
  ['form-field: FieldError speaks the quiet rose stamp (squared + family border + family ground + deep ink)',
    R('src/components/dashboard/form-field.tsx').includes('rounded-sm border border-(--c-rose-ink)/35 bg-(--c-rose-bg)') &&
    R('src/components/dashboard/form-field.tsx').includes('text-(--c-rose-deep)')],
];
for (const [name, okFlag] of P6_CHROME) {
  if (okFlag) passed += 1;
  else failures.push(`phase6 chrome gate FAILED: ${name}`);
}

// ── Phase 6 (P6-2-f2): the CRUD SCREENS ADOPTION gates — the merchant
// surfaces consume the chrome grammar the f1 commit exposed: mono
// operational figures on every CRUD screen, route dividers between
// chapters, squared family stamps on chips/pills/tiles, the dashed
// route spine on the owner timeline, and route-station upload/empty
// treatments. Same consumption-pin shape as the P6_CHROME layer. ─────
const P6_SCREENS = [
  ['products: PageHeader adopts the mono meta line + quiet route divider (counts as codes)',
    R('src/app/dashboard/products/page.tsx').includes('divider') &&
    R('src/app/dashboard/products/page.tsx').includes('meta=')],
  ['products: card-grid price figures ride IBM Plex Mono',
    (R('src/app/dashboard/products/page.tsx').match(/font-mono/g) || []).length >= 1],
  ['products: featured/unavailable chips are squared family stamps (1px border, no rounded-full)',
    R('src/app/dashboard/products/page.tsx').includes('rounded-sm border border-(--c-yellow-ink)/40') &&
    !R('src/app/dashboard/products/page.tsx').includes('rounded-full bg-(--c-yellow-bg)')],
  ['product-editor: price/variant/option/stock money fields ride IBM Plex Mono',
    (R('src/components/dashboard/product-editor.tsx').match(/font-mono/g) || []).length >= 5],
  ['product-editor: section headers carry the stamp rhythm (copper family well) + quiet route dividers between chapters',
    (R('src/components/dashboard/product-editor.tsx').match(/route-divider route-divider-quiet/g) || []).length >= 2 &&
    (R('src/components/dashboard/product-editor.tsx').match(/rounded-sm border border-\(--c-copper-ink\)\/35 bg-\(--c-copper-bg\)/g) || []).length >= 2],
  ['product-editor: the empty image upload tile reads as a route station (RouteNodeDot + dashed road)',
    R('src/components/dashboard/product-editor.tsx').includes('RouteNodeDot') &&
    R('src/components/dashboard/product-editor.tsx').includes('border-t-2 border-dashed border-primary/45')],
  ['categories: route-numbered list (mono ordinal inside a route node) + full dialog header hairline',
    R('src/app/dashboard/categories/page.tsx').includes('rounded-full border-2 border-primary/55 bg-card font-mono') &&
    R('src/app/dashboard/categories/page.tsx').includes('border-b border-border p-5')],
  ['customers: phones + money + counts ride IBM Plex Mono (desktop table AND mobile cards, dir=ltr kept)',
    (R('src/app/dashboard/customers/page.tsx').match(/font-mono/g) || []).length >= 6],
  ['customer-detail: metric tiles are squared stamp wells with mono figures; addresses speak the kv-row hairline rhythm',
    R('src/app/dashboard/customers/[id]/page.tsx').includes('rounded-sm border border-border bg-card p-4 text-center') &&
    R('src/app/dashboard/customers/[id]/page.tsx').includes('divide-y divide-border/60')],
  ['delivery: fee/minOrder figures ride IBM Plex Mono; example chips are route stations (node + mono fee)',
    (R('src/app/dashboard/delivery/page.tsx').match(/font-mono/g) || []).length >= 3 &&
    R('src/app/dashboard/delivery/page.tsx').includes('size-1.5 rounded-full border border-primary/55')],
  ['payments: type/disabled labels + the enable pill are squared family stamps; aria-pressed kept; transfer numbers mono',
    R('src/app/dashboard/payments/page.tsx').includes('rounded-sm border border-(--c-grey-ink)/35') &&
    R('src/app/dashboard/payments/page.tsx').includes('rounded-sm border px-3') &&
    R('src/app/dashboard/payments/page.tsx').includes('aria-pressed={m.isActive}') &&
    R('src/app/dashboard/payments/page.tsx').includes('font-mono tabular-nums')],
  ['staff: the OWNER chip is the squared copper family stamp',
    R('src/app/dashboard/staff/page.tsx').includes('rounded-sm border border-(--c-copper-ink)/35 bg-(--c-copper-bg)')],
  ['settings: store-link card opens with the quiet route divider; logo upload tile is a route station',
    R('src/app/dashboard/settings/page.tsx').includes('route-divider route-divider-quiet') &&
    R('src/app/dashboard/settings/page.tsx').includes('RouteNodeDot')],
  ['onboarding: progress meter is the dashed route (nodes + dashed spine, traveled primary/45)',
    R('src/app/dashboard/onboarding/page.tsx').includes('border-t-2 border-dashed') &&
    R('src/app/dashboard/onboarding/page.tsx').includes('rounded-full border-2 bg-card')],
  ['orders list: PageHeader adopts the mono meta line + quiet route divider; money/phones mono',
    R('src/app/dashboard/orders/page.tsx').includes('divider') &&
    R('src/app/dashboard/orders/page.tsx').includes('meta=') &&
    (R('src/app/dashboard/orders/page.tsx').match(/font-mono/g) || []).length >= 3],
  ['order detail: the timeline spine is the DASHED ROUTE (.route-spine-segment consumer — solid tinted bar retired)',
    R('src/app/dashboard/orders/[id]/page.tsx').includes('route-spine-segment absolute') &&
    !R('src/app/dashboard/orders/[id]/page.tsx').includes('w-0.5 rounded-full bg-[color-mix')],
  ['order detail: terminal timeline states (DELIVERED/CANCELLED/REJECTED) render squared family stamps',
    (R('src/app/dashboard/orders/[id]/page.tsx').match(/stamp: "border-\(--c-(mint|grey|rose)-ink\)\/35/g) || []).length === 3],
  ['order detail: the totals ledger + item figures ride IBM Plex Mono',
    (R('src/app/dashboard/orders/[id]/page.tsx').match(/font-mono/g) || []).length >= 6],
  ['admin payments: reviewed statuses are squared family stamps (mint/rose) + amounts mono',
    R('src/app/dashboard/admin/payments/page.tsx').includes('border-(--c-mint-ink)/35 bg-(--c-mint-bg)') &&
    R('src/app/dashboard/admin/payments/page.tsx').includes('border-(--c-rose-ink)/35 bg-(--c-rose-bg)') &&
    R('src/app/dashboard/admin/payments/page.tsx').includes('font-mono text-accent-foreground tabular-nums')],
];
for (const [name, okFlag] of P6_SCREENS) {
  if (okFlag) passed += 1;
  else failures.push(`phase6 screens gate FAILED: ${name}`);
}

// ── Phase 6 (P6-2-f3): the CUSTOMER MONEY PATH gates — the checkout
// stamp tiles + the USSD re-tone + the journey route + mono money
// figures; the tracking terminus + offline hint + composed DELIVERED
// stamp; the shell light-mode route grammar + the «المزيد» bottom
// sheet; and the two new route-level loading skeletons. Same
// consumption-pin shape as the layers above. ─────────────────────────
const P6_STOREFRONT = [
  ['checkout: fulfillment tiles are squared stamps (rounded-sm + 1px family border; selected = orange border + soft wash; aria-pressed kept)',
    R('src/components/storefront/checkout/fulfillment-section.tsx').includes('rounded-sm border p-3.5') &&
    R('src/components/storefront/checkout/fulfillment-section.tsx').includes('aria-pressed={selected}')],
  ['checkout: zone tiles are squared stamps; fee/minOrder figures ride IBM Plex Mono',
    R('src/components/storefront/checkout/delivery-details-section.tsx').includes('rounded-sm border p-2.5') &&
    (R('src/components/storefront/checkout/delivery-details-section.tsx').match(/font-mono/g) || []).length >= 3],
  ['checkout: payment provider tiles are squared stamps (aria-pressed kept)',
    R('src/components/storefront/checkout/payment-section.tsx').includes('rounded-sm border text-[13px]') &&
    R('src/components/storefront/checkout/payment-section.tsx').includes('aria-pressed={selected}')],
  ['checkout: the USSD quick-code box is re-toned to the identity (steel family stamp — NOT success-green); the copy CTA is delivery orange',
    R('src/components/storefront/checkout/payment-section.tsx').includes('rounded-sm border border-(--c-sky-ink)/35 bg-(--c-sky-bg)') &&
    !R('src/components/storefront/checkout/payment-section.tsx').includes('bg-success/10') &&
    R('src/components/storefront/checkout/payment-section.tsx').includes('bg-primary px-3 text-xs font-medium text-primary-foreground')],
  ['checkout: the journey route indicator rides the page top (store → checkout → done: dashed segments + RM-safe pulsing active node)',
    R('src/components/storefront/checkout-client.tsx').includes('aria-label="مسار الطلب"') &&
    R('src/components/storefront/checkout-client.tsx').includes('border-t-2 border-dashed') &&
    R('src/components/storefront/checkout-client.tsx').includes('animate-pulse-soft')],
  ['checkout: money figures ride IBM Plex Mono (summary rows + the sticky bar + the squared order-number stamp on success)',
    R('src/components/storefront/checkout/sticky-submit-bar.tsx').includes('font-mono font-bold text-lg tabular-nums') &&
    R('src/components/storefront/checkout/cart-summary-section.tsx').includes('font-mono tabular-nums font-medium') &&
    R('src/components/storefront/checkout/success-screen.tsx').includes('rounded-sm bg-primary/10 border border-primary/25')],
  ['tracking: the destination terminus ring follows the last station (closed when DELIVERED, open dashed while pending)',
    R('src/components/storefront/tracking-client.tsx').includes('الوجهة') &&
    R('src/components/storefront/tracking-client.tsx').includes('"border-dashed border-border bg-card text-muted-foreground/60"') &&
    R('src/components/storefront/tracking-client.tsx').includes('ring-2 ring-primary/15')],
  ['tracking: poll failure surfaces the quiet offline hint (آخر تحديث معروف + retry affordance) with the 15s visibility-gated cadence intact',
    R('src/components/storefront/tracking-client.tsx').includes('آخر تحديث معروف') &&
    R('src/components/storefront/tracking-client.tsx').includes('إعادة المحاولة') &&
    R('src/components/storefront/tracking-client.tsx').includes('setSyncFailed(true)') &&
    R('src/components/storefront/tracking-client.tsx').includes('if (!document.hidden) poll();')],
  ['tracking: the DELIVERED moment is a composed terminal stamp (squared mint 2px dashed + history-sourced date, never fabricated)',
    R('src/components/storefront/tracking-client.tsx').includes('border-2 border-dashed border-(--c-mint-ink)/45') &&
    R('src/components/storefront/tracking-client.tsx').includes('deliveredAt') &&
    R('src/app/track/[token]/page.tsx').includes('toStatus: "DELIVERED"')],
  ['tracking: the placed banner + the cancelled/rejected cards are quiet squared family stamps (rose/grey per ORDER_STATUS_CHIP)',
    R('src/components/storefront/tracking-client.tsx').includes('rounded-sm border border-success/30') &&
    R('src/components/storefront/tracking-client.tsx').includes('"border-(--c-rose-ink)/35 bg-(--c-rose-bg)"')],
  ['shell: the light-mode sidebar carries the route-line/nav-node grammar (dashed vertical hairline + node dots, light-only)',
    R('src/components/dashboard/shell.tsx').includes('border-s border-dashed border-border/80 dark:hidden') &&
    R('src/components/dashboard/shell.tsx').includes('size-1.5 rounded-full border bg-card dark:hidden')],
  ['shell: the mobile «المزيد» opens a real bottom-sheet menu (44px rows; primary + categories/delivery/payments/staff/settings)',
    R('src/components/dashboard/shell.tsx').includes('aria-haspopup="dialog"') &&
    R('src/components/dashboard/shell.tsx').includes('side="bottom"') &&
    R('src/components/dashboard/shell.tsx').includes('min-h-11 items-center gap-2.5 rounded-sm') &&
    R('src/components/dashboard/shell.tsx').includes('const MORE_NAV')],
  ['loading: shape-matched route skeletons exist for checkout (form sections + journey road) and track (station road, RM-safe pulse)',
    existsSync(new URL('../src/app/store/[slug]/checkout/loading.tsx', import.meta.url)) &&
    existsSync(new URL('../src/app/track/[token]/loading.tsx', import.meta.url)) &&
    readFileSync(new URL('../src/app/store/[slug]/checkout/loading.tsx', import.meta.url), 'utf8').includes('border-t-2 border-dashed') &&
    readFileSync(new URL('../src/app/track/[token]/loading.tsx', import.meta.url), 'utf8').includes('animate-pulse-soft') &&
    readFileSync(new URL('../src/app/track/[token]/loading.tsx', import.meta.url), 'utf8').includes('border-s-2 border-dashed')],
];
for (const [name, okFlag] of P6_STOREFRONT) {
  if (okFlag) passed += 1;
  else failures.push(`phase6 storefront gate FAILED: ${name}`);
}

// ── P6-2-f4 (Phase 6): BROWSER E2E BATTERY — the suite + its scratch
// universe under test: the config contract (dedicated e2e SQLite db +
// port 3115 + tests/browser + ar-LY + chromium + the db-push/seed/start
// webServer chain) and the seed script's safety rails (demo-store +
// OWNER merchant + the refusal guard that keeps it off the dev db).
// Same consumption-pin shape as the layers above. ────────────────────
const P6_E2E = [
  ['e2e: the Playwright config pins the battery contract (tests/browser · chromium · ar-LY · 2 workers · port 3115 · dedicated e2e.db + seed + next start webServer)',
    R('playwright.config.ts').includes('testDir: "tests/browser"') &&
    R('playwright.config.ts').includes('locale: "ar-LY"') &&
    R('playwright.config.ts').includes('E2E_PORT || "3115"') &&
    R('playwright.config.ts').includes('file:./db/e2e.db') &&
    R('playwright.config.ts').includes('node scripts/e2e-seed.mjs') &&
    R('playwright.config.ts').includes('devices["Desktop Chrome"]')],
  ['e2e: the seed script guards its universe (refuses any non-e2e DATABASE_URL, never references the dev db) and seeds the demo store + an OWNER merchant (same hash algorithm as src/lib/password.ts)',
    R('scripts/e2e-seed.mjs').includes('e2e.db') &&
    !R('scripts/e2e-seed.mjs').includes('smart-order.db') &&
    R('scripts/e2e-seed.mjs').includes('demo-store') &&
    R('scripts/e2e-seed.mjs').includes('role: "OWNER"') &&
    R('scripts/e2e-seed.mjs').includes('pbkdf2$${ITERATIONS}')],
];
for (const [name, okFlag] of P6_E2E) {
  if (okFlag) passed += 1;
  else failures.push(`phase6 browser-e2e gate FAILED: ${name}`);
}

// ── P10-1b (Phase 10 routes wave): the authed/interiors route-quality
// gates — the two defect families this wave closed at root, each with the
// family's own twin grammar as the proof of intent: (1) the status stamps
// rode a RAW 6%-black elevation literal with no night twin (invisible on
// the #152238 night-dispatch card) — now the elevation ladder rung
// (shadow-sm = --elev-1, flips via the .dark block, same reason the
// families flip); (2) four sub-44px controls on the money/CRUD paths
// (image-remove p-1 ≈22px, two onboarding chip-deletes ≈12px firing API
// DELETEs, the receipt-upload clear ≈16px) — each now carries the exact
// twin grammar its sibling surface already uses (size-8 + after:-inset-2
// from categories/settings image-remove; inline-flex min-h-11 from the
// login/register text CTAs). Consumption pins, same shape as the layers
// above. ─────────────────────────────────────────────────────────────
const P10_ROUTES = [
  ['P10-1b stamp elevation: status-badges (both maps) + the tracking chip ride the theme ladder (shadow-sm) — zero raw rgb(0_0_0/0.06) literals',
    R('src/components/shared/status-badges.tsx').includes('font-semibold shadow-sm') &&
    (R('src/components/shared/status-badges.tsx').match(/shadow-sm/g) || []).length >= 2 &&
    R('src/components/storefront/tracking-client.tsx').includes('font-semibold shadow-sm') &&
    !R('src/components/shared/status-badges.tsx').includes('shadow-[0_1px_2px_rgb(0_0_0/0.06)]') &&
    !R('src/components/storefront/tracking-client.tsx').includes('shadow-[0_1px_2px_rgb(0_0_0/0.06)]')],
  ['P10-1b image-remove hit floor: the product-editor tile button carries the categories/settings twin (size-8 + the ::after -inset-2 extension)',
    R('src/components/dashboard/product-editor.tsx').includes("flex size-8 items-center justify-center rounded-full bg-background/90 shadow after:absolute after:-inset-2 after:content-['']") &&
    R('src/app/dashboard/categories/page.tsx').includes('after:-inset-2') &&
    R('src/app/dashboard/settings/page.tsx').includes('after:-inset-2')],
  ['P10-1b onboarding chip deletes: categories + zones chips ride the 44px hit floor (size-8 + after:-inset-2) — destructive API DELETEs never below the floor',
    (R('src/app/dashboard/onboarding/page.tsx').match(/relative flex size-8 items-center justify-center rounded-full/g) || []).length >= 2 &&
    (R('src/app/dashboard/onboarding/page.tsx').match(/after:-inset-2 after:content-\[''\]/g) || []).length >= 2],
  ['P10-1b receipt-upload clear: the destructive text CTA rides the family 44px floor (inline-flex min-h-11 items-center)',
    R('src/components/payment/receipt-upload.tsx').includes('inline-flex min-h-11 shrink-0 items-center')],
  ['P10 bridge (coordinator): the --shadow-* THEME namespace is registered in @theme inline (sm/md/lg/xl → var(--elev-N)) — without it every plain shadow-* utility sits on the engine default in BOTH stages (rendered-proven on /track dark: 10% black, no night recipe). The ladder must stay bridged.',
    R('src/app/globals.css').includes('--shadow-sm: var(--elev-1);') &&
    R('src/app/globals.css').includes('--shadow-md: var(--elev-2);') &&
    R('src/app/globals.css').includes('--shadow-lg: var(--elev-3);') &&
    R('src/app/globals.css').includes('--shadow-xl: var(--elev-4);') &&
    /@theme inline[\s\S]{0,9000}--shadow-sm: var\(--elev-1\)/.test(R('src/app/globals.css'))],
];
for (const [name, okFlag] of P10_ROUTES) {
  if (okFlag) passed += 1;
  else failures.push(`p10-1b routes gate FAILED: ${name}`);
}

// ── report ───────────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error(`✗ Route & Node parity snapshot FAILED (${failures.length} assertion(s)):`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log(`✓ Route & Node parity snapshot: ${passed} assertions passed (globals.css + landing.css == the Operational Daylight contract + the Phase 6 chrome grammar + the CRUD screens adoption + the customer money path)`);
