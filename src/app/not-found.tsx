import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <Image src="/brand-icon.png" alt="الربط الذكي" width={160} height={160} className="h-11 w-11" priority />
      <h1 className="mt-8 font-heading text-5xl font-bold text-primary tabular">404</h1>
      <h2 className="mt-3 font-heading text-xl font-semibold">الصفحة غير موجودة</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-xs leading-relaxed">
        الرابط الذي فتحته غير صحيح أو أن الصفحة لم تعد متاحة.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-primary text-primary-foreground h-11 px-6 inline-flex items-center font-semibold text-sm hover:bg-primary/90 transition-colors"
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
