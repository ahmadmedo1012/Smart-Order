// Session auth — opaque token in httpOnly cookie, SHA-256-hashed at rest.
// Sliding 24h TTL. Session checked against DB in requireAuth (middleware only gates redirects).
//
// P36 Phase C (C3): getAuthUser() now resolves TWO transports against the
// SAME identity system — the RN merchant app cannot carry the httpOnly
// cookie, so an `Authorization: Bearer som_…` header resolves a
// MobileSession row (device credentials: SHA-256 at rest, sliding 30d +
// absolute 90d expiry, revocation, device metadata). Bearer wins when
// presented: a presented-but-invalid token never silently falls back to a
// cookie on the same request. Every existing handler (requireAuth →
// requireBusiness → requirePermission) serves BOTH transports unchanged.

import { createHash, randomBytes } from "crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import type { Role, Permission } from "@/lib/constants";
import { ROLE_PERMISSIONS } from "@/lib/constants";
import {
  MOBILE_SESSION_MAX_PER_USER,
  MOBILE_SESSION_TTL_MS,
  MOBILE_LAST_USED_WRITE_MS,
  mintMobileToken,
  hashMobileToken,
  sessionVerdict,
  renewalExpiry,
} from "@/lib/mobile-session";

const SESSION_COOKIE = "smart-order-session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;

interface AuthUser {
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

/** The user-with-memberships shape both transports resolve to. The
 *  membership rows come from the DB include (identical select for the
 *  cookie and Bearer paths) — one mapping, one identity system. */
type UserWithMemberships = {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  memberships: Array<{
    businessId: string;
    role: string;
    extraPerms: string;
    business: { id: string; slug: string; name: string; isPublished: boolean; onboardingStep: number };
  }>;
};

function mapToAuthUser(user: UserWithMemberships): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isPlatformAdmin: user.isPlatformAdmin,
    memberships: user.memberships.map((m) => ({
      businessId: m.businessId,
      role: m.role as Role,
      extraPerms: m.extraPerms,
      business: m.business,
    })),
  };
}

/* r134 (V2 P3): exported so the dashboard layout can resolve the member's
   effective permissions server-side and hand them to the client shell —
   the orders detail UI now gates destructive actions on orders.cancel
   (the API already enforces it; the UI must not show dead buttons). */
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
  /* P36 Phase C: Bearer first — the mobile transport. An explicitly
     presented (but invalid) token must NOT fall back to any cookie riding
     the same request: the caller learns the token died. */
  const bearer = await readBearerToken();
  if (bearer !== null) {
    return getMobileAuthUser(bearer);
  }
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
  return mapToAuthUser(session.user);
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

/* ══ P36 Phase C (C3): the Bearer transport — native device sessions ══
 *
 * MobileSession rows are device credentials for the RN merchant app:
 * high-entropy opaque tokens ("som_" + 43 base64url chars), SHA-256 at
 * rest (the Session pattern verbatim), sliding 30d TTL renewed under
 * half-remaining, a hard 90d absolute cap enforced on every read,
 * soft revocation (revokedAt) for logout/revoke, and device metadata
 * (platform, deviceName, appVersion, lastUsedAt throttled to 1/min).
 * The pure decision table lives in src/lib/mobile-session.ts. */

/** What /api/mobile/auth/me and the sessions surface expose about the
 *  active device session — never the token or its hash. */
export interface MobileSessionInfo {
  id: string;
  platform: string;
  deviceName: string | null;
  appVersion: string | null;
  lastUsedAt: Date;
  createdAt: Date;
  expiresAt: Date;
}

interface MobileSessionRow {
  id: string;
  platform: string;
  deviceName: string | null;
  appVersion: string | null;
  lastUsedAt: Date;
  createdAt: Date;
  expiresAt: Date;
}

