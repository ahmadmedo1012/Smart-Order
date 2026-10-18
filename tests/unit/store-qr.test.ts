// W6-B7 — the owner-side QR for the storefront link (W6-A4 gap #2).
//
// WHAT SHIPPED: StoreQRCard — the storefront URL rendered as a QR PNG
// (client-side, dynamic import of the `qrcode` npm package — the family
// precedent from Smart-Menu's SelfHostedQR/qrPngDataUrl), on the
// settings link-card + the onboarding final step, with a print-ready
// 512px PNG download. Zero external generators (the r106 qrserver
// retirement doctrine), zero network calls.
//
// TEST SHAPE: the component is client React ("use client" + browser
// APIs), so node --test pins the module CONTRACT (dependency posture,
// generation options, surfaces) via source contracts; the browser
// battery owns the rendered truth.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (p: string): string =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

const storeQr = read("../../src/components/dashboard/store-qr.tsx");
const settings = read("../../src/app/dashboard/settings/page.tsx");
const onboarding = read("../../src/app/dashboard/onboarding/page.tsx");
const pkg = JSON.parse(read("../../package.json"));

/* Comments stripped — the contract is about statements, not narration. */
const stripped = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");

test("dependency: qrcode ships as a runtime dependency with its types dev-side (the family precedent, mirrored from Smart-Menu)", () => {
  assert.ok(pkg.dependencies?.qrcode, "qrcode in dependencies");
  assert.ok(pkg.devDependencies?.["@types/qrcode"], "@types/qrcode in devDependencies");
});

test("generation: DYNAMIC import only — no static value import can drag the Node polyfill chain into the shared bundle (r121-G1 family law)", () => {
  // the ONLY import of the module is a type-only import (erased at build)
  assert.ok(storeQr.includes('import type QRCodeLib from "qrcode"'));
  assert.ok(!storeQr.includes('import QRCodeLib from "qrcode"'));
  assert.ok(!storeQr.includes('import * as QRCode from "qrcode"'));
  assert.ok(storeQr.includes('await import("qrcode")'));
});

test("generation: self-hosted only — no external QR service anywhere in the component (privacy: the store URL never leaves the browser)", () => {
  // comments stripped first — the r106 retirement story MENTIONS the old
  // service by name; the contract is about statements, not narration.
  const code = stripped(storeQr);
  assert.ok(!code.includes("qrserver"));
  assert.ok(!code.includes("api.qrserver"));
  assert.ok(!/https?:\/\/[^"\s]*qr/i.test(code));
});

test("generation: brand + scan reliability — r152 navy ink on true white, spec quiet zone, error correction M", () => {
  assert.ok(storeQr.includes('const QR_DARK = "#1B2A41"'));
  assert.ok(storeQr.includes('const QR_LIGHT = "#ffffff"'));
  assert.ok(storeQr.includes("margin: 4"));
  assert.ok(storeQr.includes('errorCorrectionLevel: "M"'));
});

test("export: the download is a 512px PNG data URL — same-origin so the download attribute is honored, honest product filename", () => {
  assert.ok(storeQr.includes("const QR_PNG_SIZE = 512"));
  assert.ok(storeQr.includes("toDataURL"));
  assert.ok(storeQr.includes('a.download = `smart-order-qr-${slug}.png`'));
});

test("surface: the settings link-card renders the QR below the link row (the scan-to-order story finally lands on the owner's side)", () => {
  assert.ok(settings.includes('import { StoreQRCard } from "@/components/dashboard/store-qr"'));
  assert.ok(settings.includes("<StoreQRCard storeUrl={storeUrl} slug={settings.slug} />"));
});

test("surface: the onboarding final step renders the QR once published — an unpublished QR opens the honest unavailable page, so it is not printed", () => {
  assert.ok(onboarding.includes('import { StoreQRCard } from "@/components/dashboard/store-qr"'));
  assert.ok(onboarding.includes("{published && slug && ("));
  assert.ok(onboarding.includes("<StoreQRCard"));
});

test("a11y: the rendered square is decorative (the URL it encodes is printed as text beside it — announcing both would read the URL twice)", () => {
  assert.ok(storeQr.includes('alt=""'));
  assert.ok(storeQr.includes('aria-hidden="true"'));
  // the skeleton never becomes a mismatched SSR image (effect-gated)
  assert.ok(storeQr.includes("React.useEffect"));
});
