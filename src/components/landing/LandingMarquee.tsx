/**
 * LandingMarquee — the Orbit-Ink marquee strip (PORT-KIT §3).
 *
 * Server-safe (no hooks, no client runtime): the strip renders the real
 * item list DUPLICATED ×2 inside the track — the CSS layer
 * (src/app/landing.css §1) runs the seamless RTL loop: one 42s linear
 * pass, translateX(0 → calc(50% + 24px)), hard edges (no mask/fade),
 * 5×5px lime dot separators at the 48px rhythm. Decorative by design:
 * aria-hidden, canonical structure (madarek LandingPage.tsx:410-419).
 */
interface LandingMarqueeProps {
  items: string[];
}

export function LandingMarquee({ items }: LandingMarqueeProps) {
  return (
    <section className="ln-marquee" aria-hidden="true">
      <div className="ln-marquee-track">
        {[...items, ...items].map((it, i) => (
          <span className="ln-marquee-item" key={i}>
            {it}
            <span className="ln-marquee-sep">·</span>
          </span>
        ))}
      </div>
    </section>
  );
}
