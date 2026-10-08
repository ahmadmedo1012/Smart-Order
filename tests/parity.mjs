#!/usr/bin/env node
/**
 * test(r126): Madarek parity snapshot — pin the canonical design tokens.
 * (Task 11-a, Wave B; source of truth: madarek/frontend/src/styles/tokens.css
 * — §1 dark · §2 light · §3 radius · §4 motion · §5 elevation. The old
 * download/madarek-reference-digest.md citations were removed with the
 * junk download/ dir in r126; the tokens.css SSOT stands alone.)
 *
 * Run: `npm run test:parity` (plain node — Smart-Order ships no unit-test
 * runner; its e2e script targets a live dev server, so this is a
 * dependency-free node script). Exit code 1 on any drift — CI-able.
 *
 * HOW IT READS THE CSS
 * ─────────────────────
 * - Only the theme blocks matter: :root (night, the default) and .light
 *   (paper) — extracted brace-matched from the TOP LEVEL so @media
 *   (prefers-contrast / reduced-motion) overrides can never mask the resting
 *   values. The radius ladder lives in the Tailwind `@theme inline` block —
 *   extracted the same way.
 * - The light scope is the real cascade: {.light} overlays {:root}; tokens
 *   .light does not redefine (radius, motion, families, elev…) inherit :root.
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
 * Every pinned literal below was cross-checked against the live SSOT by
 * scripts/parity_matrix.py (download/madarek-parity-matrix.md) — 127/127
 * present tokens green at the time of authoring.
 */
import { readFileSync } from 'node:fs';

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

const dark = parseDecls(block(':root'));
const theme = themeDecls();
// real cascade: .light overlays :root; everything else inherits
const light = { ...dark, ...parseDecls(block('.light')) };

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

const GROUNDS_DARK = {
  '--background': '#070B16', // Madarek --bg (neutral-50 night)
  '--card': '#0D1428', // Madarek --surface (neutral-0)
  '--secondary': '#121A36', // Madarek --bg-soft / --surface-2 (neutral-100)
  '--foreground': '#F2EFE6', // Madarek --text (neutral-900 sand)
  '--muted-foreground': '#C3C8DC', // Madarek --text-secondary
  '--placeholder-text': '#8E97B8', // Madarek --text-muted (neutral-500)
  '--border': '#1B2444', // Madarek hairline (neutral-200)
};
const GROUNDS_LIGHT = {
  '--background': '#FBFAF9',
  '--card': '#FFFFFF',
  '--secondary': '#F7F6F3',
  '--foreground': '#191918',
  '--muted-foreground': '#4F4D48',
  '--placeholder-text': '#6E6C65', // Madarek --text-muted light (WCAG literal)
  '--border': '#E9E7E2',
};
const ACCENT_DARK = {
  '--primary': '#E9B44C', // Madarek --accent (their --accent is the 15% wash twin)
  '--primary-foreground': '#05070F', // Madarek --accent-fg
  '--accent-foreground': '#E9B44C', // Madarek --accent-ink
  '--c-copper-bg': '#2C2312', // Madarek --accent-soft (family copper ground)
};
const ACCENT_LIGHT = {
  '--primary': '#B57438',
  '--primary-foreground': '#1A0F06',
  '--accent-foreground': '#5C3416',
  '--c-copper-bg': '#F4E4D2',
};
const STATUS_DARK = {
  '--success': '#7FD39A', '--success-soft': '#0F241C', '--success-ink': '#7FD39A',
  '--warning': '#ECC97D', '--warning-soft': '#2C2410', '--warning-ink': '#ECC97D',
  '--destructive': '#F0938F', '--destructive-soft': '#2C1620', '--destructive-ink': '#F0938F',
  '--info': '#8FBBF2', '--info-soft': '#14213A', '--info-ink': '#8FBBF2',
};
const STATUS_LIGHT = {
  '--success': '#4FA66D', '--success-soft': '#DCF1E2', '--success-ink': '#1F4F30',
  '--warning': '#D6A330', '--warning-soft': '#FCF1CD', '--warning-ink': '#6B4C0B',
  '--destructive': '#DD6E78', '--destructive-soft': '#FCE0E2', '--destructive-ink': '#6B2128',
  '--info': '#5C8FCE', '--info-soft': '#DDEBF7', '--info-ink': '#1F3D63',
};
const FAMILIES_DARK = {
  peach: ['#2C1A16', '#F2A07F', '#FCD9C4'],
  mint: ['#0F241C', '#7FD39A', '#C9EAD3'],
  lavender: ['#221B3A', '#B7A0F4', '#DCD2F9'],
  sky: ['#14213A', '#8FBBF2', '#C9DCEE'],
  yellow: ['#2C2410', '#ECC97D', '#F8E5B5'],
  rose: ['#2C1620', '#F0938F', '#FACDD2'],
  sand: ['#241F14', '#D9C18C', '#EFE2C5'],
  grey: ['#161D33', '#A9B0C8', '#D5DAE8'],
  copper: ['#2C2312', '#E9B44C', '#F5D48A'],
};
const FAMILIES_LIGHT = {
  peach: ['#FFE9DC', '#E07856', '#6B2D1A'],
  mint: ['#DCF1E2', '#4FA66D', '#1F4F30'],
  lavender: ['#ECE6FA', '#8A6FE0', '#3F2D7A'],
  sky: ['#DDEBF7', '#5C8FCE', '#1F3D63'],
  yellow: ['#FCF1CD', '#D6A330', '#6B4C0B'],
  rose: ['#FCE0E2', '#DD6E78', '#6B2128'],
  sand: ['#F1ECDF', '#B59868', '#5A4623'],
  grey: ['#EFECE7', '#6B665E', '#2D2A24'],
  copper: ['#F4E4D2', '#B57438', '#5C3416'],
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
  '--elev-1': '0 1px 2px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.04)',
  '--elev-2': '0 4px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
  '--elev-3': '0 8px 16px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)',
  '--elev-4': '0 16px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)',
  '--elev-5': '0 32px 64px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.08)',
};
const ELEV_LIGHT = {
  '--elev-1': '0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.06)',
  '--elev-2': '0 4px 8px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
  '--elev-3': '0 8px 16px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.05)',
  '--elev-4': '0 16px 32px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06)',
  '--elev-5': '0 32px 64px rgba(0,0,0,0.12), 0 16px 32px rgba(0,0,0,0.08)',
};

