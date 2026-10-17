# P20-D1 — Reference Brief: United Carriers (unitedcarriers.com)

Evidence fetched live 2026-10-17 (Firecrawl keyless, by the P20-D1 pod):
- `scrape https://unitedcarriers.com/` → /tmp/fc-order-unitedcarriers.md (region word-map:
  Australia / New Zealand / Hong Kong / China / Vietnam / US / Thailand / Germany / UK —
  the global freight footprint nav; "work / with us" structure)
- `scrape https://dokle.design/awards/united-carriers-logistics-site-live-globe` →
  /tmp/fc-order-dokle.md (the Bearplus case study — the richest source)
- Production critique pass: 17 screenshots (landing dark+light, store, checkout
  1440/390 + validation + min-order + sticky bar, empty cart, login, tracking at
  placed/ready/delivered) in /tmp/p20-evidence/critique/ + /tmp/p20-evidence/before/.

## Observed principles (from the case study)

1. **"Every leg of the journey"** — the hero promise IS the tracking story; the
   product's real state machine (order → delivered) is the narrative spine.
2. **Monospace labels + port footage** — operational register carried by mono
   micro-labels over photographic material; restraint in color (dark + orange
   arcs; the UC family accent).
3. **Purposeful visualization only** — the live globe maps REAL freight arcs;
   dokle's verdict: the globe works because the data is real. (Smart-Order law:
   tracking roadmarks derive from PAYMENT_TYPES / statusHistory — never
   fabricated.)
4. **Typographic hierarchy does the work** — big editorial headline (one
   display voice) + tiny mono operational labels; little in between.
5. **Global-but-grounded** — regions as a plain word-map, not a gimmick.

## What transfers to Smart-Order (already largely built — P16-P19)

- The two-voice H1 (dim prefix + full-ink punchline) = the UC emphasis-by-
  subtraction law (P18-W5, AA-large measured).
- Tracking = the "every leg" spine with REAL history stamps (P18-W2-d).
- Mono tabular stamps, station grammar, roadmark toll plates (P19-D2).

## What must NOT be copied

- The Three.js freight globe as decoration (no real freight data to map —
  the brief's explicit "no globe merely for decoration" law).
- UC's exact dark+orange palette values, their footage treatment, their
  region word-map layout.

## P20-D1 verified state (all VLM-flagged candidates measured, not assumed)

| Candidate defect | Verdict | Evidence |
|---|---|---|
| H1 dim prefix "looks disabled" | DELIBERATE DESIGN (no change) | P18-W5 two-voice law; night #7E8CA3 ≈6.5:1, day #5E6B80 — AA-large |
| Light-mode nav washed out | DISPROVEN | real-toggle DOM: nav #4E5A6E on #FBFAF8 = 6.4:1; targeted VLM re-read: "clearly readable dark slate" |
| Checkout delivery cards misaligned | DISPROVEN | both buttons identical `flex items-center gap-2.5 p-3.5 text-start` classes |
| Tracking current-step wrong | DISPROVEN (env artifact) | the pod's split-brain DB (dev server read custom.db via shell env override; advances went to dev-p20.db); with the correct DB: steps 0-4 DONE + step 5 ACTIVE — correct |
| Min-order submit stays active | DISPROVEN | live DOM: `disabled: true`, opacity .55, cursor not-allowed + sticky-bar explain text |
| **H1 measured-ink collision** | **REAL — FIXED** | canvas actualBoundingBox @1440: line-1 descent 29 + line-2 ascent 71.4 = 100.4 vs 101.2 line box = **0.8px clearance**; fix `--ln-h1-lh` 1.15 → 1.22 → measured **7px** (the same defect class + fix as Smart-Link P20-A1) |
| CTA pair baseline wobble | DISPROVEN | both hero CTAs: top 654.8, h 48.8 — identical rects |

## Route coverage

The P19 route matrix (docs/p19-route-matrix.md — all 22 pages, claims-audited)
remains the canonical inventory; this phase re-verified the public money path
(store → item → cart → checkout states → tracking all statuses) live.
