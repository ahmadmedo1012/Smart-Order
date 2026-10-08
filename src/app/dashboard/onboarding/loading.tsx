import { OnboardingSkeleton } from "@/components/dashboard/skeletons";

/**
 * Route-level loading fallback (r131 F3, A5 P2-7 / A11 SO-2) —
 * shape-matched skeleton mirroring the real page anatomy (SM
 * DashboardSkeletons pattern), so client-side navigation into this
 * segment paints the page skeleton instead of the stale route.
 */
export default function Loading() {
  return <OnboardingSkeleton />;
}
