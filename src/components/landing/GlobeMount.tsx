'use client';

import dynamic from 'next/dynamic';

/* P12-2d — the client mount for the landing globe. The hero stays a
 * SERVER component (h1 instant-paint LCP doctrine, r92/r142); the globe
 * is a decorative canvas island, so it loads client-only with
 * next/dynamic ssr:false — no SSR canvas, no hydration cost on the
 * critical path. */
const GlobeScene = dynamic(() => import('./GlobeScene'), {
  ssr: false,
  loading: () => null,
});

export function GlobeMount() {
  return <GlobeScene />;
}
