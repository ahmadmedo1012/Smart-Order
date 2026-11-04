import type { Metadata } from "next";

/** r131 (F3, A7): per-route Arabic document titles — the transparent
 *  server segment layout every dashboard route carries. */
export const metadata: Metadata = { title: "أكواد الخصم" };

export default function DashboardSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
