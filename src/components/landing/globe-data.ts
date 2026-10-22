/* ═══════════════════════════════════════════════════════════════════════
   P21-W6 (2-b-part2) — the landing globe's city/route network.
   ─────────────────────────────────────────────────────────────────────
   ONE source shared by the canvas (GlobeScene) and the explorer dock
   (GlobeMount — city chips + the routes panel). Real Libyan cities with
   REAL coordinates — the northern-coast clustering is geographic truth
   and is never distorted for layout; the chips panel is the honest
   disambiguator for cities that overlap on the sphere.

   DERNA RESOLUTION (P21-W6): درنة carried a marker but no route. The
   product's served-city registry — LIBYA_CITIES in src/lib/constants.ts,
   the list behind register/onboarding/checkout city selection — INCLUDES
   درنة, so the city is served by the product: the network gains its
   coastal route بنغازي ↔ درنة (the eastern coastal chain, the real
   road), completing 7 cities / 7 arcs. The arcs are the network story,
   never a delivery-time or freight claim (p20-reference-brief §3:
   purposeful visualization only, real data only).
   ═══════════════════════════════════════════════════════════════════════ */

export type GlobeCity = {
  id: string;
  name: string;
  /** real geographic coordinates — never nudged for composition */
  lat: number;
  lon: number;
  /** honest region label (ليبيا: الغرب / الوسط / الشرق / الجنوب) */
  region: string;
  /** the central hub of the network (العلامة التحريرية في لوحة المدينة) */
  hub?: boolean;
};

export const GLOBE_CITIES = [
  { id: "tripoli", name: "طرابلس", lat: 32.88, lon: 13.19, region: "الغرب", hub: true },
  { id: "zawiya", name: "الزاوية", lat: 32.75, lon: 12.72, region: "الغرب" },
  { id: "misrata", name: "مصراتة", lat: 32.38, lon: 15.09, region: "الوسط" },
  { id: "sirt", name: "سرت", lat: 31.2, lon: 16.55, region: "الوسط" },
  { id: "benghazi", name: "بنغازي", lat: 32.12, lon: 20.07, region: "الشرق" },
  { id: "derna", name: "درنة", lat: 32.77, lon: 22.64, region: "الشرق" },
  { id: "sebha", name: "سبها", lat: 27.04, lon: 14.43, region: "الجنوب — فزان" },
] as const satisfies readonly GlobeCity[];

/** the route arcs — hub-and-spoke from طرابلس + the southern cross-link
 * (بنغازي ↔ سبها) + the eastern coastal link (بنغازي ↔ درنة). */
export const GLOBE_ROUTES: readonly (readonly [string, string])[] = [
  ["tripoli", "zawiya"],
  ["tripoli", "misrata"],
  ["tripoli", "sirt"],
  ["tripoli", "benghazi"],
  ["tripoli", "sebha"],
  ["benghazi", "sebha"],
  ["benghazi", "derna"],
];

export function globeCityById(id: string): GlobeCity | undefined {
  return GLOBE_CITIES.find((c) => c.id === id);
}

/** the cities directly routed to `id`, in GLOBE_CITIES order (the panel
 * line and the canvas arc-highlight both derive from this — one truth). */
export function globeConnections(id: string): GlobeCity[] {
  return GLOBE_CITIES.filter((c) =>
    GLOBE_ROUTES.some(
      ([a, b]) => (a === id && b === c.id) || (b === id && a === c.id),
    ),
  );
}

/** «خط مباشر واحد / خطّان مباشران / N خطوط مباشرة» — the honest count
 * phrase derived from the route set (the r140 law: the template follows
 * the constant, so the phrase can never lie if the routes change). */
export function globeRoutesPhrase(id: string): string {
  const n = globeConnections(id).length;
  if (n === 1) return "خط مباشر واحد";
  if (n === 2) return "خطّان مباشران";
  return `${n} خطوط مباشرة`;
}