function toSessionInfo(row: MobileSessionRow): MobileSessionInfo {
  return {
    id: row.id,
    platform: row.platform,
    deviceName: row.deviceName,
    appVersion: row.appVersion,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}

/** Extract the Bearer credential from the request's Authorization header
 *  (case-insensitive scheme, tolerant of surrounding whitespace). */
export async function readBearerToken(): Promise<string | null> {
  const h = await headers();
  const auth = h.get("authorization");
  if (!auth || !/^bearer /i.test(auth)) return null;
  const token = auth.slice(7).trim();
  return token.length > 0 ? token : null;
}

export interface MobileSessionMeta {
  platform?: string;
  deviceName?: string | null;
  appVersion?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/** Mint a device credential + persist only its hash. Housekeeping rides
 *  the create (web parity): rows that can never validate again are swept,
 *  then ACTIVE device sessions are trimmed to MOBILE_SESSION_MAX_PER_USER
 *  (oldest login evicted). The raw token leaves this process exactly
 *  once — the login response. */
export async function createMobileSession(
  userId: string,
  meta: MobileSessionMeta,
): Promise<{ token: string; sessionId: string; expiresAt: Date }> {
  const token = mintMobileToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + MOBILE_SESSION_TTL_MS);
  const session = await db.mobileSession.create({
    data: {
      userId,
      tokenHash: hashMobileToken(token),
      platform: (meta.platform ?? "unknown").slice(0, 20),
      deviceName: meta.deviceName?.slice(0, 80) ?? null,
      appVersion: meta.appVersion?.slice(0, 40) ?? null,
      ip: meta.ip?.slice(0, 60) ?? null,
      userAgent: meta.userAgent?.slice(0, 200) ?? null,
      lastUsedAt: now,
      expiresAt,
    },
    select: { id: true },
  });
  // sweep: expired rows and revocations older than 7d can never validate
  await db.mobileSession
    .deleteMany({
      where: {
        userId,
        OR: [
          { expiresAt: { lt: now } },
          { revokedAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
    })
    .catch(() => {});
  // trim ACTIVE device sessions (the web Session trim's max-10 rule)
  const active = await db.mobileSession.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (active.length > MOBILE_SESSION_MAX_PER_USER) {
    await db.mobileSession.deleteMany({
      where: { id: { in: active.slice(MOBILE_SESSION_MAX_PER_USER).map((s) => s.id) } },
    });
  }
  return { token, sessionId: session.id, expiresAt };
}

/** Resolve a Bearer credential against MobileSession — the transport's
 *  getAuthUser twin. Expired rows are deleted on read (the web pattern);
 *  revoked rows stay tombstoned (audit trail, swept after 7d). Renewal
 *  writes are best-effort and NEVER block the request. */
async function resolveMobileSession(
  token: string,
): Promise<{ user: AuthUser; session: MobileSessionInfo } | null> {
  const row = await db.mobileSession.findUnique({
    where: { tokenHash: hashMobileToken(token) },
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
  if (!row) return null;
  const now = Date.now();
  const verdict = sessionVerdict({
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    now,
  });
  if (verdict === "revoked") return null;
  if (verdict === "expired") {
    await db.mobileSession.delete({ where: { id: row.id } }).catch(() => {});
    return null;
  }
  const touchLastUsed = now - row.lastUsedAt.getTime() > MOBILE_LAST_USED_WRITE_MS;
  if (verdict === "renew") {
    await db.mobileSession
      .update({
        where: { id: row.id },
        data: {
          expiresAt: renewalExpiry(row.createdAt, now),
          ...(touchLastUsed ? { lastUsedAt: new Date(now) } : {}),
        },
      })
      .catch(() => {});
  } else if (touchLastUsed) {
    await db.mobileSession
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date(now) } })
      .catch(() => {});
  }
  return { user: mapToAuthUser(row.user), session: toSessionInfo(row) };
}

/** Bearer-transport getAuthUser (used by the shared resolution above). */
export async function getMobileAuthUser(token: string): Promise<AuthUser | null> {
  const resolved = await resolveMobileSession(token);
  return resolved?.user ?? null;
}

/** Strict Bearer guard for the /api/mobile/* surface: token-first by
 *  contract — a cookie NEVER authenticates the mobile routes. Same 401
 *  AuthError copy as requireAuth (one error shape across transports). */
export async function requireMobileSession(): Promise<{ user: AuthUser; session: MobileSessionInfo }> {
  const token = await readBearerToken();
  const resolved = token ? await resolveMobileSession(token) : null;
  if (!resolved) throw new AuthError("يجب تسجيل الدخول للمتابعة", 401);
  return resolved;
}

/** Active device sessions for the sessions screen, freshest use first. */
export async function listMobileSessions(
  userId: string,
  currentSessionId: string,
): Promise<Array<MobileSessionInfo & { current: boolean }>> {
  const rows = await db.mobileSession.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastUsedAt: "desc" },
    select: { id: true, platform: true, deviceName: true, appVersion: true, lastUsedAt: true, createdAt: true, expiresAt: true },
  });
  return rows.map((r) => ({ ...toSessionInfo(r), current: r.id === currentSessionId }));
}

/** Revoke a device session (CAS: only an ACTIVE session of THIS user
 *  flips) — returns false when the id is unknown/already revoked. */
export async function revokeMobileSessionById(userId: string, sessionId: string): Promise<boolean> {
  const cas = await db.mobileSession.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return cas.count === 1;
}
