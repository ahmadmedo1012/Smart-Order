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
 * Suite: 197.
 */
import { readFileSync, readdirSync } from 'node:fs';
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
  '--accent-foreground': '#E9B44C', // Madarek --accent-ink (chains --c-copper-ink)
  '--accent-soft': '#2C2312', // Madarek --accent-soft (chains --c-copper-bg)
  '--c-copper-bg': '#2C2312', // Madarek --accent-soft (family copper ground)
};
const ACCENT_LIGHT = {
  '--primary': '#B57438',
  '--primary-foreground': '#1A0F06',
  '--accent-foreground': '#5C3416', // chains --c-copper-deep
  '--accent-soft': '#F4E4D2', // chains --c-copper-bg
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
const rawSheet = readFileSync(new URL('../src/components/ui/sheet.tsx', import.meta.url), 'utf8');
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
  ['sheet consumes the motion + z ladders (z-(--z-sheet) + duration-(--t-base) + open duration-(--t-slow) + ease-smooth)',
    rawSheet.includes('z-(--z-sheet)') && rawSheet.includes('duration-(--t-base)') &&
    rawSheet.includes('data-[state=open]:duration-(--t-slow)') && rawSheet.includes('ease-smooth')],
  ['dropdown-menu consumes the z ladder + elevation bridge (z-(--z-dropdown) + rounded-md + shadow-md)',
    rawDropdown.includes('z-(--z-dropdown)') && rawDropdown.includes('rounded-md') &&
    rawDropdown.includes('shadow-md')],
  ['input consumes the motion ladder + the token-based focus halo (duration-(--t-fast) + ring-ring/20 + accent color-mix halo)',
    rawInput.includes('duration-(--t-fast)') &&
    rawInput.includes('focus-visible:ring-ring/20') &&
    rawInput.includes('focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_22%,transparent)]')],
];
for (const [name, okFlag] of CONSUMPTION) {
  if (okFlag) passed += 1;
  else failures.push(`consumption gate FAILED: ${name}`);
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

// ── report ───────────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error(`✗ Madarek parity snapshot FAILED (${failures.length} assertion(s)):`);
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log(`✓ Madarek parity snapshot: ${passed} assertions passed (src/app/globals.css == canonical tokens.css values)`);
