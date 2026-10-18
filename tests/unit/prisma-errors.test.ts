// W3-F (P21-W3-F) — unit tests for the P2002 discriminator
// (src/lib/prisma-errors.ts). Pure node:test, duck-typed error shapes —
// no @prisma/client import (the battery stays dependency-free like the
// other units; the real Prisma error object has exactly this
// { code, message, meta } surface).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  uniqueViolationFields,
  isUniqueViolationOn,
} from "../../src/lib/prisma-errors.ts";

const p2002 = (target: unknown, message = "Unique constraint failed") =>
  ({ code: "P2002", message, meta: { target } } as never);

test("meta.target array: lists the violated compound fields", () => {
  assert.deepEqual(
    uniqueViolationFields(p2002(["businessId", "idempotencyKey"])),
    ["businessId", "idempotencyKey"],
  );
});

test("meta.target single string (index-name form): surfaces as one entry", () => {
  assert.deepEqual(uniqueViolationFields(p2002("Order_businessId_idempot")), [
    "Order_businessId_idempot",
  ]);
});

test("meta.target absent: no fields, no guess", () => {
  assert.deepEqual(uniqueViolationFields(p2002(undefined)), []);
});

test("non-P2002 errors are ignored (code gate first)", () => {
  assert.deepEqual(uniqueViolationFields({ code: "P2025", meta: { target: ["x"] } }), []);
  assert.equal(isUniqueViolationOn({ code: "P2025", meta: { cause: "Record not found" } }, "idempotencyKey"), false);
});

test("null/undefined/primitives never match", () => {
  assert.equal(isUniqueViolationOn(null, "idempotencyKey"), false);
  assert.equal(isUniqueViolationOn(undefined, "idempotencyKey"), false);
  assert.equal(isUniqueViolationOn("P2002", "idempotencyKey"), false);
});

test("isUniqueViolationOn: the idempotency twin vs the orderNumber collision", () => {
  const idem = p2002(["businessId", "idempotencyKey"]);
  const orderNumber = p2002(["businessId", "orderNumber"]);
  assert.equal(isUniqueViolationOn(idem, "idempotencyKey"), true);
  assert.equal(isUniqueViolationOn(idem, "orderNumber"), false);
  assert.equal(isUniqueViolationOn(orderNumber, "orderNumber"), true);
  assert.equal(isUniqueViolationOn(orderNumber, "idempotencyKey"), false);
});

test("message fallback: engines without meta.target are still discriminated", () => {
  const err = {
    code: "P2002",
    message: "Unique constraint failed on the fields: (businessId, idempotencyKey)",
  };
  assert.equal(isUniqueViolationOn(err, "idempotencyKey"), true);
  assert.equal(isUniqueViolationOn(err, "orderNumber"), false);
  const other = {
    code: "P2002",
    message: "Unique constraint failed on the fields: (businessId, orderNumber)",
  };
  assert.equal(isUniqueViolationOn(other, "idempotencyKey"), false);
  // constraint fields that merely CONTAIN the name as a substring of
  // another field don't match (exact field split, not substring)
  const sneaky = {
    code: "P2002",
    message: "Unique constraint failed on the fields: (idempotencyKeySuffix)",
  };
  assert.equal(isUniqueViolationOn(sneaky, "idempotencyKey"), false);
});

test("message fallback: SQLite-style backticked fields are normalized", () => {
  const err = {
    code: "P2002",
    message: "Unique constraint failed on the fields: (`businessId`, `idempotencyKey`)",
  };
  assert.equal(isUniqueViolationOn(err, "idempotencyKey"), true);
  assert.equal(isUniqueViolationOn(err, "businessId"), true);
  assert.equal(isUniqueViolationOn(err, "orderNumber"), false);
});
