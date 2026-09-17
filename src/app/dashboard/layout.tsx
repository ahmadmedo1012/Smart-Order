import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/shell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "لوحة التحكم",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <DashboardShell
      user={{ name: user.name, email: user.email }}
      businesses={user.memberships.map((m) => m.business)}
    >
      {children}
    </DashboardShell>
  );
}
