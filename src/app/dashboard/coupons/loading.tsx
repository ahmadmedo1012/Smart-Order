import { CouponsSkeleton } from "@/components/dashboard/skeletons";

/** Route-level loading fallback (r131 F3, A5 P2-7) — shape-matched
 *  skeleton mirroring the coupons page's anatomy (header + card rows). */
export default function Loading() {
  return <CouponsSkeleton />;
}
