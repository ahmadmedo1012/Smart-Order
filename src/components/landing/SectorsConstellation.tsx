"use client";

import { useEffect, useRef, useState } from "react";

/* r129 (F4) — SectorsConstellation: the sectors sky chart, promoted from
 * a server-rendered static SVG to a client island for the two canonical
 * disciplines the flat port lacked (audit S-13 + P2 resting-life):
 *
 * · ON-RING TRIGONOMETRY (canonical CollegeConstellation.tsx:18-46,
 *   105-119): pins are pure trigonometry ON the ring radii — ring
 *   radius + one angle per pin, phase-tuned so no two rings share a
 *   ray. The former hand-placed percentages computed to ring-distances
 *   145/220/188 vs radii 130/200/270 — the dashed tracks passed
 *   BESIDE the dots. Geometry below: every pin's distance from the
 *   stage center (500,320) equals its ring radius exactly.
 * · RESTING LIFE (canonical 200-240 + landing.css:897-900): one pin
 *   gently breathes at a time (is-resting, scale 1.45 + halo ring) on
 *   a 4s rotation — NEVER starts under prefers-reduced-motion, pauses
 *   while the stage is offscreen (IO), fully torn down on unmount.
 *
 * The stage stays decorative (aria-hidden spans; the accessible copy
 * lives in the chips strip below — the documented r128 adaptation). */

/** Stage geometry — must stay in lockstep with SectorsSection's SVG. */
const VIEW_W = 1000;
const VIEW_H = 640;
const CENTER_X = 500;
const CENTER_Y = 320;
/** Ring radii — the SVG <circle> r= set (inner/middle/outer). */
const RING_RADII = [130, 200, 270] as const;

/** Resting-highlight cadence — one sector every ~4s (canonical). */
const REST_CYCLE_MS = 4000;

export type SectorPin = {
  name: string;
  partners: string;
  count: string;
  /** ring index — the pin rides exactly on this ring's radius */
  ring: 0 | 1 | 2;
  /** angle in degrees, SVG coords (y grows down) — pure trig position */
  angle: number;
  /** dot fill (lime = live sectors, dim cream = the quiet tail) */
  dot: string;
};

/* polar helper — math on the viewBox grid; percentages derived at render
 * so the pin centers sit EXACTLY on the dashed tracks */
function onRing(ring: 0 | 1 | 2, angleDeg: number): { left: string; top: string } {
  const r = RING_RADII[ring];
  const rad = (angleDeg * Math.PI) / 180;
  const x = CENTER_X + r * Math.cos(rad);
  const y = CENTER_Y + r * Math.sin(rad);
  return { left: `${((x / VIEW_W) * 100).toFixed(2)}%`, top: `${((y / VIEW_H) * 100).toFixed(2)}%` };
}

export function SectorsConstellation({ sectors }: { sectors: SectorPin[] }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  /** Index of the resting-highlight sector (-1 = none). */
  const [restIdx, setRestIdx] = useState(-1);

  /* Resting-life cycle: rotate one gently lit pin every ~4s so the sky
   * reads as alive without hover. NEVER runs under prefers-reduced-
   * motion; paused while the stage is offscreen (IO); torn down on
   * unmount — the canonical CollegeConstellation effect, verbatim
   * in mechanism. */
  useEffect(() => {
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === "undefined") return;
    let inView = false;
    let timer = 0;
    const start = () => {
      if (timer) return;
      timer = window.setInterval(() => {
        setRestIdx((i) => (i + 1) % Math.max(1, sectors.length));
      }, REST_CYCLE_MS);
    };
    const stop = () => {
      window.clearInterval(timer);
      timer = 0;
    };
    const io = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting);
      if (visible === inView) return;
      inView = visible;
      if (visible) start();
      else stop();
    });
    io.observe(stage);
    return () => {
      io.disconnect();
      stop();
    };
  }, [sectors.length]);

  return (
    <div className="ln-constellation-stage" ref={stageRef}>
      <svg
        className="ln-constellation-svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <circle className="ln-constellation-ring" style={{ ["--ln-ri" as string]: 0 }} cx={CENTER_X} cy={CENTER_Y} r={RING_RADII[0]} />
        <circle className="ln-constellation-ring" style={{ ["--ln-ri" as string]: 1 }} cx={CENTER_X} cy={CENTER_Y} r={RING_RADII[1]} />
        <circle className="ln-constellation-ring" style={{ ["--ln-ri" as string]: 2 }} cx={CENTER_X} cy={CENTER_Y} r={RING_RADII[2]} />
      </svg>

      {/* the sectors — decorative pins ON the rings (the names live in
          the chips strip below, which is the accessible copy) */}
      {sectors.map((s, i) => {
        const pos = onRing(s.ring, s.angle);
        return (
          <span
            key={s.name}
            className={`ln-constellation-dot${i === restIdx ? " is-resting" : ""}`}
            aria-hidden="true"
            style={{ left: pos.left, top: pos.top, ["--dot" as string]: s.dot, ["--ln-ci" as string]: i }}
          >
            <span className="ln-constellation-tip">
              <b>{s.name}</b>
              <i>{s.partners}</i>
            </span>
          </span>
        );
      })}
    </div>
  );
}
