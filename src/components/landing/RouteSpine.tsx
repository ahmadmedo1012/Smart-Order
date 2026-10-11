'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════════
   r142 «الخط» — RouteSpine: the road IS the page.
   ─────────────────────────────────────────────────────────────────────
   One continuous dashed SVG road that starts under the hero package,
   descends through EVERY chapter (each chapter head plants a
   [data-route-stop] marker — a station on the line), threads the six
   order-state stations, and terminates at the finale. A kraft parcel
   rides the line with scroll.

   Mechanics (the proven r141 kit, page-scale):
   · Waypoints: every [data-route-stop] element inside the route root,
     in document order — chapter-head markers are zero-size spans styled
     as road nodes; the six station buttons and the finale terminus are
     real elements anchored at their centers.
   · The path: smooth vertical cubics between waypoints (degenerate to
     straight when waypoints share an x); long gutter segments get a
     gentle ±18px sway so the road feels drawn, not plotted.
   · Scroll: ONE passive listener + ONE rAF (the shared-belt doctrine —
     useSectionProgress/useReveal precedent). Progress = the viewport
     focus line (scrollY + 62% vh) projected onto the road's vertical
     span; the parcel is glued to the DRAWN path via getPointAtLength +
     screenCTM (physical px, RTL-safe, scale-proof — the OrderJourney
     r141 approach) and the lit leg rides `--sp` with the canonical
     `stroke-dashoffset: calc(1 - var(--sp, 0))` idiom.
   · Rebuilds: ResizeObserver on the route root + window resize + a
     cheap per-frame scrollHeight check (catches content-visibility
     renders and image loads without layout thrash).
   · Zero setState: React renders the skeleton once; every write is
     imperative DOM (attribute/style) — no re-render per scroll frame.
   · prefers-reduced-motion: the parcel and the line become COMPLETELY
     static — no scroll listener is attached, the road renders fully
     lit (--sp pinned to 1) and the parcel parks at the first station.
   · No-JS: the canvas paints nothing (opacity-gated until first
     placement); the page reads perfectly without the line.
   ═══════════════════════════════════════════════════════════════════════ */

/** Gentle sway amplitude for long gutter runs (px). */
const SWAY = 18;
/** Segments longer than this get the sway (px). */
const SWAY_MIN = 320;
/** Clamp so the road never leaves the viewport corridor (px). */
const EDGE = 14;

