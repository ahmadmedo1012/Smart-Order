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
| `vercel-db-sync.mjs` | Resilient schema sync used by the Vercel build command (`vercel.json:3`): `prisma db push` with retry + drift detection so a failed push never freezes a deploy again (the r125 fix). | Automatic — every `vercel deploy` build. Never run by hand unless debugging a deploy. |
| `seed-family.js` | Idempotent family seed: the plans catalog + the public demo store (`/store/demo-store`) that the landing header links to. Upserts by natural keys — safe to re-run. | On a fresh/empty database (local or a new environment): `node scripts/seed-family.js` |
| `make-admin.js` | Creates/verifies the platform-admin QA user (`admin@smart-link.ly`, idempotent — the only path to a platform-admin account). | When you need an admin login for QA: `node scripts/make-admin.js` |
| `qa-xss-test.js` | XSS injection harness: creates an order with malicious payloads through the public API, then verifies stored values round-trip escaped. | Ad-hoc regression check after touching any rendering/escaping path. |

## Conventions

- Plain Node + `@prisma/client` — run with `node scripts/<name>.js` from
  the repo root; they respect the `DATABASE_URL` in the environment.
- The parity gate lives in `tests/parity.mjs` (`npm run test:parity` or
  `node tests/parity.mjs`), not here.
- Adding a new one-off script? Give it a header comment with its purpose
  and usage, and delete it when its round is done — this folder is for
  tools with ongoing operational value only.
