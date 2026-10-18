// Prisma P2002 discrimination — WHICH unique constraint fired, not just
// that one did.
//
// W3-F (P21-W3-F): the public order route's insert loop retries P2002 on
// orderNumber collisions (bump the daily sequence, try again). A P2002 on
// the idempotency key is a DIFFERENT contract: a concurrent request with
// the same key committed between the route's pre-check findFirst and this
// transaction's INSERT — the twin's order already exists, and no
// orderNumber retry can ever clear the conflict (the key is identical on
// every attempt). Telling the two apart turns the raced twin back into
// the idempotent REPLAY the route's pre-check serves, instead of a raw
// 500 after the loop burns its attempts.
//
// Deliberately duck-typed (no @prisma/client import): `code === "P2002"`
// + `meta.target` is Prisma's documented shape for known request errors,
// and this module must stay importable by the dependency-free
// node:test unit battery (tests/unit/prisma-errors.test.ts).

type UnknownRecord = Record<string, unknown>;

/** Field names of a P2002's violated unique constraint, when Prisma named
 *  them (PostgreSQL always does; older engines may not, and some report
 *  the index NAME as a bare string instead of the field list). */
export function uniqueViolationFields(err: unknown): string[] {
  if (!err || typeof err !== "object") return [];
  const e = err as UnknownRecord;
  if (e.code !== "P2002") return [];
  const meta = e.meta as UnknownRecord | undefined;
  const target = meta?.target;
  if (Array.isArray(target)) return target.map((f) => String(f));
  if (typeof target === "string") return [target]; // index-name form
  return [];
}

/** True when a P2002's violated constraint includes the given field —
 *  e.g. `isUniqueViolationOn(err, "idempotencyKey")` for the Order
 *  @@unique([businessId, idempotencyKey]) race. Falls back to Prisma's
 *  human message ("Unique constraint failed on the fields: …") for
 *  engines where meta.target is absent — safe here because the field
 *  name passed by callers appears in exactly one constraint. */
export function isUniqueViolationOn(err: unknown, field: string): boolean {
  if (uniqueViolationFields(err).includes(field)) return true;
  if (!err || typeof err !== "object") return false;
  const e = err as UnknownRecord;
  if (e.code !== "P2002") return false;
  const message = e.message;
  if (typeof message !== "string") return false;
  // Prisma message form: "Unique constraint failed on the fields: (`id`, `idempotencyKey`)"
  // (some engines quote the fields, some don't — strip both quote styles)
  const fieldsMatch = message.match(/Unique constraint failed on the fields:\s*\(([^)]*)\)/);
  if (fieldsMatch) {
    return fieldsMatch[1]
      .split(",")
      .map((f) => f.trim().replace(/^[`"']+|[`"']+$/g, ""))
      .includes(field);
  }
  return false;
}
