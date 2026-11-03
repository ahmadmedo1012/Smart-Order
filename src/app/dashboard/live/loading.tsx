import { LiveBoardSkeleton } from "@/components/dashboard/skeletons";

/** Route-level loading fallback (r131 F3, A5 P2-7) — shape-matched
 *  skeleton mirroring the live board's anatomy (header + toolbar + the
 *  five lanes). */
export default function Loading() {
  return <LiveBoardSkeleton />;
}
