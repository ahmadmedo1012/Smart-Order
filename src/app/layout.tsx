import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://smart-order.onrender.com"
  ),
  title: {
    default: "سمارت أوردر — منصة الطلبات الرقمية للأعمال في ليبيا",
    template: "%s | سمارت أوردر",
  },
  description:
    "أنشئ متجرك الرقمي واستقبل الطلبات عبر الويب وواتساب. لوحة تحكم كاملة للطلبات والمنتجات والتوصيل والمدفوعات — مصممة للأعمال الليبية.",
  keywords: ["طلبات", "متجر رقمي", "ليبيا", "توصيل", "طلب أونلاين", "سمارت أوردر", "Smart Order"],
  applicationName: "سمارت أوردر",
  openGraph: {
    type: "website",
    locale: "ar_LY",
    siteName: "سمارت أوردر",
    title: "سمارت أوردر — منصة الطلبات الرقمية",
    description: "أنشئ متجرك الرقمي واستقبل الطلبات عبر الويب وواتساب — مصممة للأعمال الليبية.",
  },
  twitter: {
    card: "summary_large_image",
    title: "سمارت أوردر — منصة الطلبات الرقمية",
    description: "أنشئ متجرك الرقمي واستقبل الطلبات عبر الويب وواتساب.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#bc4700" },
    { media: "(prefers-color-scheme: dark)", color: "#010000" },
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
        <link rel="preload" href="/fonts/cairo-arabic.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/readex-pro.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="stylesheet" href="/fonts/fonts.css" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen flex flex-col">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors closeButton dir="rtl" />
        </ThemeProvider>
      </body>
    </html>
  );
}
