'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GLOBE_CITIES,
  GLOBE_ROUTES,
  globeCityById,
  globeConnections,
  globeRoutesPhrase,
} from './globe-data';

/* ═══════════════════════════════════════════════════════════════════════
   P21-W6 (2-b-part2) — GlobeMount: the globe EXPLORER mount.
   ─────────────────────────────────────────────────────────────────────
   The hero stays a SERVER component (h1 instant-paint LCP doctrine,
   r92/r142) and mounts this ONE client island. It owns the explorer
   state (the selected city) and renders two pieces anchored to the
   hero (P31-D: the third — the floating drag-hint chip — retired):

     · .ln-globe-stage — the absolute top-right canvas bleed (P31-D:
       the deliberate DISSOLVED bleed — the sphere's lower-left limb
       intersects the copy column's edge; see landing.css); inside it
       the dynamic ssr:false GlobeScene (no SSR canvas, no hydration
       cost on the critical path).
     · .ln-globe-dock — the accessible city list: 7 real <button> chips
       (keyboard navigable, 44px floor, aria-pressed; P31-D: idle = the
       recessed round pill, selected = the squared route-orange stamp —
       the repo's own franked-stamp grammar) + the routes panel, whose
       idle line now also teaches the DRAG (the floating «اسحب
       للتدوير» glass hint retired — bolted-on chrome). The dock rides
       in the hero flow between the copy frame and the roadmark board.

   The chips and the canvas markers share ONE selection state — the
   honest answer to the real coastal clustering (طرابلس/الزاوية sit
   3px apart on the sphere at the default rotation: closest-click wins
   on the canvas, and the chips disambiguate exactly).

   P31-D — the OVERVIEW-RETURN contract: Escape anywhere, or a pointer
   press outside the explorer (the stage + the dock, one display:contents
   root), returns the network to its overview state. The listeners ride
   ONLY while a city is selected.
   ═══════════════════════════════════════════════════════════════════════ */

const GlobeScene = dynamic(() => import('./GlobeScene'), {
  ssr: false,
  loading: () => null,
});

export function GlobeMount() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /* the display:contents wrapper gives the click-outside contract a DOM
     root (layout stays byte-identical — the stage still positions against
     the hero section) */
  const explorerRef = useRef<HTMLDivElement | null>(null);

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  /* P31-D — Escape / click-outside → back to the overview network. */
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (explorerRef.current && !explorerRef.current.contains(e.target as Node)) {
        setSelectedId(null);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [selectedId]);

  const city = selectedId ? (globeCityById(selectedId) ?? null) : null;
  const connections = city ? globeConnections(city.id) : [];

  return (
    <div className="ln-globe-explorer" ref={explorerRef}>
      {/* S1 — the dotted globe, the dissolved top-right bleed (absolute;
          the canvas is the pointer surface, the wrapper never blocks the
          page — pointer-events tuned in landing.css). */}
      <div className="ln-globe-stage">
        <GlobeScene selectedId={selectedId} onSelect={handleSelect} />
      </div>

      {/* the explorer dock — city chips (the accessible list) + panel */}
      <div className="ln-globe-dock">
        <div className="ln-globe-chips" role="group" aria-label="مدن شبكة سمارت أوردر — اختر مدينة لعرض خطوطها">
          {GLOBE_CITIES.map((c) => {
            const active = selectedId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                className="ln-globe-chip"
                aria-pressed={active}
                data-active={active || undefined}
                onClick={() => handleSelect(active ? null : c.id)}
              >
                <span className="ln-globe-chip-dot" aria-hidden="true" />
                {c.name}
              </button>
            );
          })}
        </div>

        {/* the routes panel — name + region + direct lines; idle state
            teaches the whole interaction (drag + touch + chips — the
            floating hint chip retired with P31-D). aria-live: chip picks
            announce. */}
        <div className="ln-globe-panel" aria-live="polite">
          {city ? (
            <div className="ln-globe-panel-city" key={city.id}>
              <div className="ln-globe-panel-head">
                <span className="ln-globe-panel-name">{city.name}</span>
                <span className="ln-mono ln-globe-panel-region">
                  {city.region} — {city.hub ? "العقدة المركزية · " : ""}
                  {globeRoutesPhrase(city.id)}
                </span>
              </div>
              <p className="ln-globe-panel-routes">
                متصلة مباشرةً بـ:
                {connections.map((c, i) => (
                  <span key={c.id}>
                    {i > 0 ? " · " : " "}
                    <span className="ln-globe-panel-cityname">{c.name}</span>
                  </span>
                ))}
              </p>
            </div>
          ) : (
            <p className="ln-globe-panel-idle">
              <span className="ln-mono ln-globe-panel-region">
                شبكة المدن — {GLOBE_CITIES.length} مدن · {GLOBE_ROUTES.length} خطوط
              </span>
              <span className="ln-globe-panel-idle-line">
                اسحب الكرة أفقيًا لتدويرها — والمس نقطة مدينة أو اخترها من الأزرار لعرض خطوطها المباشرة.
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
