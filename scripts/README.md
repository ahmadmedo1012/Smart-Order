# scripts/ — operational tools (r133 documentation)

Everything in this folder is an ops/QA tool that runs against a database
(via `DATABASE_URL`) or the Vercel build pipeline. None of them are part
of the app bundle. The ~841 lines of r128-era forensic/identity one-offs
(`*.py` gradient/icon measurements, superseded brand-icon generators,
`make-og-manifest.py` + `og-template.html`, `dev-server.sh`,
`impeccable-61-rules.txt`) were deleted in r133 — recoverable from git
history if ever needed; they had zero references.

| Script | What it does | When to run |
| --- | --- | --- |
| `vercel-db-sync.mjs` | Resilient schema sync used by the Vercel build command (`vercel.json:3`): `prisma db push` with retry + drift detection so a failed push never freezes a deploy again (the r125 fix). P30-A: structurally skipped on `VERCEL_ENV=preview` — an unmerged branch can never push schema changes to a shared/production database (`DB_ALLOW_PREVIEW=1` opts in a genuinely dedicated preview database; local/CI runs are ungated). | Automatic — every `vercel deploy` **production** build. Never run by hand unless debugging a deploy. |
| `seed-family.js` | Idempotent family seed: the plans catalog + the public demo store (`/store/demo-store`) that the landing header links to. Upserts by natural keys — safe to re-run. P29-C3: now rides every `vercel deploy` build (`vercel.json`, after `prisma generate`) so deployed code and demo data can never drift apart (the P29-C2 photos shipped while production kept `imageUrl: null` — the manual refresh step never ran). Failures never block a deploy (loud `[SEED]` banner, exit 0); `SEED_STRICT=1` preserves the strict local exit. P30-A safety rails: (1) **ownership guard** — the demo mutations (product photo refresh, payment-method/zone top-ups) only run when the row at slug `demo-store` carries the demo identity («مخبز الواحة — تجريبي»); a merchant row at that slug skips every demo mutation loudly (merchant records are never touched); (2) **preview gate** — skipped on `VERCEL_ENV=preview` (`SEED_ALLOW_PREVIEW=1` opts in a dedicated preview database); (3) `demo-store` is RESERVED in `src/lib/slug.ts` — registration can never create the collision. | Automatic on every production deploy. By hand only when bringing up a fresh/empty database: `node scripts/seed-family.js` |
| `make-admin.js` | Creates/verifies the platform-admin QA user (`admin@smart-link.ly`, idempotent — the only path to a platform-admin account). | When you need an admin login for QA: `node scripts/make-admin.js` |
| `qa-xss-test.js` | XSS injection harness: creates an order with malicious payloads through the public API, then verifies stored values round-trip escaped. | Ad-hoc regression check after touching any rendering/escaping path. |
| `check-schema-twins.mjs` | Schema-twins guard: asserts `prisma/schema.prisma` (SQLite dev) ≡ `prisma/schema.postgres.prisma` (PostgreSQL prod) at the MODEL level (generator/datasource plumbing exempt by design); exits 1 on the first divergence. r134 decided NOT to adopt `prisma migrate` — see the script header. | Automatic — every CI run (`.github/workflows/ci.yml`). |
| `dependency-audit-report.mjs` | P38 severity-tiered vulnerability governance: runs `bun audit --json --audit-level=low` on BOTH trees (full + production) and prints every finding at every severity (low stays visible — never filtered); fails on critical/high (belt-and-suspenders with the `--audit-level=high` gate), and fails on any moderate finding without an unexpired acceptance entry in `docs/security/accepted-moderate.json` (decision ≥20 chars + ISO expiry; expired acceptances fail too). Fails LOUD on unparseable audit output — never a silent zero. | Automatic — every CI run (`.github/workflows/ci.yml`), right after the audit gate. |

## Conventions

- Plain Node + `@prisma/client` — run with `node scripts/<name>.js` from
  the repo root; they respect the `DATABASE_URL` in the environment.
- The parity gate lives in `tests/parity.mjs` (`npm run test:parity` or
  `node tests/parity.mjs`), not here.
- Adding a new one-off script? Give it a header comment with its purpose
  and usage, and delete it when its round is done — this folder is for
  tools with ongoing operational value only.
