'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════════
   P12-2d — GlobeScene: the dotted-globe signature scene.
   ─────────────────────────────────────────────────────────────────────
   A plain 2D canvas with 3D math (ZERO new dependencies — the P12 spec
   locks the landing to a no-dep globe): continents are a hand-authored
   simplified landmass polygon set (lat/lon), sampled at runtime into
   ~1200 dots; rotation is Y-axis (drag + inertia + slow idle drift);
   projection carries a slight perspective (f≈4.2); backside dots dim to
   ~18% alpha. Orange (#FF6B00 dark / #C24E00 light via CSS vars) route
   arcs connect 7 REAL Libyan cities (طرابلس/الزاوية/مصراتة/سرت/بنغازي/
   درنة/سبها) — hub-and-spoke from Tripoli + one southern cross-link;
   arcs are quadratic 3D lifts with an animated dash offset, nodes
   pulse, each node wears a black mono label chip (white text).
   Theme: reads --globe-* vars off the canvas cascade + a
   MutationObserver on <html> class (next-themes toggles .dark) — no
   JS theme state, the CSS owns both stages.
   Discipline: DPR capped at 2, ResizeObserver re-fit, rAF paused when
   offscreen/hidden, prefers-reduced-motion → static poster frame
   (arcs drawn full, no dash animation) but drag still repaints
   (user-initiated). The canvas is decorative — aria role=img.
   shortcut: landmasses are stylized polygons, not survey data — swap
   for a bundled land-mask PNG if geographic fidelity is ever required.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── landmass data — [lon, lat] rings, hand-authored ─────────────────── */
const LAND: number[][][] = [
  // Africa (incl. the Horn)
  [[-17,15],[-16,22],[-10,30],[-6,33],[0,36],[10,37],[20,32],[25,32],[32,31],[34,28],[37,22],[38,18],[39,12],[43,11],[51,12],[48,5],[45,1],[41,-2],[40,-6],[40,-11],[40,-16],[36,-20],[35,-24],[32,-27],[28,-32],[25,-34],[20,-35],[18,-33],[14,-23],[12,-17],[13,-11],[12,-6],[9,-1],[9,4],[6,4],[3,6],[-4,5],[-8,4],[-13,9]],
  // Madagascar
  [[44,-16],[48,-13],[50,-16],[49,-20],[47,-25],[44,-25],[43,-20]],
  // Eurasia (Europe blob → Levant → Arabia → India → SE Asia → China → Siberia)
  [[-9,43],[-9,37],[-6,36],[-2,37],[0,39],[3,42],[6,43],[9,44],[10,44],[13,44],[14,42],[16,40],[18,40],[17,39],[16,38],[18,41],[16,44],[14,45],[13,45],[15,44],[19,42],[20,40],[22,38],[23,36],[24,38],[26,38],[26,40],[30,36],[36,36],[35,33],[34,31],[38,24],[39,20],[40,16],[43,12],[48,14],[52,15],[55,17],[59,22],[57,26],[52,28],[48,30],[50,26],[57,27],[61,25],[66,25],[67,24],[70,21],[72,19],[74,13],[77,8],[80,13],[83,17],[86,20],[88,22],[92,22],[94,18],[97,13],[100,8],[103,2],[102,8],[100,13],[98,16],[105,10],[106,9],[109,12],[108,16],[106,20],[108,21],[110,20],[113,22],[117,23],[120,26],[121,30],[122,31],[120,34],[122,37],[125,40],[126,35],[129,35],[130,40],[132,43],[135,44],[138,47],[140,50],[141,53],[143,53],[148,59],[153,59],[156,51],[158,52],[160,55],[163,55],[162,58],[166,60],[170,60],[176,62],[180,64],[180,66],[170,67],[160,68],[150,70],[140,72],[130,71],[120,73],[110,74],[100,77],[90,75],[80,73],[70,72],[60,70],[50,69],[44,67],[40,66],[35,65],[30,70],[25,71],[20,70],[15,68],[12,65],[10,63],[8,60],[8,57],[5,53],[3,51],[0,50],[-2,49],[-4,48],[-2,46],[-2,44]],
  // British Isles
  [[-5,50],[-3,53],[-5,56],[-3,58],[-1,57],[0,53],[1,51]],
  [[-10,52],[-6,55],[-6,52]],
  // Japan
  [[130,31],[131,34],[135,36],[139,38],[140,41],[143,42],[145,44],[141,45],[139,41],[136,37],[132,34]],
  // Philippines / Borneo / Sumatra / Java / New Guinea
  [[120,18],[122,16],[124,12],[125,8],[122,7],[120,12]],
  [[109,1],[112,4],[116,6],[118,3],[117,-1],[113,-3],[109,-1]],
  [[95,5],[98,2],[101,-1],[104,-4],[106,-6],[103,-5],[99,-1],[95,3]],
  [[105,-6],[110,-7],[114,-8],[105,-7]],
  [[131,-1],[135,-2],[140,-3],[145,-5],[150,-6],[147,-8],[141,-8],[136,-6],[131,-3]],
  // Australia + Tasmania + New Zealand
  [[114,-22],[114,-28],[115,-34],[120,-34],[125,-32],[130,-32],[135,-35],[138,-35],[140,-38],[145,-39],[148,-38],[150,-36],[153,-32],[153,-28],[152,-24],[149,-20],[146,-17],[143,-11],[141,-13],[137,-12],[135,-15],[131,-12],[129,-15],[126,-14],[122,-18],[118,-20]],
  [[145,-41],[148,-41],[148,-43],[145,-43]],
  [[173,-35],[176,-38],[174,-41],[172,-38]],
  // North America (incl. Alaska, Baja, Central America to Panama)
  [[-168,66],[-166,68],[-160,70],[-155,71],[-145,70],[-135,69],[-128,70],[-120,69],[-110,68],[-100,69],[-95,72],[-90,73],[-85,70],[-80,67],[-75,60],[-70,60],[-65,58],[-60,55],[-56,52],[-60,47],[-66,44],[-70,42],[-74,39],[-76,35],[-80,32],[-80,26],[-81,25],[-82,28],[-84,30],[-88,30],[-90,29],[-94,29],[-97,26],[-97,22],[-95,19],[-95,16],[-91,14],[-87,13],[-84,10],[-81,9],[-78,8],[-83,8],[-86,11],[-92,15],[-97,17],[-105,20],[-110,23],[-113,27],[-115,30],[-117,33],[-121,35],[-122,38],[-124,41],[-124,46],[-124,48],[-128,50],[-131,53],[-135,57],[-140,60],[-146,61],[-150,59],[-154,58],[-158,56],[-162,55],[-160,58],[-165,60]],
  // Greenland
  [[-45,60],[-42,62],[-40,65],[-32,68],[-22,70],[-20,75],[-22,78],[-30,82],[-40,83],[-50,82],[-58,80],[-62,77],[-60,74],[-58,70],[-54,66],[-50,62]],
  // South America
  [[-77,8],[-72,12],[-68,11],[-64,10],[-60,8],[-55,6],[-51,4],[-50,0],[-44,-3],[-38,-5],[-35,-8],[-37,-12],[-39,-15],[-40,-20],[-45,-24],[-48,-26],[-52,-32],[-56,-35],[-58,-38],[-62,-40],[-65,-45],[-67,-49],[-69,-53],[-66,-55],[-71,-54],[-73,-50],[-73,-46],[-72,-42],[-72,-37],[-71,-33],[-71,-27],[-70,-22],[-70,-18],[-73,-16],[-76,-13],[-79,-8],[-81,-5],[-80,-2],[-78,0],[-77,4]],
];

/* ray-cast point-in-polygon on the lon/lat plane */
function inPoly(lon: number, lat: number, poly: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i]![0]!, yi = poly[i]![1]!;
    const xj = poly[j]![0]!, yj = poly[j]![1]!;
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
function isLand(lon: number, lat: number): boolean {
  if (lat <= -71) return true; // Antarctica — the ice band, dateline-safe
  for (const poly of LAND) if (inPoly(lon, lat, poly)) return true;
  return false;
}

/* ── the dot field — deterministic seeded jitter, uniform on the sphere ── */
type Dot = { x: number; y: number; z: number }; // unit sphere, module-level (client-only import)
function buildDots(): Dot[] {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const dots: Dot[] = [];
  const STEP = 2.2; // ~1300 land dots at 30% coverage
  const D2R = Math.PI / 180;
  for (let lat = -86; lat <= 86; lat += STEP) {
    const ring = Math.max(1, Math.round((360 * Math.cos(lat * D2R)) / (STEP * 2)));
    const lonStep = 360 / ring;
    for (let i = 0; i < ring; i++) {
      const lon = -180 + (i + 0.5) * lonStep + (rand() - 0.5) * lonStep * 0.55;
      const la = lat + (rand() - 0.5) * STEP * 0.55;
      if (!isLand(lon, la)) continue;
      const cl = Math.cos(la * D2R);
      dots.push({ x: cl * Math.sin(lon * D2R), y: Math.sin(la * D2R), z: cl * Math.cos(lon * D2R) });
    }
  }
  return dots;
}
const DOTS: Dot[] = buildDots();

/* ── the Libyan route network — REAL cities, no freight claims ────────── */
type Node = { name: string; lat: number; lon: number; v: [number, number, number] };
const mkNode = (name: string, lat: number, lon: number): Node => {
  const D2R = Math.PI / 180;
  const cl = Math.cos(lat * D2R);
  return { name, lat, lon, v: [cl * Math.sin(lon * D2R), Math.sin(lat * D2R), cl * Math.cos(lon * D2R)] };
};
const TRIPOLI = mkNode('طرابلس', 32.88, 13.19);
const NODES: Node[] = [
  TRIPOLI,
  mkNode('الزاوية', 32.75, 12.72),
  mkNode('مصراتة', 32.38, 15.09),
  mkNode('سرت', 31.2, 16.55),
  mkNode('بنغازي', 32.12, 20.07),
  mkNode('درنة', 32.77, 22.64),
  mkNode('سبها', 27.04, 14.43),
];
/* hub-and-spoke from Tripoli + one southern cross-link (بنغازي↔سبها) */
const ARCS: [Node, Node][] = [
  [TRIPOLI, NODES[1]!], [TRIPOLI, NODES[2]!], [TRIPOLI, NODES[3]!],
  [TRIPOLI, NODES[4]!], [TRIPOLI, NODES[6]!], [NODES[4]!, NODES[6]!],
];

/* slerp + altitude lift → the 3D quadratic arc samples */
function arcPoints(a: [number, number, number], b: [number, number, number], lift: number, n: number) {
  const dot = Math.min(1, Math.max(-1, a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!));
  const om = Math.acos(dot);
  const so = Math.sin(om) || 1e-6;
  const h = lift + om * 0.22;
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const w1 = Math.sin((1 - t) * om) / so;
    const w2 = Math.sin(t * om) / so;
    const alt = 1 + h * Math.sin(Math.PI * t);
    pts.push([
      (a[0]! * w1 + b[0]! * w2) * alt,
      (a[1]! * w1 + b[1]! * w2) * alt,
      (a[2]! * w1 + b[2]! * w2) * alt,
    ]);
  }
  return pts;
}
const ARC_PTS = ARCS.map(([a, b], i) => arcPoints(a.v, b.v, 0.1 + (i % 3) * 0.05, 26));

