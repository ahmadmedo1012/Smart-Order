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
          /* r152 Phase 5 daylight — paper ground #F7F7F4, navy ink #1B2A41 */
          background: "#F7F7F4",
          color: "#1B2A41",
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
              /* delivery-orange wash — the daylight accent at 12% */
              background: "rgba(209, 73, 0, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-hidden="true"
          >
            {/* P9-3-d (E5): the warning-sign emoji glyph retired — UI icons
                are SVG in this repo (lucide family). The lucide
                alert-triangle outline is inlined (this boundary ships no CSS
                bundle / no lucide chunk — the boundary's zero-dependency
                doctrine); stroke = the delivery-orange ink #B23E00, ≥4.5:1
                on the 12% wash. */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#B23E00"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
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
                height: 44,
                padding: "0 20px",
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 10,
                border: "none",
                /* r152 daylight CTA — delivery orange fill + white ink
                   (#FFFFFF on #D14900 ≈ 4.5:1); 44/13/600/r10 inline
                   (no CSS bundle on this boundary — values only). */
                background: "#D14900",
                color: "#FFFFFF",
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
                height: 44,
                padding: "0 20px",
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 10,
                border: "1px solid rgba(27,42,65,0.22)",
                background: "#FFFFFF",
                color: "#1B2A41",
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
