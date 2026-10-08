import type { Metadata } from "next";

/** r131 (F3, A7): per-route Arabic document titles (rides the root
 *  layout's "%s | سمارت أوردر" template). Client pages can't export
 *  metadata, so each dashboard segment gets this transparent server
 *  layout. */
export const metadata: Metadata = { title: "إعدادات المتجر" };

export default function DashboardSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
