import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

/**
 * Health probe with latency capture — mirrors smart-menu-real
 * (src/lib/db.ts:163-171) per the r129 health API mirror: one
 * `SELECT 1` around a Date.now() pair; never throws (the caller
 * decides status from `ok`), always reports how long the round-trip
 * took so the /api/health payload can expose dbLatencyMs.
 */
export async function dbHealth(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now()
  try {
    await db.$queryRaw`SELECT 1`
    return { ok: true, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, latencyMs: Date.now() - start }
  }
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db