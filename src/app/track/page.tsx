import type { Metadata } from "next";
import { TrackLookup } from "@/components/storefront/track-lookup";

/* W2-D1 — the public tracking DOOR (order number + phone → /track/[token]).
 * Static markup only: no DB read happens here — the lookup is a POST to
 * /api/public/track and the order data ships exclusively from the token
 * route, exactly as before. */
export const metadata: Metadata = {
  title: "تتبع طلبك",
  description:
    "أدخل رقم الطلب ورقم الهاتف الذي طلبت به لفتح صفحة تتبّع طلبك — من الاستلام حتى باب المنزل.",
};

export default function TrackLookupPage() {
  return <TrackLookup />;
}
