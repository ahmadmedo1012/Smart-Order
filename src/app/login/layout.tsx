import type { Metadata } from "next";

/* r131-F2 (A7 cluster D — per-route titles): login is a client page, so
 * the route title lives in this server layout (WCAG 2.4.2 — the history
 * list and screen-reader page announcement name the page in Arabic).
 *
 * P40 (P2-9): SELF-canonical — /login inherited the root layout's
 * canonical "/" while robots.txt Disallows it (utility/auth page, not
 * content). The canonical now names itself; noindex,follow was already
 * the page's robots policy. */
export const metadata: Metadata = {
  title: "تسجيل الدخول",
  description: "سجّل الدخول إلى لوحة تحكم متجرك على سمارت أوردر.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/login" },
};

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
