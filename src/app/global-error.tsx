"use client";

import { useEffect } from "react";

/* r133 (A13 S-05): root-layout error boundary — SO was the fleet's only
   gap (SM/SB/SL all ship one). A provider/font-level crash showed
   Next's default unstyled English screen — off-canon for an Arabic RTL
   product. SL's global-error.tsx pattern ported (inline styles only:
   this boundary replaces <html> itself, no CSS bundle, no layout). */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[smart-order] global error:", error?.message, error?.digest);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          /* Madarek night — ground #070B16, sand ink #F2EFE6 */
          background: "#070B16",
          color: "#F2EFE6",
          fontFamily: "system-ui, 'Segoe UI', Tahoma, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 460 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              margin: "0 auto 24px",
              /* gold wash — the dark accent at 15% */
              background: "rgba(233, 180, 76, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
            aria-hidden="true"
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 12px" }}>
            حدث خطأ في المنصة
          </h1>
          <p style={{ opacity: 0.75, lineHeight: 1.9, margin: "0 0 32px" }}>
            نعتذر — حدث خطأ تقني غير متوقع. حاول مرة أخرى، وإذا استمرت
            المشكلة تواصل معنا لاحقاً.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={reset}
              style={{
                height: 40,
                padding: "0 20px",
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 10,
                border: "none",
                /* Madarek .btn.accent dark — gold fill + dark ink
                   (#05070F on #E9B44C ≈ 10.6:1); 40/13/600/r10 inline
                   (no CSS bundle on this boundary — values only). */
                background: "#E9B44C",
                color: "#05070F",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              إعادة المحاولة
            </button>
            {/* Plain <a> (not <Link>) on purpose: this boundary replaces
                the whole <html> after a catastrophic client failure — a
                full page reload clears the broken client state;
                client-side nav would reuse the very runtime that just
                crashed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                height: 40,
                padding: "0 20px",
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.04)",
                color: "#F2EFE6",
                fontWeight: 600,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              العودة للرئيسية
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
