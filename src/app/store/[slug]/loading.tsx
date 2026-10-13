import { StorefrontSkeleton } from "@/components/storefront/skeletons";

/**
 * Route-level loading fallback (r151 LIVE-AUDIT-SO1 P3-4) — shape-matched
 * skeleton mirroring the real storefront anatomy (header 16 / search 44 /
 * product grid), reusing the existing StorefrontSkeleton (the same surface
 * the client paints while its freshness refresh resolves — r132-F1a). So
 * client-side navigation into /store/[slug] paints the skeleton instead of
 * the stale route, the dashboard loading.tsx pattern (r131 F3).
 */
export default function Loading() {
  return <StorefrontSkeleton />;
}
