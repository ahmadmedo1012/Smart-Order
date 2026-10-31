import type { Metadata } from "next";
import { TrackLookup } from "@/components/storefront/track-lookup";

/* W2-D1 — the public tracking DOOR (order number + phone → /track/[token]).
 * Static markup only: no DB read happens here — the lookup is a POST to
 * /api/public/track and the order data ships exclusively from the token
 * route, exactly as before.
 *
 * P40 (P2-9): this is a UTILITY page — robots.txt Disallows /track, yet it
 * inherited the root layout's index,follow + canonical "/" (the triple
 * contradiction). The page now speaks the robots.txt policy itself:
 * noindex,follow + SELF-canonical, so no signal points crawlers at the
 * homepage from here (auth/utility pages are doors, not content). */
export const metadata: Metadata = {
  title: "تتبع طلبك",
  description:
    "أدخل رقم الطلب ورقم الهاتف الذي طلبت به لفتح صفحة تتبّع طلبك — من الاستلام حتى باب المنزل.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/track" },
};

export default function TrackLookupPage() {
  return <TrackLookup />;
}
