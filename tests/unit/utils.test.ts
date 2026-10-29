// r137 — the class-name seam (src/lib/utils.ts): clsx joins, then
// tailwind-merge dedupes conflicting utilities — the shadcn convention
// the whole component tree rides on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cn } from "../../src/lib/utils.ts";

test("joins conditional and falsy inputs like clsx", () => {
  assert.equal(cn("a", "b"), "a b");
  assert.equal(cn("a", false && "b", undefined, null, "c"), "a c");
  assert.equal(cn({ active: true, disabled: false }), "active");
});

test("tailwind conflicts resolve to the LAST utility (the merge contract)", () => {
  assert.equal(cn("p-2", "p-4"), "p-4");
  assert.equal(cn("text-right", "text-center"), "text-center");
  assert.equal(cn("px-2 py-1", "px-4"), "py-1 px-4");
});

test("non-conflicting utilities concatenate untouched", () => {
  assert.equal(cn("flex", "items-center", "gap-2"), "flex items-center gap-2");
  assert.equal(cn("rtl:text-right", "text-sm"), "rtl:text-right text-sm");
});

test("arrays and nested conditionals flatten", () => {
  assert.equal(cn(["a", ["b", { c: true }]]), "a b c");
});
