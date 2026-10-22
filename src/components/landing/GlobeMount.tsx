'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
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
   state (the selected city + has-interacted) and renders three pieces
   anchored to the hero:

     · .ln-globe-stage — the absolute top-right canvas bleed (geometry
       unchanged from P12); inside it the dynamic ssr:false GlobeScene
       (no SSR canvas, no hydration cost on the critical path) + the
       «اسحب للتدوير» affordance chip, which retires after the first
       real interaction.
     · .ln-globe-dock — the accessible city list: 7 real <button> chips
       (keyboard navigable, 44px floor, aria-pressed) + the routes
       panel. The dock rides in the hero flow between the copy frame
       and the roadmark board — a fixed slot, same composition at every
       breakpoint; at ≤1023px the chips + panel ARE the interaction
       (the globe is a deliberately simpler backdrop there).

   The chips and the canvas markers share ONE selection state — the
   honest answer to the real coastal clustering (طرابلس/الزاوية sit
   3px apart on the sphere at the default rotation: closest-click wins
   on the canvas, and the chips disambiguate exactly).
   ═══════════════════════════════════════════════════════════════════════ */

const GlobeScene = dynamic(() => import('./GlobeScene'), {
  ssr: false,
  loading: () => null,
});

export function GlobeMount() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [interacted, setInteracted] = useState(false);

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);
  const handleFirstInteract = useCallback(() => {
    setInteracted(true); // idempotent — React bails once true
  }, []);

  const city = selectedId ? (globeCityById(selectedId) ?? null) : null;
  const connections = city ? globeConnections(city.id) : [];

  return (
    <>
      {/* S1 — the dotted globe, bleeding off the top-right frame edge
          (absolute; the canvas is the pointer surface, the wrapper never
          blocks the page — pointer-events tuned in landing.css). */}
      <div className="ln-globe-stage">
        <GlobeScene
          selectedId={selectedId}
          onSelect={handleSelect}
          onFirstInteract={handleFirstInteract}
        />
        {/* the affordance — a quiet glass chip under the globe, retired
            after the first drag/click (data-seen flips it to opacity 0) */}
        <span className="ln-globe-hint" aria-hidden="true" data-seen={interacted || undefined}>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
            <path
              d="M1.5 8h13M4.5 5 1.5 8l3 3M11.5 5l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="ln-mono">اسحب للتدوير</span>
        </span>
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
                onClick={() => {
                  handleFirstInteract();
                  handleSelect(active ? null : c.id);
                }}
              >
                <span className="ln-globe-chip-dot" aria-hidden="true" />
                {c.name}
              </button>
            );
          })}
        </div>

        {/* the routes panel — name + region + direct lines; idle state
            teaches the interaction. aria-live: chip picks announce. */}
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
                المس نقطة على الكرة أو اختر مدينةً من الأزرار لعرض خطوطها المباشرة.
              </span>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
