#!/usr/bin/env node
/**
 * r134 (W2 #7): schema-twins guard — prisma/schema.prisma (SQLite dev)
 * vs prisma/schema.postgres.prisma (PostgreSQL prod) are HAND-KEPT twins:
 * the models must stay identical; only the deployment plumbing (generator
 * binaryTargets / datasource provider+url) differs by design.
 *
 * DECISION (r134): `prisma migrate` is deliberately NOT adopted this
 * round — the deploy chain is `prisma db push` + the graceful-degrade
 * sync (scripts/vercel-db-sync.mjs, the r125 3-week deploy-freeze fix),
 * and swapping it for a migrations workflow is a risky deploy-path
 * change that deserves its own dedicated round (baseline + drift
 * checkpoint + prod rehearsal). Until then this guard makes the
 * hand-kept twin contract self-verifying: any model drift between the
 * twins fails CI before the build. Wired into .github/workflows/ci.yml.
 *
 * Run: node scripts/check-schema-twins.mjs   (exit 1 on drift — CI-able)
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TWINS = ["prisma/schema.prisma", "prisma/schema.postgres.prisma"];

/** Reduce a schema to its MODEL content: drop the top-level brace-matched
 *  `generator`/`datasource` blocks (deployment plumbing — the intentional
 *  difference), strip comments and blank lines, and normalize indentation
 *  so the comparison is about shape, not formatting. */
function modelsOnly(schemaText) {
  const out = [];
  let depth = 0; // >0 → inside a generator/datasource block (skip)
  for (const rawLine of schemaText.split("\n")) {
    const line = rawLine.replace(/\/\/.*$/, "").trim();
    if (!line) continue;
    if (depth === 0 && /^(generator|datasource)\s+\w+\s*\{/.test(line)) {
      depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      continue;
    }
    if (depth > 0) {
      depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      continue;
    }
    out.push(line);
  }
  return out;
}

const [aLines, bLines] = TWINS.map((t) =>
  modelsOnly(readFileSync(join(ROOT, t), "utf8")),
);

// First-divergence report (the models are ~380 lines; a full unified diff
// is noise — the first mismatch plus context is what a fix needs).
let diverged = false;
const max = Math.max(aLines.length, bLines.length);
for (let i = 0; i < max; i++) {
  if (aLines[i] !== bLines[i]) {
    diverged = true;
    console.error("✗ SCHEMA TWINS DRIFT — first divergence:");
    for (let j = Math.max(0, i - 3); j <= Math.min(max - 1, i + 3); j++) {
      if (aLines[j] === bLines[j]) {
        console.error(`   ${j + 1}: ${aLines[j]}`);
      } else {
        console.error(`>> ${TWINS[0]}:${j + 1}: ${aLines[j] ?? "(absent)"}`);
        console.error(`<< ${TWINS[1]}:${j + 1}: ${bLines[j] ?? "(absent)"}`);
      }
    }
    break;
  }
}

if (diverged) {
  console.error(
    "\n✗ prisma/schema.prisma (SQLite dev) and prisma/schema.postgres.prisma (PostgreSQL prod)\n" +
      "  drifted apart. Edit BOTH twins in the same commit (models only — generator/datasource\n" +
      "  plumbing is exempt). This guard exists because the twins are hand-kept: r134 chose NOT\n" +
      "  to adopt prisma migrate (deploy-path risk) and made the contract self-verifying instead.",
  );
  process.exit(1);
}

console.log(
  `✓ Schema twins in sync: ${TWINS[0]} ≡ ${TWINS[1]} (${aLines.length} model lines; generator/datasource plumbing exempt by design)`,
);
