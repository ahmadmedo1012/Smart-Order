import { redirect } from "next/navigation";
import { getAuthUser, permissionsFor } from "@/lib/auth";
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
      user={{ name: user.name, email: user.email, isPlatformAdmin: user.isPlatformAdmin }}
      businesses={user.memberships.map((m) => m.business)}
      /* r134 (V2 P3): resolved per-membership permissions so client pages can
         gate actions the API enforces (dead-button fix, not a security layer). */
      memberships={user.memberships.map((m) => ({
        businessId: m.businessId,
        perms: permissionsFor(m.role, m.extraPerms),
      }))}
    >
      {children}
    </DashboardShell>
  );
}