// ── assertions ───────────────────────────────────────────────────────────────

pinAll(dark, 'dark', GROUNDS_DARK);
pinAll(light, 'light', GROUNDS_LIGHT);
pinAll(dark, 'dark', ACCENT_DARK);
pinAll(light, 'light', ACCENT_LIGHT);
pinAll(dark, 'dark', STATUS_DARK);
pinAll(light, 'light', STATUS_LIGHT);
pin(dark, 'glass-dark', '--glass-bg', 'rgba(11, 16, 32, 0.78)');
pin(light, 'glass-light', '--glass-bg', 'rgba(251, 250, 249, 0.78)');

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
pinAll(dark, 'elev-dark', ELEV_DARK);
pinAll(light, 'elev-light', ELEV_LIGHT);

// ── r126 pins: focus contract + z-order ladder (audit P4-A5 ring gap) ───────
// The light --ring was raw copper #B57438 = 3.65:1 (FAIL); the Madarek
// contract (rubric §B23) requires ≥4.5:1 in BOTH themes. The 2px/2px ring
// rides --state-focus-ring-* tokens, mirrored by the shadcn --ring bridge.
const FOCUS_DARK = {
  '--ring': '#E9B44C',
  '--state-focus-ring-color': '#C9962F', // Madarek dark --accent-strong (7.87:1)
  '--state-focus-ring-width': '2px',
  '--state-focus-ring-offset': '2px',
};
const FOCUS_LIGHT = {
  '--ring': '#5C3416',
  '--state-focus-ring-color': '#5C3416', // Madarek light --accent-strong (10.29:1)
  '--state-focus-ring-width': '2px',
  '--state-focus-ring-offset': '2px',
};
pinAll(dark, 'focus-dark', FOCUS_DARK);
pinAll(light, 'focus-light', FOCUS_LIGHT);

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
const CONSUMPTION = [
  ['globals :focus-visible consumes --state-focus-ring-* (the ONE focus language)',
    /outline: var\(--state-focus-ring-width, 2px\) solid var\(--state-focus-ring-color, var\(--ring\)\)/.test(rawCss) &&
    rawCss.includes('outline-offset: var(--state-focus-ring-offset, 2px)')],
  ['sonner toaster pinned to the --z-toast rung',
    rawCss.includes('[data-sonner-toaster]') && rawCss.includes('z-index: var(--z-toast)')],
  ['button consumes the motion ladder (duration-(--t-fast) + ease-smooth)',
    rawButton.includes('duration-(--t-fast)') && rawButton.includes('ease-smooth')],
  ['dialog consumes the motion + z ladders (duration-(--t-base) + z-(--z-modal))',
    rawDialog.includes('duration-(--t-base)') && rawDialog.includes('z-(--z-modal)')],
];
for (const [name, okFlag] of CONSUMPTION) {
  if (okFlag) passed += 1;
  else failures.push(`consumption gate FAILED: ${name}`);
}

// ── report ───────────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error(`✗ Madarek parity snapshot FAILED (${failures.length} assertion(s)):`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log(`✓ Madarek parity snapshot: ${passed} assertions passed (src/app/globals.css == canonical tokens.css values)`);
