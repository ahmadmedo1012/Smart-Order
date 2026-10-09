import type { Metadata, Viewport } from "next";
import { Providers } from "@/app/providers";
import "./globals.css";

/** Canonical production origin (order.smart-link.ly, Vercel + Neon).
 * The old smart-order.onrender.com host is retired — keep OG/canonical/
 * sitemap URLs pointed at the live domain even when the env var is
 * unset (e.g. preview deployments). */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://order.smart-link.ly";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  /* r132 (F1c, A11 P2-2): root canonical + og:url — the marketing pages
     (landing/pricing/terms/privacy) inherit the home canonical contract;
     per-page canonicals override where set (store/[slug], the three
     marketing routes). SL's root-canonical pattern. */
  alternates: { canonical: "/" },
  /* r131 (F1, A7 P2-6 — title pipeline): the default + template pair
     (Arabic chrome "%s | سمارت أوردر") already shipped; per-page
     `export const metadata` (owned by the page agents) inherits the
     template so every route that opts in gets consistent chrome —
     history tabs and screen-reader page lists stop reading
     identically. */
  title: {
    default: "سمارت أوردر — منصة الطلبات الرقمية للأعمال في ليبيا",
    template: "%s | سمارت أوردر",
  },
  description:
    "أنشئ متجرك الرقمي واستقبل الطلبات عبر الويب وواتساب. لوحة تحكم كاملة للطلبات والمنتجات والتوصيل والمدفوعات — مصممة للأعمال الليبية.",
  keywords: ["طلبات", "متجر رقمي", "ليبيا", "توصيل", "طلب أونلاين", "سمارت أوردر", "Smart Order"],
  openGraph: {
    type: "website",
    /* r133 (R11 / A12 S13): ar_AR — Facebook scrapers drop ar_LY. */
    locale: "ar_AR",
    url: "/",
    siteName: "سمارت أوردر",
    title: "سمارت أوردر — منصة الطلبات الرقمية",
    description: "أنشئ متجرك الرقمي واستقبل الطلبات عبر الويب وواتساب — مصممة للأعمال الليبية.",
    /* r134 (W2 #18): family og:image alt form — «الربط الذكي» prefix +
       the one-word Latin product brand (SmartLink/SmartBot og alt
       convention); was «الربط الذكي — سمارت أوردر» (AR/brand split from
       the XC audit). */
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "الربط الذكي — SmartOrder" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "سمارت أوردر — منصة الطلبات الرقمية",
    description: "أنشئ متجرك الرقمي واستقبل الطلبات عبر الويب وواتساب.",
    images: ["/og-default.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  applicationName: "Smart Order",
  appleWebApp: {
    capable: true,
    title: "Smart Order",
    statusBarStyle: "default",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFAF9" },
    { media: "(prefers-color-scheme: dark)", color: "#070B16" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Pre-paint theme boot — no flash. Family standard: DARK default,
            light only when explicitly stored (mirrors Smart Menu/SmartBot). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('smart-order-theme');if(t==='light'){document.documentElement.classList.add('light')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`,
          }}
        />
        {/* Madarek parity: preload the two FIRST-PAINT arabic subsets
            (400 + 700, ~86KB) — fonts.css uses font-display: swap; preloading
            moves the font swap ahead of the first contentful paint. */}
        <link rel="preload" href="/fonts/plex-sans-arabic-400-normal-arabic.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/plex-sans-arabic-700-normal-arabic.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body
        className="font-sans antialiased bg-background text-foreground min-h-screen flex flex-col"
        style={{ background: "var(--background-radial), var(--background)" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
