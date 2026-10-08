import type { Metadata } from "next";

/* r131-F2 (A7 cluster D — per-route titles): login is a client page, so
 * the route title lives in this server layout (WCAG 2.4.2 — the history
 * list and screen-reader page announcement name the page in Arabic). */
export const metadata: Metadata = {
  title: "تسجيل الدخول",
  description: "سجّل الدخول إلى لوحة تحكم متجرك على سمارت أوردر.",
  robots: { index: false, follow: true },
};

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
