'use client';

import { useEffect, useRef } from 'react';
import { GLOBE_CITIES, GLOBE_ROUTES, type GlobeCity } from './globe-data';

/* ═══════════════════════════════════════════════════════════════════════
   P21-W6 (2-b-part2) — GlobeScene: the dotted-globe EXPLORER.
   ─────────────────────────────────────────────────────────────────────
   The P12-2d engine survives intact (2D canvas + 3D math, ZERO new
   dependencies): hand-authored landmass polygons sampled into ~1200
   dots, Y-axis drag rotation with inertia + slow idle drift, slight
   perspective (f≈4.2), backside dimming, CSS-var theming, rAF paused
   offscreen, prefers-reduced-motion poster regime.

   What this wave adds — the globe becomes HONEST about its markers:
   · HOVER a city node → the node swells + wears a ring + its name chip
     appears (collision-aware placement: the chip never covers another
     node point and never overlaps the other visible chip; the sticky-
     note wall of 7 permanent labels is gone — quiet dots otherwise).
   · CLICK/TAP a node (effective hit area ≥44×44px — 22px radius,
     nearest-wins for the real coastal clustering) → SELECTED: scale +
     double ring + orange-edged chip, and the city's arcs light up
     while the rest recede. Clicking empty ocean deselects.
   · The idle drift PAUSES while a node is hovered (the marker must not
     slide out from under the cursor); a real drag (>3px) or a click
     reports onFirstInteract so the mount can retire the drag hint.
   · Drag stays horizontal-only (touch-action: pan-y keeps the page
     scrollable over the canvas — never trap the scroll).
   The keyboard path is the chip dock (GlobeMount) — the canvas stays
   role=img decoration with an honest description.
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

/* ── the Libyan route network — globe-data is the one source ──────────── */
type Node = { city: GlobeCity; v: [number, number, number] };
const mkNode = (city: GlobeCity): Node => {
  const D2R = Math.PI / 180;
  const cl = Math.cos(city.lat * D2R);
  return {
    city,
    v: [cl * Math.sin(city.lon * D2R), Math.sin(city.lat * D2R), cl * Math.cos(city.lon * D2R)],
  };
};
const NODES: Node[] = GLOBE_CITIES.map(mkNode);
const nodeById = new Map(NODES.map((n, i) => [n.city.id, i]));

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
type Route = { a: Node; b: Node; pts: [number, number, number][] };
const ROUTES: Route[] = GLOBE_ROUTES.map(([aId, bId], i) => {
  const a = NODES[nodeById.get(aId) ?? 0]!;
  const b = NODES[nodeById.get(bId) ?? 0]!;
  return { a, b, pts: arcPoints(a.v, b.v, 0.1 + (i % 3) * 0.05, 26) };
});

/* ── the component ─────────────────────────────────────────────────────── */
const TILT = 0.26; // north tips slightly toward the viewer (Libya reads high)
const PERSP = 4.2; // focal length in globe radii — slight perspective
const AUTO_V = -0.0011; // rad/frame @60fps — slow idle drift (Europe/Africa → Pacific)
const DRAG_K = 0.0055; // rad per CSS px of horizontal drag
const HIT_R = 22; // CSS px — the ≥44×44px effective marker hit area
const DRAG_MIN = 3; // CSS px of travel before a gesture counts as a drag

export type GlobeSceneProps = {
  /** the selected city id (chip- or canvas-driven) — drives the marker
   * state + the arc emphasis; null = nothing selected. */
  selectedId: string | null;
  /** click/tap on a marker (its id) or on empty ocean (null). */
  onSelect: (id: string | null) => void;
  /** fired once-ish: the first REAL interaction (drag gesture or click). */
  onFirstInteract: () => void;
};

