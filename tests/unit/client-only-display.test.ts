// r137 — GUARD: the Arabic date display helpers are CLIENT-ONLY.
//
// formatArabicDateTime / formatArabicDate / timeAgoAr (src/lib/arabic.ts)
// render via Date#getHours() etc. — i.e. the READER's device timezone. That
// is correct inside "use client" components. Imported into any server
// surface they would print UTC (Vercel TZ) = 2h behind Libya; server-side
// day boundaries must go through the tripoli* helpers instead (r136).
//
// Chosen as the lightest option that actually guards (vs an ESLint
// no-restricted-imports override or a runtime invariant): zero config
// surgery, dependency-free node:test, runs with the rest of the unit
// gates. It scans every src/**/*.{ts,tsx} file that imports one of the
// helpers and FAILS unless the file carries a "use client" directive
// before its first import. This subsumes app/api/** routes, "use server"
// files and RSC pages — none of them may ever import these helpers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "src");

// Matches any import statement that pulls a display helper from the
// arabic module (alias "@/lib/arabic" or relative "…/arabic" — both used
// styles are covered). \b keeps formatArabicDate from matching inside
// formatArabicDateTime. `import type { … }` is type-only (erased at
// runtime) and intentionally does NOT match — it carries no hazard.
const importRe =
  /import\s*\{[^}]*\b(?:formatArabicDateTime|formatArabicDate|timeAgoAr)\b[^}]*\}\s*from\s*["'][^"']*arabic["']/;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

test("Arabic date display helpers are imported only by client components", () => {
  const offenders: string[] = [];
  for (const file of walk(SRC)) {
    // The definition module itself is shared on purpose (client display
    // helpers + server tripoli* boundaries live side by side in arabic.ts).
    if (file.endsWith(join("src", "lib", "arabic.ts"))) continue;
    const text = readFileSync(file, "utf8");
    if (!importRe.test(text)) continue;
    // Next.js contract: the directive must precede every import statement.
    const firstImport = text.search(/^import /m);
    const head = firstImport === -1 ? text : text.slice(0, firstImport);
    if (!/["']use client["']/.test(head)) offenders.push(file);
  }
  assert.deepEqual(
    offenders,
    [],
    `ملفات خادمية تستورد مساعدات عرض التاريخ (ستطبع UTC على Vercel — خلف ليبيا بساعتين؛ حدود اليوم الخادمية تمر عبر tripoli*):\n${offenders.join("\n")}`,
  );
});
