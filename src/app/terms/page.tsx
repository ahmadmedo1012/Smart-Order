import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "شروط الاستخدام | سمارت أوردر",
  description: "شروط استخدام منصة سمارت أوردر — من عائلة الربط الذكي",
};

const SECTIONS = [
  {
    title: "١. قبول الشروط",
    body: "باستخدامك منصة سمارت أوردر فإنك توافق على هذه الشروط كاملة. سمارت أوردر منصة تتيح لأصحاب المتاجر والمطاعم في ليبيا إنشاء متجر رقمي واستقبال الطلبات وإدارتها. إذا لم توافق على أي بند، يرجى التوقف عن استخدام المنصة.",
  },
  {
    title: "٢. الحساب والمسؤولية",
    body: "أنت مسؤول عن سرية بيانات دخولك وعن كل نشاط يجري عبر حسابك. يجب أن تكون البيانات المسجلة (اسم العمل، رقم الهاتف، البريد) صحيحة ومحدثة. يحق لنا تعطيل حساب يثبت استخدامه لأغراض احتيالية أو مخالفة للقانون.",
  },
  {
    title: "٣. الاشتراكات والمدفوعات",
    body: "الخطط المدفوعة تُفعّل بعد تأكيد الدفع عبر ليبيانا أو مدار أو التحويل البنكي من إدارة المنصة. المبالغ تدفع مقدماً للفترة المحددة، والإلغاء لا يشمل استرداد الفترة الجارية — يظل متجرك نشطاً حتى نهاية الفترة المدفوعة. الترقية تحتسب تناسبياً.",
  },
  {
    title: "٤. حدود الاستخدام",
    body: "يخضع كل حساب لحدود الخطة المسجلة فيها (عدد المنتجات والطلبات الشهرية). عند بلوغ الحد لن يتوقف متجرك، وسننبّهك لخيار الترقية. يُمنح استخدام المنصة للأنشطة التجارية المشروعة فقط.",
  },
  {
    title: "٥. الملكية الفكرية",
    body: "أنت تحتفظ بملكية محتواك (اسم متجرك، صور منتجاتك، أسعارك). تبقى منصة سمارت أوردر وواجهاتها وبرمجياتها ملكاً لشركة الربط الذكي، ولا يجوز إعادة إنتاجها أو بيعها.",
  },
  {
    title: "٦. البيانات والخصوصية",
    body: "نلتزم بسياسة الخصوصية المنشورة منفصلة. بيانات عملائك تُستخدم لتشغيل الطلبات والتواصل فقط، ولا تُباع لأي طرف ثالث.",
  },
  {
    title: "٧. تعديل الشروط",
    body: "قد نحدّث هذه الشروط عند تطوير المنصة. سيظهر أي تعديل جوهري هنا مع تاريخ التحديث، ويُعد استمرارك في الاستخدام بعد التعديل موافقة عليه.",
  },
  {
    title: "٨. القانون المطبق",
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
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="font-heading text-lg font-bold text-foreground">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
          لأي استفسار حول هذه الشروط تواصل معنا عبر واتساب —{" "}
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "218910089975"}`}
            className="font-medium text-primary hover:underline"
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
