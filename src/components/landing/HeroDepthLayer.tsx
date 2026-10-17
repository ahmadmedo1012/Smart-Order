"use client"

import { useEffect, useRef } from "react"

/**
 * HeroDepthLayer — r128 Stage B (F2b), ported from Madarek
 * (frontend/src/components/landing/HeroDepthLayer.tsx).
 *
 * r152 (Phase 5 daylight): the night starfield became the DAYLIGHT
 * DISPATCH GRID — a seeded field of navy ink points at parallax
 * depth, like waypoints on a city map. Same craft: this layer moves
 * at ~0.2× the scroll rate while the scene sits at z0 and the text
 * column at z1, so the copy appears closer than the waypoint field.
 *
 * P9-3-d (E3 — theme-blind fix): the waypoints were a HARDCODED
 * navy fill (invisible on the night ground). The dots now paint
 * currentColor and landing.css owns both stages: daylight keeps the
 * byte-identical rgba(27,42,65,.5) ink, the dark stage re-points the
 * same layer to pale waypoint ink rgba(185,194,210,.5) — pure CSS,
 * zero JS repaint needed (the static-SVG equivalent of the Smart-Link
 * P9-3-a canvas MutationObserver repaint).
 *
 * Perf: one passive scroll listener + one rAF. The canonical component
 * consumed Madarek's useReducedMotion hook; this port reads the media
 * query inline (the repo's port convention) — semantics byte-equal.
 */

type Star = { cx: number; cy: number; r: number; op: number }

const STAR_COUNT = 80
const VIEWBOX = 1200

/* W2-D1 (hydration truth): the seeded trig is deterministic WITHIN one
 * V8, but Node (server) and Chrome (client) ship different V8 builds
 * whose Math.sin/cos can differ by 1 ULP — enough for React 19 to flag
 * the whole tree on every landing visit (live-verified on production
 * 49e29f8: two hydration-mismatch console errors, one per layer of the
 * hero). Rounding to 3 decimals at the SOURCE makes the rendered values
 * byte-identical across runtimes; at this viewBox scale the delta is
 * 1/1000 of a unit on 1-2px decorative dots — invisible. */
const round3 = (v: number) => Math.round(v * 1000) / 1000

function makeStars(count: number, seed: number): Star[] {
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    // Deterministic pseudo-random by seed so layout is identical every render.
    const x = ((Math.sin(seed + i * 397.1) * 0.5 + 0.5) * VIEWBOX)
    const y = ((Math.cos(seed + i * 263.3) * 0.5 + 0.5) * VIEWBOX)
    const r = 0.5 + (Math.abs(Math.sin(seed + i * 179.7)) * 1.2)
    const op = 0.15 + (Math.abs(Math.sin(seed + i * 131.9)) * 0.35)
    stars.push({ cx: round3(x), cy: round3(y), r: round3(r), op: round3(op) })
  }
  return stars
}

export function HeroDepthLayer() {
  const ref = useRef<SVGSVGElement | null>(null)
  const raf = useRef(0)

  // Seeded so the star positions are deterministic across renders.
  const stars = makeStars(STAR_COUNT, 42)

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    const onScroll = () => {
      if (!raf.current) raf.current = requestAnimationFrame(tick)
    }
    const tick = () => {
      raf.current = 0
      const y = window.scrollY
      // Depth factor: how far scrolled relative to viewport height.
      const depth = y / (window.innerHeight || 1)
      // Slow parallax — ~0.2× scroll rate (scroll-craft baseline).
      const offset = depth * 40
      if (ref.current) {
        ref.current.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    // Initial sample so the layer starts at the right position.
    tick()

    return () => {
      window.removeEventListener("scroll", onScroll)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [])

  return (
    <svg
      ref={ref}
      className="ln-hero-depth"
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill="currentColor"
          opacity={s.op}
        />
      ))}
    </svg>
  )
}
