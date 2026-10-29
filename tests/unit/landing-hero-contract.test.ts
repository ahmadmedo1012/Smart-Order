// P31-D — the hero composition contract (the material-transformation wave).
//
// The VLM audit of the rendered landing (1440×900) read the hero as a
// globe BOLTED ON to the copy (a disconnected watermark chopped at the
// edges, an unfocused orange node soup, three competing CTAs) and the
// storefront triptych as a floating QR plate with illegible ~10px mock
// text. The wave answered in code; these pins hold the answer.
//
// Static source pins (the repo's unit-gate pattern — dependency-free
// node:test reading the shipped sources; no DOM): every pin names the
// defect it guards in plain words so a future regression reads as a
// sentence, not a selector.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = (p: string) => readFileSync(join(ROOT, p), "utf8");

const heroSection = R("src/components/landing/hero-section.tsx");
const header = R("src/components/landing/LandingHeader.tsx");
const finale = R("src/components/landing/FinaleCta.tsx");
const globeMount = R("src/components/landing/GlobeMount.tsx");
const globeScene = R("src/components/landing/GlobeScene.tsx");
const storefrontScene = R("src/components/landing/storefront-scene.tsx");
const landingCss = R("src/app/landing.css");

/* comment-stripped source (the parity convention: only shipped strings
   count — a retired class name may survive in a comment that documents
   its retirement) */
const stripped = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n]*$/gm, "$1");

test("CTA hierarchy: the hero viewport owns exactly ONE primary — ابدأ مجاناً", () => {
  // The hero's own action row: one solid primary + one outline secondary.
  const actions = heroSection.slice(
    heroSection.indexOf("ln-keep-actions"),
    heroSection.indexOf("ln-keep-pill"),
  );
  const solidCount = (actions.match(/ln-btn-solid/g) ?? []).length;
  const ghostCount = (actions.match(/ln-btn-ghost/g) ?? []).length;
  assert.equal(solidCount, 1, "the hero action row must carry exactly one ln-btn-solid");
  assert.equal(ghostCount, 1, "the hero action row must carry exactly one ln-btn-ghost");
  assert.ok(actions.includes('href="/register"') && actions.includes('href="/store/demo-store"'), "the hero hrefs stay the real pair");
});

