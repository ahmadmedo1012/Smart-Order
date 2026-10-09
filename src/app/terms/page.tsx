import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Reveal } from "@/components/ui/scroll-reveal";

export const metadata: Metadata = {
  /* r132 (F1c, A11 P1/P2): suffix stripped (root template appends it —
     was rendering "… | سمارت أوردر | سمارت أوردر"); canonical added. */
  title: "شروط الاستخدام",
  description: "شروط استخدام منصة سمارت أوردر — من عائلة الربط الذكي",
  alternates: { canonical: "/terms" },
};

const SECTIONS = [
  {
    title: "قبول الشروط",
    body: "باستخدامك منصة سمارت أوردر فإنك توافق على هذه الشروط كاملة. سمارت أوردر منصة تتيح لأصحاب المتاجر والمطاعم في ليبيا إنشاء متجر رقمي واستقبال الطلبات وإدارتها. إذا لم توافق على أي بند، يرجى التوقف عن استخدام المنصة.",
  },
  {
    title: "الحساب والمسؤولية",
    body: "أنت مسؤول عن سرية بيانات دخولك وعن كل نشاط يجري عبر حسابك. يجب أن تكون البيانات المسجلة (اسم العمل، رقم الهاتف، البريد) صحيحة ومحدثة. يحق لنا تعطيل حساب يثبت استخدامه لأغراض احتيالية أو مخالفة للقانون.",
  },
  {
    title: "الاشتراكات والمدفوعات",
    body: "الخطط المدفوعة تُفعّل بعد تأكيد الدفع عبر ليبيانا أو مدار أو التحويل البنكي من إدارة المنصة. المبالغ تدفع مقدماً للفترة المحددة، والإلغاء لا يشمل استرداد الفترة الجارية — يظل متجرك نشطاً حتى نهاية الفترة المدفوعة. الترقية تحتسب تناسبياً.",
  },
  {
    title: "حدود الاستخدام",
    body: "يخضع كل حساب لحدود الخطة المسجلة فيها (عدد المنتجات والطلبات الشهرية). عند بلوغ الحد لن يتوقف متجرك، وسننبّهك لخيار الترقية. يُمنح استخدام المنصة للأنشطة التجارية المشروعة فقط.",
  },
  {
    title: "الملكية الفكرية",
    body: "أنت تحتفظ بملكية محتواك (اسم متجرك، صور منتجاتك، أسعارك). تبقى منصة سمارت أوردر وواجهاتها وبرمجياتها ملكاً لشركة الربط الذكي، ولا يجوز إعادة إنتاجها أو بيعها.",
  },
  {
    title: "البيانات والخصوصية",
    body: "نلتزم بسياسة الخصوصية المنشورة منفصلة. بيانات عملائك تُستخدم لتشغيل الطلبات والتواصل فقط، ولا تُباع لأي طرف ثالث.",
  },
  {
    title: "تعديل الشروط",
    body: "قد نحدّث هذه الشروط عند تطوير المنصة. سيظهر أي تعديل جوهري هنا مع تاريخ التحديث، ويُعد استمرارك في الاستخدام بعد التعديل موافقة عليه.",
  },
  {
    title: "القانون المطبق",
    body: "تخضع هذه الشروط للقوانين الليبية النافذة، وأي نزاع يُحل ودياً أولاً ثم عبر الجهات القضائية المختصة في ليبيا.",
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">شروط الاستخدام</h1>
        <p className="mt-3 text-sm text-muted-foreground">آخر تحديث: سبتمبر ٢٠٢٦ — منصة سمارت أوردر، من عائلة الربط الذكي</p>
        <div className="mt-10 space-y-8">
          {/* r128-F8 (B23): legal = quiet — mono chapter labels per section,
              hairline rhythm separation, prose measure (62ch) at 15px/1.75,
              and the shared SSR-visible Reveal on each section block. */}
          {SECTIONS.map((s, i) => (
            <Reveal as="section" key={s.title} className="border-t border-border/60 pt-6">
              <p className="font-mono text-xs font-medium tracking-[0.08em] text-accent-foreground">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-2 font-heading text-lg font-bold text-foreground">{s.title}</h2>
              <p className="mt-3 max-w-[62ch] text-[15px] leading-7 text-muted-foreground">{s.body}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
          لأي استفسار حول هذه الشروط تواصل معنا عبر واتساب —{" "}
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "218910089975"}`}
            className="font-medium text-accent-foreground hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            الدعم الفني
          </a>
        </p>
      </main>
      <Footer />
    </div>
  );
}
