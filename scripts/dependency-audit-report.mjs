#!/usr/bin/env node
// P38 dependency-audit-report — severity-tiered vulnerability governance.
//
// Policy (SECURITY.md «Dependency vulnerability severity policy»):
//   · CRITICAL / HIGH  → CI fails immediately. Primary gate: `bun audit
//     --audit-level=high` (ci.yml, the P37 step). This script repeats the
//     check so a single step's regression can never hide the class.
//   · MODERATE         → must be TRIAGED: fixed first; acceptance requires
//     an entry in docs/security/accepted-moderate.json with a remediation
//     decision (≥20 chars) and an expiry date. An untriaged, missing, or
//     EXPIRED moderate finding fails this script.
//   · LOW              → always printed in the report (visible on every
//     run), never blocks. Remediation is tracked opportunistically.
//
// Honesty contract: this script NEVER prints "0 findings" while filtering
// lower severities — `bun audit --audit-level=low` sees EVERYTHING and the
// full table (both dependency trees: full + production) is printed on every
// run, triaged or not.
//
// Usage: node scripts/dependency-audit-report.mjs   (from repo root)
// Exit 0 = clean / only-low / all-moderate-accepted-and-unexpired.
// Exit 1 = any critical/high, any untriaged or expired moderate, or the
//          audit output could not be parsed (fail LOUD, never silent-zero).

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_PATH = path.join(ROOT, "docs", "security", "accepted-moderate.json");
const TODAY = new Date().toISOString().slice(0, 10);
const SEV_RANK = { critical: 4, high: 3, moderate: 2, low: 1, unknown: 0 };

/** Run `bun audit --json --audit-level=low` and return the parsed advisory
 *  list. `--audit-level=low` is the honest floor: nothing is filtered. */