test("CTA hierarchy: the header's register affordance is the quiet text rung, not a second filled pill", () => {
  // The desktop header CTA block (between .landing-header-cta and the burger).
  const ctaBlock = header.slice(
    header.indexOf('className="landing-header-cta"'),
    header.indexOf('className="landing-burger"'),
  );
  assert.ok(
    ctaBlock.includes('href="/register"') && ctaBlock.includes("ln-btn-text"),
    "the header register link keeps its href and rides .ln-btn-text",
  );
  assert.ok(!ctaBlock.includes("ln-btn-gold"), "no filled gold pill fights the hero's solid primary in the first viewport");
  // The text rung carries a real base style (the r131 drop is undone).
  assert.ok(/\.landing \.ln-btn-text \{/.test(landingCss), ".ln-btn-text ships a base rule in landing.css");
});

test("CTA hierarchy: the finale keeps exactly one primary + one secondary", () => {
  const actions = finale.slice(finale.indexOf("ln-cta-actions"));
  assert.equal((actions.match(/<MagneticGoldLink/g) ?? []).length, 1, "one gold primary (the MagneticGoldLink rung) in the finale");
  assert.equal((actions.match(/ln-btn-ghost/g) ?? []).length, 1, "one outline secondary in the finale");
});

test("globe↔hero integration: the bleed is a deliberate DISSOLVE, never a raw viewport chop", () => {
  // The stage: vw-proportional geometry (58vw sphere, -7vw right offset —
  // the sphere's lower-left limb crosses the copy column's edge at every
  // width ≥1024) + the top/bottom dissolve mask.
  const stage = landingCss.slice(
    landingCss.indexOf(".landing .ln-globe-stage {"),
    landingCss.indexOf(".landing .ln-globe-stage .ln-globe-canvas"),
  );
  assert.ok(stage.includes("inline-size: min(58vw,"), "the sphere scales with the viewport");
  assert.ok(stage.includes("right: -7vw;"), "the right bleed offset scales with the viewport");
  assert.ok(
    /mask-image: linear-gradient\(to bottom, transparent 0%, black 15%, black 90%, transparent 100%\)/.test(stage),
    "the stage dissolves at its top and bottom bands",
  );
  // The canvas: BOTH horizontal dissolves in one engine-portable gradient
  // (desktop only — the mobile backdrop never bleeds).
  // · RIGHT — the sphere melts before the viewport edge: the -7vw overshoot
  //   is 12.07% of the 58vw stage, so the viewport edge always falls at
  //   local x≈88%, inside the ≤84% transparent rung.
  // · LEFT — the AA sweep: RTL lines flush right, so the eyebrow, the h1's
  //   dim line, the punchline AND the sub-copy all BEGIN at the copy
  //   column's edge (local x 10.2-14.5% across 1024-1920) — over a
  //   near-solid limb-dot fringe (canvas α≈.28). The mask holds ≤0.13
  //   through the whole text band (floor at 16%), dropping the fringe to
  //   ≈.036 behind the text: eyebrow ≥5:1 both stages (4.5 needed), h1 dim
  //   ≥3.4:1 (3.0), sub ≥6:1, cream punchline ≥10:1.
  const canvasMask =
    /@media \(min-width: 1024px\) \{\s*\/\*[\s\S]*?\.landing \.ln-globe-canvas \{\s*-webkit-mask-image: linear-gradient\(to right, transparent 0%, rgba\(0, 0, 0, 0\.13\) 16%, black 26%, black 70%, transparent 84%\);\s*mask-image: linear-gradient\(to right, transparent 0%, rgba\(0, 0, 0, 0\.13\) 16%, black 26%, black 70%, transparent 84%\);/.test(
      landingCss,
    );
  assert.ok(canvasMask, "the canvas dissolves both horizontal bands at ≥1024px — right before the viewport edge, left before the copy text (AA)");
  // The floating «اسحب للتدوير» hint chip is gone (bolted-on chrome).
  assert.ok(!globeMount.includes("ln-globe-hint"), "the floating drag-hint chip retired");
  assert.ok(!/\.ln-globe-hint \{/.test(landingCss), "the hint chip's CSS retired with it");
});

test("globe focal law: the hub is data-derived and ONE route pulses at a time", () => {
  // The hub index comes from globe-data's hub flag — never a hardcoded id.
  assert.ok(
    globeScene.includes("GLOBE_CITIES as readonly GlobeCity[]).find((c) => c.hub)"),
    "the hub is derived from the data's hub flag",
  );
  // One live route at a time, idle-only, never under reduced motion.
  assert.ok(
    globeScene.includes("!reduced && selIdx < 0 ? Math.floor(clock / LIVE_ROUTE_MS) % ROUTES.length : -1"),
    "exactly one marching-dash route cycles, idle only",
  );
  assert.ok(globeScene.includes("if (live) {"), "only the live route dashes");
});

test("explorer dock: idle pill vs franked stamp — the states differ by shape+fill+border, not hue", () => {
  assert.ok(
    /\.landing \.ln-globe-chip \{[^}]*border-radius: var\(--ln-radius-pill\);/.test(landingCss),
    "the idle chip is the recessed round pill",
  );
  const pressed = landingCss.slice(
    landingCss.indexOf('.landing .ln-globe-chip[aria-pressed="true"] {'),
    landingCss.indexOf(".landing .ln-globe-chip-dot {"),
  );
  assert.ok(pressed.includes("background: var(--ln-lime);"), "the selected chip fills with the route orange");
  assert.ok(pressed.includes("border: 1px solid var(--ln-on-lime);"), "the selected chip carries the on-lime ink edge");
  assert.ok(pressed.includes("border-radius: 2px;"), "the selected chip is the squared franked stamp");
  // The keyboard ring survives (2px lime outline, offset outside the fill).
  assert.ok(
    /\.landing \.ln-globe-chip:focus-visible \{\s*outline: 2px solid var\(--ln-lime\);\s*outline-offset: 2px;/.test(landingCss),
    "the chip focus ring is pinned",
  );
});

test("overview-return contract: Escape + click-outside return the network to overview", () => {
  assert.ok(
    globeMount.includes("if (e.key === 'Escape') setSelectedId(null)"),
    "Escape returns to the overview state",
  );
  assert.ok(
    globeMount.includes("!explorerRef.current.contains(e.target as Node)"),
    "a pointer press outside the explorer (stage + dock) returns to overview",
  );
  assert.ok(
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.landing \.ln-btn-text:active \{ color: var\(--ln-on-lime\); \}/.test(landingCss),
    "the text rung stays readable under the pinned RM press tint",
  );
});

test("interaction contract: the canvas never hijacks the page scroll; the dock is the keyboard path", () => {
  // touch-action: pan-y — vertical touch pans keep scrolling the page; the
  // drag gesture is horizontal-only (a wheel needs no pin: the canvas
  // registers no wheel listener at all — verified by the selectCalls pin
  // below plus the absence of any addEventListener("wheel")).
  const canvasRule = landingCss.slice(
    landingCss.indexOf(".landing .ln-globe-canvas {"),
    landingCss.indexOf(".landing .ln-globe-canvas.is-dragging"),
  );
  assert.ok(canvasRule.includes("touch-action: pan-y"), "vertical touch scrolls pass through the canvas");
  assert.ok(!/addEventListener\(['"]wheel['"]/.test(globeScene), "the canvas registers no wheel listener — the wheel always scrolls the page");
  // The stage wrapper never blocks the page; only the canvas is a surface.
  const stageRule = landingCss.slice(
    landingCss.indexOf(".landing .ln-globe-stage {"),
    landingCss.indexOf(".landing .ln-globe-stage .ln-globe-canvas"),
  );
  assert.ok(stageRule.includes("pointer-events: none"), "the stage wrapper never blocks the page");
  assert.ok(
    landingCss.includes(".landing .ln-globe-stage .ln-globe-canvas { pointer-events: auto; }"),
    "only the canvas is the pointer surface",
  );
  // The keyboard path: real <button> chips carrying aria-pressed —
  // Tab/Enter/Space reach every city without the canvas.
  assert.ok(
    globeMount.includes('type="button"') && globeMount.includes("aria-pressed={active}"),
    "the chips are real buttons with aria-pressed — Tab/Enter/Space reachable",
  );
  // Hover NEVER selects: selection flows exclusively through the click
  // path (pointerup after <3px travel) — the one selectCb call site.
  const selectCallSites = [...globeScene.matchAll(/selectCb\.current\(/g)];
  assert.equal(selectCallSites.length, 1, "selection fires from exactly one path — the click/tap handler, never hover");
});

test("storefront truth: the mock text never renders below the 12px legibility floor", () => {
  const sizes = [...storefrontScene.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)].map((m) => Number(m[1]));
  assert.ok(sizes.length > 0, "the mock uses explicit px sizes (sanity)");
  const under = sizes.filter((s) => s < 12);
  assert.deepEqual(under, [], `no mock text below 12px (found: ${under.join(", ")})`);
  // The seeded-truth data contract stays verbatim (names + prices).
  assert.ok(storefrontScene.includes('"بيتزا مارغريتا"') && storefrontScene.includes("45_000"), "the seeded product names/prices stay verbatim");
  assert.ok(storefrontScene.includes("وسط المدينة") && storefrontScene.includes("5_000"), "the seeded zone + fee stay verbatim");
});

test("storefront truth: nothing bobs — the triptych is grounded, the QR plate carries the scan route", () => {
  // The animate-float-slow wrappers retired from every landing component
  // (comment-stripped: a retirement note may name the dead class).
  const landingDir = join(ROOT, "src", "components", "landing");
  const bobbing = readdirSync(landingDir).filter(
    (f) => f.endsWith(".tsx") && stripped(R(`src/components/landing/${f}`)).includes("animate-float-slow"),
  );
  assert.deepEqual(bobbing, [], `no landing component bobs (found: ${bobbing.join(", ")})`);
  // The scan route: dashed hairline + node dot bridging the column gap.
  assert.ok(
    /@media \(min-width: 921px\) \{[\s\S]*?\.landing \.ln-store-qr::after \{[\s\S]*?border-block-start: 1px dashed var\(--ln-lime-text\);/.test(landingCss),
    "the QR→phone dashed scan route is pinned (desktop triptych)",
  );
  assert.ok(
    /\.landing \.ln-store-qr::before \{[\s\S]*?border-radius: 50%;[\s\S]*?background: var\(--ln-lime-text\);/.test(landingCss),
    "the scan route's origin node dot is pinned",
  );
  // The ground plane: a soft low-opacity shadow under both side plates.
  assert.ok(
    /\.landing \.ln-store-qr \.ln-plate,\s*\n\s*\.landing \.ln-store-cart \.ln-plate \{[\s\S]*?0 22px 34px -20px rgb\(27 42 65 \/ 0\.30\);/.test(landingCss),
    "the side plates sit on a soft ground plane",
  );
});
