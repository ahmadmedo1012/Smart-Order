import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionContainer } from "@/components/ui/section-container";
import { SectionHeader } from "@/components/ui/section-header";
import { ScrollReveal, StaggeredReveal } from "@/components/ui/scroll-reveal";
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
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Family atmosphere: film-grain overlay (pointer-safe, both themes) */}
      <div className="grain-overlay" aria-hidden="true" />

      {/* ===== Header ===== */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md safe-top">
        <div className="mx-auto flex h-16 max-w-[1220px] items-center justify-between gap-4 px-4 sm:px-6">
          <BrandLogo />
          <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
            <a href="#features" className="rounded-md px-3 py-2 transition-colors hover:bg-foreground/5 hover:text-foreground">المزايا</a>
            <a href="#how" className="rounded-md px-3 py-2 transition-colors hover:bg-foreground/5 hover:text-foreground">كيف يعمل</a>
            <a href="#local" className="rounded-md px-3 py-2 transition-colors hover:bg-foreground/5 hover:text-foreground">صُمم لليبيا</a>
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
          {/* Family page glow — fixed backdrop ellipse at the top edge */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[42rem]"
            style={{ background: "var(--menu-glow-strong)" }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-52 -end-32 size-[36rem] rounded-full bg-saffron/10 blur-3xl" />
          <ScrollReveal y={24} duration={0.5} className="relative mx-auto max-w-[1220px] px-4 pb-20 pt-16 text-center sm:px-6 sm:pb-28 sm:pt-24">
            <Badge variant="outline" className="mb-6 gap-2 border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary">
              <Zap className="size-3.5" aria-hidden="true" />
              منصة الطلبات الرقمية للأعمال الليبية
            </Badge>
            <h1 className="mx-auto max-w-3xl font-heading text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
              متجرك الرقمي الجاهز
              <span className="text-gradient-orange"> لاستقبال الطلبات</span> في دقائق
            </h1>
            <p className="mx-auto mt-6 max-w-[48ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
              قائمة منتجات أنيقة، سلة وطلب بضغطة واحدة، توصيل بمناطق ورسوم تحددها أنت،
              ومدفوعات مدار وليبيانا ونقداً — كل ذلك من لوحة تحكم واحدة تعمل على هاتفك.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
            <div className="mx-auto mt-14 max-w-4xl sm:mt-18">
              <div className="card-premium overflow-hidden rounded-2xl border border-border shadow-xl">
                <div className="h-2 bg-gradient-to-l from-primary via-primary/70 to-saffron/80" aria-hidden="true" />
                <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border/60 sm:grid-cols-4 rtl:divide-x-reverse">
                  {[
                    { icon: Store, label: "المتجر", val: "منتجات وأقسام" },
                    { icon: ClipboardList, label: "الطلبات", val: "حالة لحظية" },
                    { icon: Truck, label: "التوصيل", val: "مناطق ورسوم" },
                    { icon: CreditCard, label: "الدفع", val: "مدار · ليبيانا · نقدي" },
                  ].map(({ icon: Icon, label, val }) => (
                    <div key={label} className="flex flex-col items-center gap-2.5 p-5 sm:p-7">
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
          </ScrollReveal>
        </section>

        {/* ===== Features ===== */}
        <SectionContainer id="features" tone="alt">
          <SectionHeader
            eyebrow="المزايا"
            title="كل ما يحتاجه عملك للبيع، في مكان واحد"
            subtitle="سمارت أوردر ليس مجرد نموذج طلب — إنه نظام إدارة طلبات متكامل صُمم لطريقة عمل المتاجر والمطاعم في ليبيا."
          />
          <StaggeredReveal className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3" stagger={70}>
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
              <div key={title} className="card-premium group rounded-xl border border-border p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-orange/10 text-orange transition-colors group-hover:bg-orange group-hover:text-orange-foreground">
                  <Icon className="size-5.5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-heading text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </StaggeredReveal>
        </SectionContainer>

        {/* ===== How it works ===== */}
        <SectionContainer id="how">
          <SectionHeader eyebrow="كيف يعمل" title="من التسجيل إلى أول طلب في ثلاث خطوات" />
          <StaggeredReveal className="grid gap-6 md:grid-cols-3" stagger={90}>
            {[
              { n: "١", title: "أنشئ متجرك", desc: "اسم العمل، المدينة، رقم واتساب — رابط متجرك يجهز فوراً." },
              { n: "٢", title: "أضف منتجاتك", desc: "أقسام، صور، أسعار، أحجام وإضافات — من هاتفك مباشرة." },
              { n: "٣", title: "انشر واستقبل الطلبات", desc: "شارك الرابط على واتساب وفيسبوك وإنستغرام — الطلبات تصلك للوحة التحكم." },
            ].map((s) => (
              <li key={s.n} className="card-premium relative list-none rounded-xl border border-border p-6 pt-8">
                <span className="absolute -top-4 start-6 flex size-9 items-center justify-center rounded-full bg-primary font-heading font-bold text-primary-foreground shadow-lg">
                  {s.n}
                </span>
                <h3 className="font-heading text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </StaggeredReveal>
        </SectionContainer>

        {/* ===== Libya-first ===== */}
        <SectionContainer id="local" className="border-y border-border/40 bg-primary/[0.04]">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <ScrollReveal y={20} duration={0.55}>
              <Badge variant="outline" className="mb-5 gap-2 border-saffron/50 bg-saffron/10 text-accent-foreground">
                <Globe className="size-3.5" aria-hidden="true" />
                عربي أولاً · مصمم لليبيا
              </Badge>
              <h2 className="font-heading text-3xl font-bold leading-snug sm:text-4xl">
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
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <span className="leading-relaxed text-foreground/90">{point}</span>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
            <ScrollReveal y={20} duration={0.55} delay={120}>
              <div className="card-premium rounded-2xl border border-border p-6 shadow-xl sm:p-8">
                <div className="flex items-center gap-3 border-b border-border/60 pb-4">
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
                  <div className="space-y-2 border-t border-border/60 pt-3.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>التوصيل — تاجوراء</span>
                      <span className="tabular">8.000 د.ل</span>
                    </div>
                    <div className="flex justify-between text-base font-bold">
                      <span>الإجمالي</span>
                      <span className="tabular text-primary">109.000 د.ل</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <span className="whatsapp-btn inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors">
                      <MessageCircle className="size-4" aria-hidden="true" />
                      إرسال الطلب عبر واتساب
                    </span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </SectionContainer>

        {/* ===== CTA ===== */}
        <SectionContainer className="text-center">
          <ScrollReveal y={20}>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">جاهز تستقبل طلبك الأول الليلة؟</h2>
            <p className="mx-auto mt-4 max-w-[48ch] text-lg text-muted-foreground">
              التسجيل يستغرق أقل من دقيقتين — ومتجرك يجهز في نفس الجلسة.
            </p>
            <Button asChild variant="flame" size="lg" className="mt-8">
              <Link href="/register">
                أنشئ متجرك الآن
                <ArrowLeft className="size-5 ms-2" aria-hidden="true" />
              </Link>
            </Button>
          </ScrollReveal>
        </SectionContainer>
      </main>

      {/* ===== Footer ===== */}
      <footer className="mt-auto border-t border-border/60 bg-muted/30">
        <div className="mx-auto flex max-w-[1220px] flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={28} showText={false} />
            <span>سمارت أوردر — من عائلة سمارت لينك</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="transition-colors hover:text-foreground">تسجيل الدخول</Link>
            <Link href="/register" className="transition-colors hover:text-foreground">إنشاء متجر</Link>
            <span className="tabular">© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
