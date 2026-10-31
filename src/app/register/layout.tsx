import type { Metadata } from "next";

/* r131-F2 (A7 cluster D — per-route titles): register is a client page,
 * so the route title lives in this server layout (WCAG 2.4.2).
 *
 * P40 (P2-9): robots.txt has always Disallowed /register (auth-gated
 * sign-up), yet the page inherited the root layout's index,follow +
 * canonical "/" — the same triple contradiction /track carried. The page
 * now speaks the policy itself: noindex,follow + SELF-canonical (and the
 * P3-2 fleet fork resolves on the honest side — sign-up is a door, not
 * content). */
export const metadata: Metadata = {
  title: "إنشاء متجر جديد",
  description:
    "أنشئ متجرك الرقمي على سمارت أوردر — أقل من دقيقتين، بدون بطاقة ائتمانية.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/register" },
};

export default function RegisterLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
