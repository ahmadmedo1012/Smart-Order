"use client";

// W6-B7 (W6-A4 gap #2 — the owner-side QR): the landing sells the
// scan-to-order story, yet the owner who publishes got a text URL with
// a copy button. In the Libyan market the QR-on-the-counter IS the
// distribution channel; making the owner find a third-party generator
// is time-to-first-order friction the product already promises away.
//
// APPROACH (family precedent, mirrored from Smart-Menu's
// SelfHostedQR/qrPngDataUrl — r106-N2/r121-G-1): client-side generation
// via the `qrcode` npm package, loaded with a DYNAMIC import inside the
// effect/handler only (a static `import QRCode from "qrcode"` drags the
// package's Node polyfill chain — crypto-browserify/bn.js/Buffer — into
// every route chunk that links this component; the dynamic import keeps
// it out of the shared bundle entirely). Zero network calls, zero
// third-party generators (the r106 api.qrserver.com retirement was
// exactly about not shipping every store's URL to an external service).
//
// BRAND: the QR ink is the r152 «Operational Daylight» navy #1B2A41
// (the token VALUE --foreground carries — the qrcode lib paints PNG
// pixels, so it needs a concrete hex, not a CSS var; the same
// one-step-from-the-token justification Smart-Menu's #8A2B1D copper
// rides). The paper is pure #ffffff — deliberately NOT the cream
// background: scanners and printers resolve highest on true white, the
// same print-reliability choice Smart-Menu made.
//
// EXPORT: 512px PNG (print-ready at 300dpi for a ~43mm counter card)
// via a data URL — same-origin, so the `download` attribute is honored
// directly with no blob round-trip. The print asset is the PNG itself;
// no print CSS was added (the existing @media print block exists for
// kitchen receipts, a different flow).

import * as React from "react";
import type QRCodeLib from "qrcode";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

/** r152 navy ink — see the component header for the token-value story. */
const QR_DARK = "#1B2A41";
/** Print-reliable true white (scanners resolve contrast best). */
const QR_LIGHT = "#ffffff";
/** Rendered square edge (display) = 512px source (print asset). */
const QR_PNG_SIZE = 512;
const QR_DISPLAY_SIZE = 160;

/** QR PNG data URL for downloads (same options as the render above). */
export async function qrPngDataUrl(value: string, size = QR_PNG_SIZE): Promise<string> {
  // dynamic — same deferred-load reason as the effect below.
  const mod: typeof QRCodeLib = await import("qrcode");
  return mod.toDataURL(value, {
    width: size,
    errorCorrectionLevel: "M",
    margin: 4, // spec quiet zone — scanners need it
    color: { dark: QR_DARK, light: QR_LIGHT },
  });
}

/**
 * The owner's storefront QR card: the scannable square + a
 * «تنزيل للطباعة» button. Rendered client-side only (the effect gates
 * generation past mount — SSR paints the skeleton, never a mismatched
 * image). Empty `storeUrl` keeps the skeleton (slug not loaded yet).
 */
export function StoreQRCard({
  storeUrl,
  slug,
}: {
  storeUrl: string;
  slug: string;
}) {
  const [src, setSrc] = React.useState("");
  const [downloading, setDownloading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    if (!storeUrl) {
      setSrc("");
      return;
    }
    qrPngDataUrl(storeUrl)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        /* generation failed (e.g. unsupported URL length) — the skeleton
           stays; the copy/open affordances around the card still work. */
        if (!cancelled) setSrc("");
      });
    return () => {
      cancelled = true;
    };
  }, [storeUrl]);

  const download = async () => {
    if (!storeUrl || downloading) return;
    setDownloading(true);
    try {
      const url = await qrPngDataUrl(storeUrl);
      const a = document.createElement("a");
      a.href = url; // data URL → same-origin → the download attribute is honored
      a.download = `smart-order-qr-${slug}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("تم تنزيل رمز QR");
    } catch {
      toast.error("تعذّر توليد الرمز");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {src ? (
        /* Decorative on purpose: the link IT encodes is printed as text
           right beside this card (the code element above) — announcing
           both would read the same URL twice. Raw <img> (Smart-Menu
           SelfHostedQR precedent): the src is a data: URL, which
           next/image does not support — there is no remote asset to
           optimize, and the pixels are already exactly 512×512. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          aria-hidden="true"
          width={QR_PNG_SIZE}
          height={QR_PNG_SIZE}
          style={{ width: QR_DISPLAY_SIZE, height: QR_DISPLAY_SIZE, maxWidth: "100%" }}
          className="shrink-0 rounded-lg border border-border bg-white"
          data-testid="store-qr"
        />
      ) : (
        <div
          aria-hidden="true"
          style={{ width: QR_DISPLAY_SIZE, height: QR_DISPLAY_SIZE, maxWidth: "100%" }}
          className="shrink-0 animate-pulse rounded-lg border border-border bg-muted/50"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">رمز QR لمتجرك</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          اطبعه وضعه على الكاونتر أو الطاولات — المسح يفتح متجرك مباشرة.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2.5"
          onClick={download}
          disabled={downloading || !src}
          loading={downloading}
        >
          <Download className="size-4 me-1.5" aria-hidden="true" />
          تنزيل للطباعة (PNG)
        </Button>
      </div>
    </div>
  );
}
