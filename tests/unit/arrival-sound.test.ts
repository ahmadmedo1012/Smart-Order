// W6-B7 — the new-order arrival sound (W6-A4 gap #3: kitchen-proof
// notification). The orders page's arrival branch (20s visibility-gated
// poll → toast) gained a WebAudio two-tone beep: no new dependencies,
// opt-in (default OFF — documented in the module header), persisted in
// localStorage, riding the EXISTING arrival gating untouched.
//
// TEST SHAPE: the helper is import-safe (no top-level window access),
// so node --test pins the BEHAVIOR in the bare-node environment (no
// AudioContext → no-ops, never throws — the poll can never break) and
// the page WIRING via source contracts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  ARRIVAL_SOUND_STORAGE_KEY,
  playArrivalBeep,
  readArrivalSoundPref,
  writeArrivalSoundPref,
} from "../../src/lib/arrival-sound.ts";

const read = (p: string): string =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

const ordersPage = read("../../src/app/dashboard/orders/page.tsx");

test("behavior: in a bare-node environment (no AudioContext) the beep no-ops — false, never a throw", () => {
  assert.equal(playArrivalBeep(), false);
  assert.doesNotThrow(() => playArrivalBeep());
});

test("behavior: the preference helpers are storage-safe without a window — respectful OFF default, no throw on write", () => {
  assert.equal(readArrivalSoundPref(), false);
  assert.doesNotThrow(() => writeArrivalSoundPref(true));
  assert.doesNotThrow(() => writeArrivalSoundPref(false));
});

test("behavior: the storage key is namespaced to the product (the theme-toggle's localStorage idiom)", () => {
  assert.equal(ARRIVAL_SOUND_STORAGE_KEY, "smart-order:arrival-sound");
});

test("wiring: the beep rides the EXISTING arrival branch (same poll, same gating — only the sound is new), ref-gated so the toggle never churns the poll", () => {
  const arrivalIdx = ordersPage.indexOf("setNewCount((c) => c + arrivals.length)");
  assert.ok(arrivalIdx !== -1, "the arrival branch exists");
  const branch = ordersPage.slice(arrivalIdx, arrivalIdx + 600);
  assert.ok(
    branch.includes("if (soundOnRef.current) playArrivalBeep();"),
    "the beep fires inside the arrival branch, gated by the ref",
  );
  // the toggle is a REF mirror, not a loadFeed dep (the poll effect must not restart on flips)
  assert.ok(ordersPage.includes("const soundOnRef = React.useRef(false);"));
  const loadFeedDeps = ordersPage.match(
    /\}, \[businessId, status, payment, fulfillment, debouncedQ, page, router\]\);/,
  );
  assert.ok(loadFeedDeps, "loadFeed's deps are unchanged (no sound dep)");
});

test("wiring: the toggle is accessible and persisted — aria-pressed + a label that speaks the effect, localStorage via the helpers", () => {
  assert.ok(ordersPage.includes("aria-pressed={soundOn}"));
  assert.ok(ordersPage.includes('"إيقاف صوت الطلبات الجديدة"'));
  assert.ok(ordersPage.includes('"تشغيل صوت الطلبات الجديدة"'));
  assert.ok(ordersPage.includes("readArrivalSoundPref()"));
  assert.ok(ordersPage.includes("writeArrivalSoundPref(next)"));
});

test("wiring: the respectful default — OFF until the operator opts in (useState(false), pref read on mount only)", () => {
  assert.ok(ordersPage.includes("const [soundOn, setSoundOn] = React.useState(false);"));
});
