import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-host (Render/Docker) sets NEXT_OUTPUT=standalone; Vercel uses default output
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  outputFileTracingRoot: process.cwd(),
  // Disable dev indicator for clean captures
  devIndicators: false,
  images: {
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
    ];
  },
};

export default nextConfig;