/* ── the component ─────────────────────────────────────────────────────── */
const TILT = 0.26; // north tips slightly toward the viewer (Libya reads high)
const PERSP = 4.2; // focal length in globe radii — slight perspective
const AUTO_V = -0.0011; // rad/frame @60fps — slow idle drift (Europe/Africa → Pacific)
const DRAG_K = 0.0055; // rad per CSS px of horizontal drag

export default function GlobeScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* P13-2d (T4): reduced-motion is re-read LIVE now — was a one-shot
       const at mount, so flipping the OS/system setting mid-session left
       the canvas on the wrong regime (loop kept running for RM users,
       poster frozen for everyone else until reload). The change listener
       routes back through setRunning, which owns the poster/loop toggle
       and repaints the static frame when RM turns on. */
    const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = reducedMq.matches;
    const onReducedChange = () => {
      reduced = reducedMq.matches;
      setRunning(visible && !document.hidden);
    };
    reducedMq.addEventListener('change', onReducedChange);
    let W = 0, H = 0, R = 0, CX = 0, CY = 0;
    let rotY = -0.349; // 20°E front — the Med/Libya focus
    let vel = 0;
    let dragging = false;
    let lastX = 0;
    let lastInteract = 0;
    let dashPhase = 0;
    let clock = 0;
    let raf = 0;
    let visible = true;
    let running = false;
    let dotColor = '#FFFFFF';
    let arcColor = '#FF6B00';
    let glowColor = 'rgba(41, 98, 255, 0.16)';
    let chipFont = '600 10px IBM Plex Mono, Tajawal, sans-serif';

    const readTheme = () => {
      const cs = getComputedStyle(canvas);
      dotColor = cs.getPropertyValue('--globe-dot').trim() || dotColor;
      arcColor = cs.getPropertyValue('--globe-arc').trim() || arcColor;
      glowColor = cs.getPropertyValue('--globe-glow').trim() || glowColor;
      const f = cs.getPropertyValue('--globe-chip-font').trim();
      if (f) chipFont = f;
    };

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, canvas.clientWidth);
      H = Math.max(1, canvas.clientHeight);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) * 0.46;
      CX = W * 0.5;
      CY = H * 0.52;
    };

    /* rotate a unit-ish vector: Y-spin then X-tilt → [x, y, z, depth(z)] */
    const project = (x: number, y: number, z: number): [number, number, number, number] => {
      const cy = Math.cos(rotY), sy = Math.sin(rotY);
      let x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const ct = Math.cos(TILT), st = Math.sin(TILT);
      const y2 = y * ct - z1 * st;
      const z2 = y * st + z1 * ct;
      const s = PERSP / (PERSP - z2);
      x1 *= s;
      return [CX + x1 * R, CY - y2 * s * R, z2, s];
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      /* the atmospheric glow beneath the globe (CSS-var owned) */
      const g = ctx.createRadialGradient(CX, CY + R * 0.75, R * 0.1, CX, CY + R * 0.75, R * 1.6);
      g.addColorStop(0, glowColor);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      /* land dots — backside first (dimmed to ~18%), front on top */
      const dotR = Math.max(0.8, R * 0.0075);
      for (let pass = 0; pass < 2; pass++) {
        const wantBack = pass === 0;
        ctx.fillStyle = dotColor;
        for (const d of DOTS) {
          const [px, py, z, s] = project(d.x, d.y, d.z);
          if ((z < 0) !== wantBack) continue;
          ctx.globalAlpha = z < 0 ? 0.18 : 0.28 + 0.62 * z;
          ctx.beginPath();
          ctx.arc(px, py, dotR * s, 0, 6.2832);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      /* route arcs — quadratic 3D lifts, animated dash, depth-dimmed */
      const pulses: { node: Node; px: number; py: number; s: number; i: number }[] = [];
      ARC_PTS.forEach((pts, ai) => {
        ctx.strokeStyle = arcColor;
        ctx.lineWidth = 1.4;
        if (!reduced) {
          ctx.setLineDash([4, 7]);
          ctx.lineDashOffset = -dashPhase - ai * 5;
        }
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i]!;
          const [px, py, z] = project(p[0]!, p[1]!, p[2]!);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
          /* segment visibility is approximated per-vertex: whole arc keeps
             one alpha but backside arcs drop to the dim tier (the dotted-
             globe idiom — arcs read as front-layer routes) */
          ctx.globalAlpha = z < 0 ? 0.2 : 0.55 + 0.45 * z;
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      });

      /* nodes + label chips — front hemisphere only */
      NODES.forEach((node, i) => {
        const [px, py, z, s] = project(node.v[0], node.v[1], node.v[2]);
        if (z < 0.08) return;
        pulses.push({ node, px, py, s, i });
      });
      ctx.font = chipFont;
      ctx.textBaseline = 'middle';
      for (const p of pulses) {
        const pulse = reduced ? 1 : 1 + 0.22 * Math.sin(clock / 900 + p.i * 1.7);
        const r0 = Math.max(2.4, R * 0.011) * p.s;
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = arcColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.px, p.py, r0 * pulse + 2.5, 0, 6.2832);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = arcColor;
        ctx.beginPath();
        ctx.arc(p.px, p.py, r0, 0, 6.2832);
        ctx.fill();

        /* the black mono label chip — outward side, clamped to canvas */
        const tw = ctx.measureText(p.node.name).width;
        const cw = tw + 10;
        const ch = 15;
        const right = p.px > CX ? p.px + 8 : p.px - cw - 8;
        const rx = Math.min(Math.max(2, right), Math.max(2, W - cw - 2));
        const ry = Math.min(Math.max(2, p.py - ch - 3), Math.max(2, H - ch - 2));
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = '#000000';
        ctx.fillRect(rx, ry, cw, ch);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(p.node.name, rx + 5, ry + ch / 2 + 0.5);
      }
      ctx.globalAlpha = 1;
    };

    let lastNow = 0;
    const tick = (now: number) => {
      raf = 0;
      if (!running) return;
      const dt = Math.min(64, Math.max(0, lastNow ? now - lastNow : 16));
      lastNow = now;
      if (!reduced) {
        clock += dt;
        dashPhase = (dashPhase + dt * 0.014) % 100000;
        if (!dragging) {
          if (Math.abs(vel) > 0.00004) {
            rotY += vel * (dt / 16);
            vel *= Math.pow(0.94, dt / 16);
          } else if (now - lastInteract > 2400) {
            rotY += AUTO_V * (dt / 16);
          }
        }
      }
      draw();
      raf = requestAnimationFrame(tick);
    };

    const setRunning = (want: boolean) => {
      if (reduced) {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        draw(); // static poster frame
        return;
      }
      if (want && !running) {
        running = true;
        raf = requestAnimationFrame(tick);
      } else if (!want && running) {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    /* pointer drag — horizontal rotation with inertia */
    const onDown = (e: PointerEvent) => {
      dragging = true;
      vel = 0;
      lastX = e.clientX;
      lastInteract = performance.now();
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('is-dragging');
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      rotY += dx * DRAG_K;
      vel = vel * 0.65 + dx * DRAG_K * 0.35;
      lastInteract = performance.now();
      if (reduced) draw(); // user-initiated repaint, no loop
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      lastInteract = performance.now();
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      canvas.classList.remove('is-dragging');
    };

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((en) => en.isIntersecting);
      setRunning(visible && !document.hidden);
    }, { threshold: 0.01 });
    io.observe(canvas);

    const onVis = () => setRunning(visible && !document.hidden);
    document.addEventListener('visibilitychange', onVis);

    const mo = new MutationObserver(() => {
      readTheme();
      if (!running) draw();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const ro = new ResizeObserver(() => {
      fit();
      if (!running) draw();
    });
    ro.observe(canvas);

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    readTheme();
    fit();
    setRunning(true);

    return () => {
      io.disconnect();
      mo.disconnect();
      ro.disconnect();
      reducedMq.removeEventListener('change', onReducedChange);
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="ln-globe-canvas"
      role="img"
      aria-label="كرة أرضية منقّطة تُظهر شبكة طلبات سمارت أوردر بين المدن الليبية: طرابلس، الزاوية، مصراتة، سرت، بنغازي، درنة، سبها — بخطوط برتقالية متحركة. اسحب أفقياً لتدوير الكرة."
    />
  );
}

export { GlobeScene };
