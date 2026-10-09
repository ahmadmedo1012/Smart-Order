import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-host (Render/Docker) sets NEXT_OUTPUT=standalone; Vercel uses default output
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  // Strip the `x-powered-by: Next.js` response header (smart-link hardening)
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  // Disable dev indicator for clean captures
  devIndicators: false,
  images: {
    // r132 (F1c, A9 SO-8): avif first — Next's default is webp-only; SM/SL
    // ship ['image/avif','image/webp']. Store logos/product images serve
    // ~20-30% smaller at equal quality.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [],
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    return [
      { source: "/(.*)", headers: security },
      { source: "/api/(.*)", headers: [...security, { key: "Cache-Control", value: "no-store" }] },
      { source: "/api/media/:path", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      /* r131 (F1, A8 perf — NO fonts cache header): the self-hosted IBM
       * Plex woff2 subsets (the two preloaded first-paint arabic files
       * + fonts.css) were the only heavy assets revalidating on every
       * visit. Filenames are family-weight-script qualified, so a
       * file's bytes only ever change alongside a deploy that renames
       * or re-points them — safe for immutable (smart-link r126 /
       * smart-menu round85-B7 pattern, exact). */
      { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