export function RouteSpine() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const basePathRef = useRef<SVGPathElement | null>(null);
  const litPathRef = useRef<SVGPathElement | null>(null);
  const parcelRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const svg = svgRef.current;
    const basePath = basePathRef.current;
    const litPath = litPathRef.current;
    const parcel = parcelRef.current;
    /* the world is the positioned route root this canvas lives in */
    const world = canvas?.parentElement ?? null;
    if (!canvas || !svg || !basePath || !litPath || !parcel || !world) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── paint: --sp + parcel position from a scroll fraction ── */
    let pathTopDoc = 0;
    let pathSpan = 0;

    const paint = (focusRatio: number) => {
      const vh = window.innerHeight || 1;
      const focusDoc = window.scrollY + vh * focusRatio;
      const f = pathSpan > 0
        ? Math.min(1, Math.max(0, (focusDoc - pathTopDoc) / pathSpan))
        : 0;
      world.style.setProperty('--sp', f.toFixed(4));

      const len = litPath.getTotalLength();
      if (!len) return;
      const pt = litPath.getPointAtLength(f * len);
      const ctm = svg.getScreenCTM();
      const canvasRect = svg.getBoundingClientRect();
      if (!ctm || !canvasRect.width) return;
      const sx = ctm.a; // uniform scale (viewBox → px)
      parcel.style.left = `${pt.x * sx + ctm.e - canvasRect.left}px`;
      parcel.style.top = `${pt.y * sx + ctm.f - canvasRect.top}px`;
      parcel.style.opacity = '1';
    };

    /* ── build: measure waypoints → write the path ── */
    let docH = 0;
    const build = () => {
      const worldRect = world.getBoundingClientRect();
      const w = Math.max(1, Math.round(worldRect.width));
      const h = Math.max(1, Math.round(worldRect.height));
      const scrollY = window.scrollY;

      /* waypoints — document-order anchors inside the route root */
      const pts = Array.from(
        world.querySelectorAll<HTMLElement>('[data-route-stop]'),
      )
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            x: r.left + r.width / 2 - worldRect.left,
            y: r.top + r.height / 2 - worldRect.top,
          };
        })
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
        .map((p) => ({
          x: Math.min(Math.max(p.x, EDGE), w - EDGE),
          y: p.y,
        }));
      if (pts.length < 2) return;

      /* the road — vertical cubics; long gutter runs sway gently */
      let d = `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`;
      let swaySign = 1;
      for (let i = 1; i < pts.length; i += 1) {
        const a = pts[i - 1]!;
        const b = pts[i]!;
        const dy = b.y - a.y;
        if (Math.abs(b.x - a.x) < 2 && dy > 0) {
          const long = dy > SWAY_MIN;
          const s1 = long ? a.x + swaySign * SWAY : a.x;
          const s2 = long ? b.x + swaySign * SWAY : b.x;
          if (long) swaySign *= -1;
          d += ` C ${s1.toFixed(1)} ${(a.y + dy * 0.45).toFixed(1)}, ${s2.toFixed(1)} ${(b.y - dy * 0.45).toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
        } else {
          d += ` C ${a.x.toFixed(1)} ${(a.y + Math.max(dy, 0) * 0.5).toFixed(1)}, ${b.x.toFixed(1)} ${(b.y - Math.max(dy, 0) * 0.5).toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
        }
      }

      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.setAttribute('width', String(w));
      svg.setAttribute('height', String(h));
      basePath.setAttribute('d', d);
      litPath.setAttribute('d', d);

      pathTopDoc = worldRect.top + scrollY + pts[0]!.y;
      pathSpan = pts[pts.length - 1]!.y - pts[0]!.y;
      docH = document.documentElement.scrollHeight;

      svg.style.opacity = '1';
    };

    /* RM: the parcel parks at the first station and never moves again */
    const paintStatic = () => {
      world.style.setProperty('--sp', '1');
      const pt = litPath.getPointAtLength(0);
      const ctm = svg.getScreenCTM();
      const canvasRect = svg.getBoundingClientRect();
      if (ctm && canvasRect.width) {
        const sx = ctm.a;
        parcel.style.left = `${pt.x * sx + ctm.e - canvasRect.left}px`;
        parcel.style.top = `${pt.y * sx + ctm.f - canvasRect.top}px`;
        parcel.style.opacity = '1';
      }
    };

    let raf = 0;
    const frame = () => {
      raf = 0;
      if (document.hidden) return;
      /* cheap staleness check — catches CV renders + image loads */
      if (document.documentElement.scrollHeight !== docH) build();
      else paint(0.62);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    if (reduced) {
      /* the road and the parcel stand COMPLETELY still: fully lit road,
         parcel parked at the first station, zero scroll machinery */
      const roStatic = new ResizeObserver(() => {
        build();
        paintStatic();
      });
      roStatic.observe(world);
      build();
      paintStatic();
      return () => roStatic.disconnect();
    }

    const ro = new ResizeObserver(schedule);
    ro.observe(world);

    build();
    paint(0.62);

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="ln-route-canvas" aria-hidden="true" ref={canvasRef}>
      <svg className="ln-route-svg" ref={svgRef} style={{ opacity: 0 }}>
        <path className="ln-route-base" ref={basePathRef} fill="none" d="" />
        <path
          className="ln-route-lit"
          ref={litPathRef}
          fill="none"
          d=""
          pathLength={1}
        />
      </svg>
      <span className="ln-route-parcel" ref={parcelRef}>
        <span className="ln-route-parcel-tape" />
      </span>
    </div>
  );
}
