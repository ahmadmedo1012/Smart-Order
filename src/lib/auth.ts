// Session auth — opaque token in httpOnly cookie, SHA-256-hashed at rest.
// Sliding 24h TTL. Session checked against DB in requireAuth (middleware only gates redirects).

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { Role, Permission } from "@/lib/constants";
import { ROLE_PERMISSIONS } from "@/lib/constants";

export const SESSION_COOKIE = "smart-order-session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  memberships: Array<{
    businessId: string;
    role: Role;
    extraPerms: string;
    business: { id: string; slug: string; name: string; isPublished: boolean; onboardingStep: number };
  }>;
}

function sha256(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function permissionsFor(role: Role, extraPerms: string): Permission[] {
  const base = ROLE_PERMISSIONS[role] ?? [];
  const extra = (extraPerms || "")
    .split(",")
    .map((p) => p.trim())
    .filter((p): p is Permission =>
      [
        "orders.read","orders.update","orders.cancel","products.read","products.manage",
        "categories.manage","customers.read","customers.manage","delivery.manage",
        "payments.manage","settings.manage","staff.manage",
      ].includes(p)
    );
  return Array.from(new Set([...base, ...extra]));
}

export async function createSession(userId: string, ip?: string, userAgent?: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: { userId, tokenHash: sha256(token), expiresAt, ip: ip?.slice(0, 60), userAgent: userAgent?.slice(0, 200) },
  });
  // housekeeping: trim to max 10 sessions per user
  const sessions = await db.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (sessions.length > 10) {
    await db.session.deleteMany({
      where: { id: { in: sessions.slice(10).map((s) => s.id) } },
    });
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: sha256(token) } }).catch(() => {});
  }
  store.delete(SESSION_COOKIE);
}

/** Returns the authenticated user (with business memberships) or null. */
export async function getAuthUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        include: {
          memberships: {
            include: {
              business: { select: { id: true, slug: true, name: true, isPublished: true, onboardingStep: true } },
            },
          },
        },
      },
    },
  });
  if (!session) return null;
  // sliding renewal when under half remaining
  const now = Date.now();
  const created = session.createdAt.getTime();
  if (session.expiresAt.getTime() - now < SESSION_TTL_MS / 2 && now - created < SESSION_ABSOLUTE_MS) {
    await db.session
      .update({ where: { id: session.id }, data: { expiresAt: new Date(now + SESSION_TTL_MS) } })
      .catch(() => {});
  }
  if (session.expiresAt.getTime() < now) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    isPlatformAdmin: session.user.isPlatformAdmin,
    memberships: session.user.memberships.map((m) => ({
      businessId: m.businessId,
      role: m.role as Role,
      extraPerms: m.extraPerms,
      business: m.business,
    })),
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) throw new AuthError("يجب تسجيل الدخول للمتابعة", 401);
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/** Resolve the active business for a request. Multi-tenant guard: user must be a member. */
export async function requireBusiness(user: AuthUser, businessId?: string | null) {
  if (businessId) {
    const m = user.memberships.find((mm) => mm.businessId === businessId);
    if (!m) throw new AuthError("لا تملك صلاحية الوصول لهذا العمل", 403);
    return m;
  }
  const m = user.memberships[0];
  if (!m) throw new AuthError("لا يوجد عمل مرتبط بحسابك", 403);
  return m;
}

export function requirePermission(
  m: { role: Role; extraPerms: string },
  permission: Permission
): void {
  const perms = permissionsFor(m.role, m.extraPerms);
  if (!perms.includes(permission)) {
    throw new AuthError("لا تملك الصلاحية اللازمة لهذا الإجراء", 403);
  }
}