export default function GlobeScene({ selectedId, onSelect, onFirstInteract }: GlobeSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /* the draw loop reads the live selection + callbacks from refs — prop
     changes never re-mount the canvas (the rotation state would reset).
     The refs are written in effects (never during render). */
  const selectedRef = useRef<string | null>(selectedId);
  const selectCb = useRef(onSelect);
  const firstInteractCb = useRef(onFirstInteract);
  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    selectCb.current = onSelect;
    firstInteractCb.current = onFirstInteract;
  }, [onSelect, onFirstInteract]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* P13-2d (T4): reduced-motion is re-read LIVE — the change listener
       routes back through setRunning, which owns the poster/loop toggle. */
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
    /* P23-D — the layered atmosphere's two new coats (CSS-var owned,
       steel family at night / navy-steel on paper — see landing.css) */
    let haloColor = 'rgba(143, 187, 242, 0.10)';
    let rimColor = 'rgba(197, 222, 250, 0.16)';
    let chipFont = '600 12px Tajawal, "Noto Kufi Arabic", sans-serif';

    /* the interaction state (hover + hit cache) */
    let hovered = -1; // NODES index or -1
    let pointer = { x: 0, y: 0, inside: false };
    type NodePt = { px: number; py: number; z: number; s: number };
    let nodePts: NodePt[] = [];

    const readTheme = () => {
      const cs = getComputedStyle(canvas);
      dotColor = cs.getPropertyValue('--globe-dot').trim() || dotColor;
      arcColor = cs.getPropertyValue('--globe-arc').trim() || arcColor;
      glowColor = cs.getPropertyValue('--globe-glow').trim() || glowColor;
      haloColor = cs.getPropertyValue('--globe-halo').trim() || haloColor;
      rimColor = cs.getPropertyValue('--globe-rim').trim() || rimColor;
      const f = cs.getPropertyValue('--globe-chip-font').trim();
      if (f) chipFont = f;
    };

    /* P23-D — recolor-with-alpha helper: accepts '#rrggbb' or
       'rgba(r,g,b,a)' and returns the same color at a NEW alpha (the
       bloom/rim/halo coats derive their fade stops without hand-coded
       color pairs — the CSS var stays the single source of truth). */
    const withAlphaRgba = (color: string, a: number): string => {
      const hex = color.match(/^#([0-9a-f]{6})$/i);
      if (hex) {
        const n = parseInt(hex[1]!, 16);
        return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
      }
      const m = color.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/i);
      if (m) return `rgba(${Math.round(+m[1])}, ${Math.round(+m[2])}, ${Math.round(+m[3])}, ${a})`;
      return color;
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

    /* ── collision-aware label placement ────────────────────────────────
       The chip (w×h at x,y) must: stay in bounds, never cover another
       node point (6px margin — a label sitting on a stranger dot reads
       as a lie), and never overlap the other visible chip. Candidates
       in preference order: outward-from-center side (labels land over
       ocean/sky, not the globe face), above, inward side, below. If
       every candidate collides (the real coastal cluster is tight), the
       outward side is nudged vertically in 16px steps until clear. */
    type Rect = { x: number; y: number; w: number; h: number };
    const placeLabel = (idx: number, w: number, h: number, placed: Rect[]): Rect => {
      const p = nodePts[idx]!;
      const gap = 10;
      const outwardRight = p.px >= CX;
      const side = (right: boolean): Rect =>
        right ? { x: p.px + gap, y: p.py - h / 2, w, h } : { x: p.px - gap - w, y: p.py - h / 2, w, h };
      const cands: Rect[] = [
        side(outwardRight),
        { x: p.px - w / 2, y: p.py - gap - h, w, h },
        side(!outwardRight),
        { x: p.px - w / 2, y: p.py + gap, w, h },
      ];
      const inBounds = (r: Rect) => r.x >= 2 && r.y >= 2 && r.x + r.w <= W - 2 && r.y + r.h <= H - 2;
      const hitsNode = (r: Rect) =>
        nodePts.some((q, qi) => {
          if (qi === idx) return false;
          /* back-side nodes are invisible — a chip over them is fine */
          if (q.z < 0.08) return false;
          return q.px > r.x - 6 && q.px < r.x + r.w + 6 && q.py > r.y - 6 && q.py < r.y + r.h + 6;
        });
      const hitsChip = (r: Rect) =>
        placed.some((a) => !(r.x > a.x + a.w || r.x + r.w < a.x || r.y > a.y + a.h || r.y + r.h < a.y));
      for (const r of cands) {
        if (inBounds(r) && !hitsNode(r) && !hitsChip(r)) return r;
      }
      /* fallback — the outward side, clamped in-bounds, nudged clear of
         the other chip (chips may end up near a stranger dot, but two
         READABLE chips never stack; that is the hard requirement). */
      let r = side(outwardRight);
      for (let t = 0; t < 6 && hitsChip(r); t++) {
        r = { ...r, y: r.y + (t % 2 === 0 ? 1 : -1) * 16 * (Math.floor(t / 2) + 1) };
      }
      return {
        x: Math.min(Math.max(2, r.x), Math.max(2, W - w - 2)),
        y: Math.min(Math.max(2, r.y), Math.max(2, H - h - 2)),
        w,
        h,
      };
    };

    const drawChip = (idx: number, isSelected: boolean, placed: Rect[]) => {
      const p = nodePts[idx]!;
      const name = NODES[idx]!.city.name;
      ctx.font = chipFont;
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(name).width;
      const r = placeLabel(idx, tw + 14, 20, placed);
      placed.push(r);
      ctx.globalAlpha = p.z < 0.08 ? 0.45 : 0.92;
      ctx.fillStyle = '#000000';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      if (isSelected) {
        ctx.strokeStyle = arcColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      }
      ctx.globalAlpha = p.z < 0.08 ? 0.55 : 1;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(name, r.x + 7, r.y + r.h / 2 + 0.5);
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      /* P23-D — THE LAYERED ATMOSPHERE (the fresh audit read the globe
         as "pasted on top — no volumetric glow, no rim light": a flat
         dotted circle over a void). Three coats, all CSS-var owned:
         1. the WIDE HALO — a soft sphere-centered bloom (steel at
            night / navy-steel on paper) that lifts the sphere off the
            deep ground — the sphere now sits IN light, not on black;
         2. the LIMB RING — an offset-center radial band hugging the
            limb, brighter toward the light (upper-left, matching the
            hero sky radial at 30% 44%) and falling to nothing around
            the dark limb — the read of a lit sphere EDGE, never a
            cut-out circle. evenodd annulus fill (R*0.88 → R*1.015);
         3. the UNDER-GLOW — the original bottom-weighted ground
            breath, kept (the sphere still grounds at its base). */
      const halo = ctx.createRadialGradient(CX, CY, R * 0.5, CX, CY, R * 1.48);
      halo.addColorStop(0, haloColor);
      halo.addColorStop(0.62, withAlphaRgba(haloColor, 0.45));
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);

      /* the limb ring — light source sits upper-left inside the sphere
         (0.28R/0.30R off center); the near limb lands ≈0.72R from it,
         the far limb ≈1.42R — the band sweeps bright→dim around */
      const LX = CX - R * 0.28;
      const LY = CY - R * 0.3;
      const rim = ctx.createRadialGradient(LX, LY, R * 0.3, LX, LY, R * 1.6);
      rim.addColorStop(0, 'rgba(0,0,0,0)');
      rim.addColorStop(0.45, rimColor);
      rim.addColorStop(0.86, withAlphaRgba(rimColor, 0.28));
      rim.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(CX, CY, R * 1.015, 0, 6.2832);
      ctx.arc(CX, CY, R * 0.88, 0, 6.2832, true);
      ctx.fill('evenodd');

      /* the under-glow beneath the globe (CSS-var owned) */
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

      /* node screen positions — cached for hit-testing + labels */
      nodePts = NODES.map((n) => {
        const [px, py, z, s] = project(n.v[0]!, n.v[1]!, n.v[2]!);
        return { px, py, z, s };
      });

      /* route arcs — quadratic 3D lifts, animated dash, depth-dimmed.
         A selected city throws its own arcs to full emphasis (alpha .95,
         1.8px) while the rest recede — the explorer read. */
      const sel = selectedRef.current;
      const selIdx = sel != null ? (nodeById.get(sel) ?? -1) : -1;
      ROUTES.forEach((route, ai) => {
        const owns =
          selIdx >= 0 && (route.a === NODES[selIdx] || route.b === NODES[selIdx]);
        ctx.strokeStyle = arcColor;
        /* P23-D: 1.4 → 1.6 — the audit read the resting routes as
           invisible threads; one hairline rung up keeps the explorer
           hierarchy (selected 1.8 stays dominant) while the network
           reads at a glance */
        ctx.lineWidth = owns ? 1.8 : 1.6;
        if (!reduced) {
          ctx.setLineDash([4, 7]);
          ctx.lineDashOffset = -dashPhase - ai * 5;
        }
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < route.pts.length; i++) {
          const p = route.pts[i]!;
          const [px, py, z] = project(p[0]!, p[1]!, p[2]!);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
          const base = z < 0 ? 0.2 : Math.max(0.5, 0.55 + 0.45 * z);
          ctx.globalAlpha = owns ? Math.max(0.28, base) * (selIdx >= 0 ? 1.55 : 1) : selIdx >= 0 ? base * 0.38 : base;
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      });

      /* nodes — quiet by default (small pulse), swelled + ringed when
         hovered, double-ringed + bright when selected. The selected and
         hovered nodes draw even on the backside (dimmed) — a chip pick
         must never point at nothing. */
      const placedChips: Rect[] = [];
      /* draw the selected chip first (persistent), hovered avoids it */
      const hoverIdx = hovered;
      const chipOrder = [selIdx, hoverIdx].filter((i, k, arr) => i >= 0 && arr.indexOf(i) === k);
      for (const idx of chipOrder) {
        const isSel = idx === selIdx;
        const p = nodePts[idx]!;
        const front = p.z >= 0.08;
        const base = Math.max(2.4, R * 0.011) * p.s;
        const dim = front ? 1 : 0.4;
        if (isSel) {
          /* selection: scale + double ring + solid core */
          ctx.globalAlpha = 0.32 * dim;
          ctx.strokeStyle = arcColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.px, p.py, base * 3.4 + 3, 0, 6.2832);
          ctx.stroke();
          ctx.globalAlpha = 0.95 * dim;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(p.px, p.py, base * 2.2 + 3, 0, 6.2832);
          ctx.stroke();
          ctx.globalAlpha = dim;
          ctx.fillStyle = arcColor;
          ctx.beginPath();
          ctx.arc(p.px, p.py, base * 1.6, 0, 6.2832);
          ctx.fill();
        } else {
          /* hover: swell + single ring */
          ctx.globalAlpha = 0.85 * dim;
          ctx.strokeStyle = arcColor;
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.arc(p.px, p.py, base * 2.2 + 3, 0, 6.2832);
          ctx.stroke();
          ctx.globalAlpha = dim;
          ctx.fillStyle = arcColor;
          ctx.beginPath();
          ctx.arc(p.px, p.py, base * 1.35, 0, 6.2832);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      /* the quiet nodes (pulse when live; still when a selection
         focuses). P23-D — the flat "pasted dot" dies: each resting
         node now reads as EMITTED LIGHT — a soft radial bloom (the
         route orange breathing out to ~4.5× the core) under the
         bright core + the existing hairline ring. Layered light, not
         a vector circle. */
      for (let i = 0; i < NODES.length; i++) {
        if (i === selIdx || i === hoverIdx) continue;
        const p = nodePts[i]!;
        if (p.z < 0.08) continue;
        const pulse = reduced || selIdx >= 0 ? 1 : 1 + 0.22 * Math.sin(clock / 900 + i * 1.7);
        const base = Math.max(2.4, R * 0.011) * p.s;
        /* the bloom — a gradient, not a bigger solid dot */
        const bloomR = base * 4.5 * pulse;
        const bloom = ctx.createRadialGradient(p.px, p.py, 0, p.px, p.py, bloomR);
        bloom.addColorStop(0, withAlphaRgba(arcColor, 0.34));
        bloom.addColorStop(0.5, withAlphaRgba(arcColor, 0.13));
        bloom.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = selIdx >= 0 ? 0.4 : 0.85;
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(p.px, p.py, bloomR, 0, 6.2832);
        ctx.fill();
        /* the bright core */
        ctx.globalAlpha = selIdx >= 0 ? 0.5 : 0.9;
        ctx.fillStyle = arcColor;
        ctx.beginPath();
        ctx.arc(p.px, p.py, base * pulse, 0, 6.2832);
        ctx.fill();
        ctx.globalAlpha = selIdx >= 0 ? 0.25 : 0.55;
        ctx.strokeStyle = arcColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.px, p.py, base * pulse + 2.5, 0, 6.2832);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      /* the visible chips — selected (orange-edged) then hovered */
      for (const idx of chipOrder) drawChip(idx, idx === selIdx, placedChips);
      ctx.globalAlpha = 1;
    };

    /* nearest front-side node within HIT_R of (x, y) — the ≥44×44
       effective hit area, nearest-wins over the real coastal cluster */
    const hitTest = (x: number, y: number): number => {
      let best = -1;
      let bestD = HIT_R * HIT_R;
      for (let i = 0; i < nodePts.length; i++) {
        const p = nodePts[i]!;
        if (p.z < 0.05) continue; // a marker on the far side is not a target
        const d = (p.px - x) * (p.px - x) + (p.py - y) * (p.py - y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    };

    const applyHover = (x: number, y: number) => {
      const hit = hitTest(x, y);
      if (hit !== hovered) {
        hovered = hit;
        canvas.style.cursor = hit >= 0 ? 'pointer' : 'grab';
        if (!running) draw(); // poster regime repaints on user-driven state
      }
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
          } else if (now - lastInteract > 2400 && hovered < 0) {
            /* idle drift — paused while a marker is hovered: the label
               must not slide out from under the cursor */
            rotY += AUTO_V * (dt / 16);
          }
        }
      }
      draw();
      /* drift may move markers under a resting cursor — re-hit-test */
      if (pointer.inside && !dragging) applyHover(pointer.x, pointer.y);
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

    /* pointer drag — horizontal rotation with inertia; a press that
       never travels 3px is a CLICK (marker select / ocean deselect). */
    let downX = 0, downY = 0, traveled = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      traveled = 0;
      downX = e.clientX;
      downY = e.clientY;
      vel = 0;
      lastX = e.clientX;
      lastInteract = performance.now();
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('is-dragging');
    };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top, inside: true };
      if (!dragging) {
        applyHover(pointer.x, pointer.y);
        return;
      }
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      traveled = Math.max(traveled, Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY));
      if (traveled >= DRAG_MIN) {
        firstInteractCb.current(); // a REAL gesture — retire the hint
        rotY += dx * DRAG_K;
        vel = vel * 0.65 + dx * DRAG_K * 0.35;
      }
      lastInteract = performance.now();
      if (reduced) draw(); // user-initiated repaint, no loop
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      lastInteract = performance.now();
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      canvas.classList.remove('is-dragging');
      if (traveled < DRAG_MIN) {
        /* a click/tap — marker select or ocean deselect (22px radius) */
        const rect = canvas.getBoundingClientRect();
        const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
        firstInteractCb.current();
        selectCb.current(hit >= 0 ? NODES[hit]!.city.id : null);
        if (reduced) draw();
      }
    };
    const onLeave = () => {
      pointer = { ...pointer, inside: false };
      if (hovered >= 0) {
        hovered = -1;
        canvas.style.cursor = 'grab';
        if (!running) draw();
      }
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
    canvas.addEventListener('pointerleave', onLeave);

    readTheme();
    fit();
    setRunning(true);

    /* the label chips set their font from CSS — the first poster frame
       may paint before the webfonts arrive; re-draw once they do. */
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!running) draw();
      }).catch(() => { /* font promise rejection — the fallback is fine */ });
    }

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
      canvas.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="ln-globe-canvas"
      role="img"
      aria-label={`كرة أرضية منقّطة تُظهر شبكة طلبات سمارت أوردر بين سبع مدن ليبية — طرابلس، الزاوية، مصراتة، سرت، بنغازي، درنة، سبها — بخطوط برتقالية. اسحب أفقياً لتدوير الكرة، والمس نقطة مدينة لاختيارها؛ قائمة المدن أسفل الكرة تعرضها جميعاً كأزرار.`}
    />
  );
}

export { GlobeScene };
