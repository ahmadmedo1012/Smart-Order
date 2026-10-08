import Link from "next/link";
import Image from "next/image";

/* r128-F8 (B24): kept minimal — the numeral rides the mono stack (family
   cohesion with the ln-mono pattern) + the quiet grain veil. Flat accent
   ink, no gradient/glow/orbit devices on the utility page. */
export default function NotFound() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="grain-overlay" aria-hidden="true" />
      <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="relative h-11 w-11" priority />
      <h1 className="relative mt-8 font-heading text-5xl font-bold text-accent-foreground tabular font-mono">404</h1>
      <h2 className="mt-3 font-heading text-xl font-semibold">الصفحة غير موجودة</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-xs leading-relaxed">
        الرابط الذي فتحته غير صحيح أو أن الصفحة لم تعد متاحة.
      </p>
      <Link
        href="/"
        className="relative mt-6 rounded-lg bg-primary text-primary-foreground h-11 px-6 inline-flex items-center font-semibold text-sm hover:bg-primary/90 transition-colors"
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