function runAudit(extraArgs) {
  const args = ["audit", "--json", "--audit-level=low", ...extraArgs];
  let stdout = "";
  try {
    stdout = execFileSync("bun", args, {
      cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    // Non-zero exit ⇒ findings exist at/above the (lowest) threshold — the
    // JSON still arrives on stdout. Anything else (spawn failure) is loud.
    if (err.stdout === undefined) {
      console.error(`[audit] bun audit failed to spawn: ${err.message}`);
      process.exit(1);
    }
    stdout = err.stdout.toString();
  }
  const text = (stdout || "").trim();
  if (text === "" || text === "{}") return { advisories: [], parseOk: true };
  try {
    const parsed = JSON.parse(text);
    // bun 1.3.x `audit --json` shape (verified live against a deliberately
    // vulnerable tree): object keyed by PACKAGE NAME, each value an ARRAY
    // of advisory objects { id (numeric), url (carries the GHSA id),
    // title, severity, vulnerable_versions }. The banner line goes to
    // stderr; stdout is pure JSON. Empty tree ⇒ `{}`.
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { advisories: [], parseOk: false, raw: text };
    }
    const advisories = [];
    for (const [pkg, list] of Object.entries(parsed)) {
      if (!Array.isArray(list)) continue;
      for (const value of list) {
        if (!value || typeof value !== "object") continue;
        const url = String(value.url ?? "");
        const ghsa = url.match(/GHSA-[a-z0-9-]+/i)?.[0] ?? String(value.id ?? "?");
        advisories.push({
          id: ghsa,
          title: String(value.title ?? "(no title)"),
          package: String(pkg),
          severity: String(value.severity ?? "unknown").toLowerCase(),
          vulnerable: String(value.vulnerable_versions ?? "?"),
          patched: String(value.patched_versions ?? "(see advisory)"),
          url,
          paths: "",
        });
      }
    }
    return { advisories, parseOk: true };
  } catch {
    return { advisories: [], parseOk: false, raw: text };
  }
}

function loadLedger() {
  if (!existsSync(LEDGER_PATH)) {
    return { fatal: `triage ledger missing: ${path.relative(ROOT, LEDGER_PATH)}` };
  }
  let ledger;
  try {
    ledger = JSON.parse(readFileSync(LEDGER_PATH, "utf8"));
  } catch (e) {
    return { fatal: `triage ledger is not valid JSON: ${e.message}` };
  }
  if (!Array.isArray(ledger.accepted)) {
    return { fatal: 'triage ledger must have an "accepted" array (see the file header)' };
  }
  return { accepted: ledger.accepted };
}

/** A ledger entry matches an advisory when the package matches AND (the
 *  advisory id matches OR the entry names this package version's finding).
 *  Entries must carry a decision (≥20 chars) and an unexpired ISO date. */
function acceptanceFor(advisory, accepted) {
  const matches = accepted.filter(
    (e) =>
      e &&
      e.package === advisory.package &&
      (String(e.advisory ?? "") === advisory.id ||
        (Array.isArray(e.advisories ?? null) && e.advisories.includes(advisory.id))),
  );
  if (matches.length === 0) return { state: "untriaged" };
  const entry = matches[0];
  if (!entry.decision || String(entry.decision).trim().length < 20) {
    return { state: "invalid", reason: "decision missing or shorter than 20 chars" };
  }
  if (!entry.expiry || !/^\d{4}-\d{2}-\d{2}$/.test(entry.expiry)) {
    return { state: "invalid", reason: "expiry must be an ISO date (YYYY-MM-DD)" };
  }
  if (entry.expiry < TODAY) {
    return { state: "expired", expiry: entry.expiry };
  }
  return { state: "accepted", decision: entry.decision, expiry: entry.expiry };
}

function printTree(label, advisories) {
  console.log(`\n=== ${label} — ${advisories.length} finding(s), every severity ===`);
  if (advisories.length === 0) {
    console.log("(none at any severity — checked with --audit-level=low, nothing filtered)");
    return;
  }
  const sorted = [...advisories].sort(
    (a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0) || a.package.localeCompare(b.package),
  );
  for (const a of sorted) {
    console.log(`[${a.severity.toUpperCase().padEnd(8)}] ${a.package} ${a.vulnerable} → fixed ${a.patched}`);
    console.log(`           ${a.title}`);
    if (a.url) console.log(`           ${a.url}`);
    if (a.paths) console.log(`           path: ${a.paths}`);
  }
}

// ── main ──────────────────────────────────────────────────────────────────
const full = runAudit([]);
const prod = runAudit(["--production"]);

for (const r of [full, prod]) {
  if (!r.parseOk) {
    console.error("[audit] could not parse `bun audit --json` output — failing LOUD rather than reporting a silent zero:");
    console.error(r.raw?.slice(0, 2000));
    process.exit(1);
  }
}

printTree("FULL dependency tree", full.advisories);
printTree("PRODUCTION dependency tree", prod.advisories);

const ledger = loadLedger();
if (ledger.fatal) {
  console.error(`[triage] ${ledger.fatal}`);
  process.exit(1);
}

const failures = [];
const acceptedLines = [];
const all = new Map(); // package|id → advisory (dedupe across trees)
for (const a of [...full.advisories, ...prod.advisories]) all.set(`${a.package}|${a.id}`, a);

for (const a of all.values()) {
  if (a.severity === "critical" || a.severity === "high") {
    failures.push(`${a.severity.toUpperCase()} · ${a.package} ${a.vulnerable} (${a.id}) — critical/high must be FIXED, acceptance is not an option`);
  } else if (a.severity === "moderate") {
    const verdict = acceptanceFor(a, ledger.accepted);
    if (verdict.state === "untriaged") {
      failures.push(
        `MODERATE · ${a.package} ${a.vulnerable} (${a.id}) — untriaged. Fix it, or document acceptance in docs/security/accepted-moderate.json {package, advisory, decision ≥20 chars, expiry}.`,
      );
    } else if (verdict.state === "expired") {
      failures.push(
        `MODERATE · ${a.package} (${a.id}) — acceptance EXPIRED on ${verdict.expiry}. Re-triage: fix it, or renew the entry with a fresh decision and expiry.`,
      );
    } else if (verdict.state === "invalid") {
      failures.push(`MODERATE · ${a.package} (${a.id}) — ledger entry invalid: ${verdict.reason}`);
    } else {
      acceptedLines.push(`MODERATE · ${a.package} (${a.id}) — ACCEPTED until ${verdict.expiry}: ${verdict.decision}`);
    }
  }
  // low (and unknown): visible above; never blocks.
}

if (acceptedLines.length > 0) {
  console.log("\n=== Accepted moderate findings (triage ledger, unexpired) ===");
  for (const line of acceptedLines) console.log(line);
}

if (failures.length > 0) {
  console.error(`\n[FAIL] dependency-audit-report: ${failures.length} policy violation(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}

console.log("\n[OK] dependency-audit-report: policy satisfied (critical/high: 0 · moderate: all triaged · low: visible above)");
