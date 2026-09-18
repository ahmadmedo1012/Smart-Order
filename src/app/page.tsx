import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  ClipboardList,
  Truck,
  CreditCard,
  BarChart3,
  MessageCircle,
  Smartphone,
  Zap,
  ShieldCheck,
  ArrowLeft,
  Globe,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md safe-top">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <BrandLogo />
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">المزايا</a>
            <a href="#how" className="hover:text-foreground transition-colors">كيف يعمل</a>
            <a href="#local" className="hover:text-foreground transition-colors">صُمم لليبيا</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">تسجيل الدخول</Link>
            </Button>
            <Button asChild size="sm" className="font-medium">
              <Link href="/register">
                أنشئ متجرك
                <ArrowLeft className="size-4 ms-1" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ===== Hero ===== */}
        <section className="relative overflow-hidden">
          {/* subtle brand glow — restrained, no clutter */}
          <div aria-hidden="true" className="pointer-events-none absolute -top-40 start-1/2 -translate-x-1/2 size-[42rem] rounded-full bg-primary/8 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-52 -end-32 size-[36rem] rounded-full bg-saffron/10 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
            <Badge variant="outline" className="mb-6 gap-2 border-primary/30 bg-primary/5 text-primary px-4 py-1.5 text-sm">
              <Zap className="size-3.5" aria-hidden="true" />
              منصة الطلبات الرقمية للأعمال الليبية
            </Badge>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.15] tracking-tight max-w-3xl mx-auto">
              متجرك الرقمي الجاهز
              <span className="text-gradient-flame"> لاستقبال الطلبات</span> في دقائق
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              قائمة منتجات أنيقة، سلة وطلب بضغطة واحدة، توصيل بمناطق ورسوم تحددها أنت،
              ومدفوعات مدار وليبيانا ونقداً — كل ذلك من لوحة تحكم واحدة تعمل على هاتفك.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild variant="flame" size="lg">
                <Link href="/register">
                  ابدأ مجاناً — أنشئ متجرك
                  <ArrowLeft className="size-5 ms-2" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">لدي حساب — دخول</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              بدون بطاقة ائتمانية · بدون خبرة تقنية · جاهز للعملاء عبر رابط وواتساب
            </p>

            {/* Hero visual — storefront mock */}
            <div className="mt-14 sm:mt-18 mx-auto max-w-4xl">
              <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/5 overflow-hidden">
                <div className="h-2 bg-gradient-to-l from-primary via-primary/70 to-saffron/80" aria-hidden="true" />
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-x-reverse divide-border/60 rtl:divide-x-reverse">
                  {[
                    { icon: Store, label: "المتجر", val: "منتجات وأقسام" },
                    { icon: ClipboardList, label: "الطلبات", val: "حالة لحظية" },
                    { icon: Truck, label: "التوصيل", val: "مناطق ورسوم" },
                    { icon: CreditCard, label: "الدفع", val: "مدار · ليبيانا · نقدي" },
                  ].map(({ icon: Icon, label, val }) => (
                    <div key={label} className="p-5 sm:p-7 flex flex-col items-center gap-2.5">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5.5" aria-hidden="true" />
                      </span>
                      <span className="text-sm font-semibold">{label}</span>
                      <span className="text-xs text-muted-foreground">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Features ===== */}
        <section id="features" className="border-t border-border/60 bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold">كل ما يحتاجه عملك للبيع، في مكان واحد</h2>
              <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
                سمارت أوردر ليس مجرد نموذج طلب — إنه نظام إدارة طلبات متكامل صُمم لطريقة عمل المتاجر والمطاعم في ليبيا.
              </p>
            </div>
            <div className="mt-12 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Store,
                  title: "متجر رقمي احترافي",
                  desc: "رابط خاص لمتجرك يعرض منتجاتك بصور وأسعار، مع أقسام وبحث وتصفح سريع — يعمل على أي هاتف.",
                },
                {
                  icon: ClipboardList,
                  title: "إدارة طلبات بمعايير حقيقية",
                  desc: "حالات موحدة من الاستلام حتى التسليم، سجل زمني لكل تغيير، بحث وفلترة، وتنبيهات لما يحتاج انتباهك الآن.",
                },
                {
                  icon: Truck,
                  title: "توصيل بمناطقك أنت",
                  desc: "حدد مناطق التوصيل ورسوم كل منطقة والحد الأدنى للطلب — تُحسب تلقائياً في الدفع دون أخطاء.",
                },
                {
                  icon: CreditCard,
                  title: "مدفوعات تناسب السوق",
                  desc: "الدفع عند التوصيل، نقداً، أو تحويل عبر مدار وليبيانا مع تأكيد يدوي — وبنية جاهزة لبوابات دفع مستقبلية.",
                },
                {
                  icon: MessageCircle,
                  title: "واتساب أولاً",
                  desc: "رسالة طلب منسقة تصل عبر واتساب بضغطة واحدة، وتتبع مباشر للعميل — بدون أي تكاملات معقدة.",
                },
                {
                  icon: BarChart3,
                  title: "أرقام تفهمها",
                  desc: "إيراد اليوم، متوسط قيمة الطلب، عملاء جدد، وأداء الأسبوع — على شاشة واحدة تحكي قصة يومك.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="group rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-black/5">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-orange/10 text-orange transition-colors group-hover:bg-orange group-hover:text-orange-foreground">
                    <Icon className="size-5.5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-heading font-semibold text-lg">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== How it works ===== */}
        <section id="how" className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold">من التسجيل إلى أول طلب في ثلاث خطوات</h2>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { n: "١", title: "أنشئ متجرك", desc: "اسم العمل، المدينة، رقم واتساب — رابط متجرك يجهز فوراً." },
              { n: "٢", title: "أضف منتجاتك", desc: "أقسام، صور، أسعار، أحجام وإضافات — من هاتفك مباشرة." },
              { n: "٣", title: "انشر واستقبل الطلبات", desc: "شارك الرابط على واتساب وفيسبوك وإنستغرام — الطلبات تصلك للوحة التحكم." },
            ].map((s) => (
              <li key={s.n} className="relative rounded-xl border border-border bg-card p-6 pt-8">
                <span className="absolute -top-4 start-6 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground font-heading font-bold shadow-lg shadow-primary/25">
                  {s.n}
                </span>
                <h3 className="font-heading font-semibold text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ===== Libya-first ===== */}
        <section id="local" className="border-y border-border/60 bg-primary/[0.04]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge variant="outline" className="mb-5 gap-2 border-saffron/50 bg-saffron/10 text-accent-foreground">
                <Globe className="size-3.5" aria-hidden="true" />
                عربي أولاً · مصمم لليبيا
              </Badge>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold leading-snug">
                ليس ترجمة لمنتج أجنبي — بل نظام بُني لطريقة عملنا هنا
              </h2>
              <ul className="mt-6 space-y-4">
                {[
                  "واجهة عربية كاملة بمنطق RTL أصيل، خطوط عربية سريعة التحميل",
                  "الأسعار بالدينار الليبي بدقة القرش، وأرقام هواتف ليبية معتمدة",
                  "مدفوعات مدار وليبيانا والتحويل اليدوي مع تأكيد واقعي بدون وهم",
                  "خفيف وسريع — يعمل جيداً حتى مع سرعات إنترنت متفاوتة",
                  "واتساب قناة أساسية: رسالة طلب منسقة جاهزة للإرسال بضغطة",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="text-foreground/90 leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl shadow-black/5">
              <div className="flex items-center gap-3 pb-4 border-b border-border/60">
                <Smartphone className="size-5 text-primary" aria-hidden="true" />
                <span className="font-semibold">تجربة العميل على الهاتف</span>
              </div>
              <div className="mt-5 space-y-3.5">
                {[
                  { name: "بيتزا خضراء", price: "45.000 د.ل", qty: "١×" },
                  { name: "برجر دجاج [كبير]", price: "23.500 د.ل", qty: "٢×" },
                  { name: "بطاطس + جبنة (إضافة)", price: "9.000 د.ل", qty: "١×" },
                ].map((i) => (
                  <div key={i.name} className="flex items-center justify-between text-sm">
                    <span className="text-foreground/90">{i.qty} {i.name}</span>
                    <span className="tabular font-medium">{i.price}</span>
                  </div>
                ))}
                <div className="pt-3.5 border-t border-border/60 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>التوصيل — تاجوراء</span>
                    <span className="tabular">8.000 د.ل</span>
                  </div>
                  <div className="flex justify-between font-bold text-base">
                    <span>الإجمالي</span>
                    <span className="tabular text-primary">109.000 د.ل</span>
                  </div>
                </div>
                <div className="pt-2 flex gap-2">
                  <span className="whatsapp-btn inline-flex items-center gap-2 rounded-lg px-4 h-10 text-sm font-semibold transition-colors">
                    <MessageCircle className="size-4" aria-hidden="true" />
                    إرسال الطلب عبر واتساب
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold">جاهز تستقبل طلبك الأول الليلة؟</h2>
          <p className="mt-4 text-lg text-muted-foreground">التسجيل يستغرق أقل من دقيقتين — ومتجرك يجهز في نفس الجلسة.</p>
          <Button asChild variant="flame" size="lg" className="mt-8">
            <Link href="/register">
              أنشئ متجرك الآن
              <ArrowLeft className="size-5 ms-2" aria-hidden="true" />
            </Link>
          </Button>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer className="border-t border-border/60 bg-muted/30 mt-auto">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={28} showText={false} />
            <span>سمارت أوردر — من عائلة سمارت لينك</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-foreground transition-colors">تسجيل الدخول</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">إنشاء متجر</Link>
            <span className="tabular">© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
