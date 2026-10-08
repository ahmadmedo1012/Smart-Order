import type { Metadata } from "next";

/* r131-F2 (A7 cluster D — per-route titles): register is a client page,
 * so the route title lives in this server layout (WCAG 2.4.2). */
export const metadata: Metadata = {
  title: "إنشاء متجر جديد",
  description:
    "أنشئ متجرك الرقمي على سمارت أوردر — أقل من دقيقتين، بدون بطاقة ائتمانية.",
};

export default function RegisterLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
