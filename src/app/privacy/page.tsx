import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Reveal } from "@/components/ui/scroll-reveal";

export const metadata: Metadata = {
  /* r132 (F1c, A11 P1/P2): suffix stripped (root template appends it —
     was rendering "… | سمارت أوردر | سمارت أوردر"); canonical added. */
  title: "سياسة الخصوصية",
  description: "كيف تجمع منصة سمارت أوردر بياناتك وتحميها — من عائلة الربط الذكي",
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  {
    title: "البيانات التي نجمعها",
    body: "نجمع فقط ما يلزم لتشغيل الخدمة: بيانات حسابك (الاسم، البريد، الهاتف)، بيانات متجرك (الاسم، المدينة، رقم واتساب، المنتجات والأسعار)، وبيانات طلبات عملائك (الاسم، الهاتف، العنوان، محتوى الطلب). لا نجمع أي بيانات أكثر من ذلك ولا نربطها بأطراف ثالثة لتحليل سلوكي.",
  },
  {
    title: "كيف نستخدم البيانات",
    body: "تُستخدم البيانات حصراً لتشغيل متجرك: عرض المنتجات، معالجة الطلبات، إرسال رسائل واتساب المنسقة، تتبع الطلبات للعملاء، وإشعاراتك التشغيلية كصاحب متجر. قد نستخدم بريدك لإرسال إشعارات خدمية مهمة فقط (مثل انتهاء الاشتراك)، لا للرسائل التسويقية.",
  },
  {
    title: "أرقام التحويل والمدفوعات",
    body: "عند الدفع عبر ليبيانا أو مدار نطلب منك رقم هاتفك لنتحقق من استلام التحويل — يُعرض لمسؤول المنصة لأغراض التحقق فقط ثم يُحفظ بسجل الدفع. لا نطلب أبداً كلمة مرور محفظتك ولا نخزن بيانات بطاقات.",
  },
  {
    title: "صور التحويل",
    body: "صورة إيصال التحويل التي ترفعها عند الدفع البنكي تُستخدم للتحقق من الدفع من إدارة المنصة، وتبقى مرفقة بسجل اشتراكك، ويمكن طلب حذفها بعد التحقق.",
  },
  {
    title: "مشاركة البيانات",
    body: "لا نبيع بياناتك ولا نشاركها مع أي طرف ثالث لأغراض تجارية. تُشارك البيانات فقط عند طلب قضائي رسمي من جهات مختصة، أو بالحد الأدنى اللازم لتشغيل خدمات البنية (مثل مزود الاستضافة وقاعدة البيانات) وفق عقود سرية.",
  },
  {
    title: "الاحتفاظ والحذف",
    body: "نحتفظ ببيانات حسابك طوال فترة نشاط متجرك. عند طلب حذف الحساب نحذف بياناتك الشخصية خلال 30 يوماً، مع الاحتفاظ بسجلات الطلبات المالية للمدة التي يوجبها القانون الضريبي الليبي.",
  },
  {
    title: "حقوقك",
    body: "يحق لك طلب نسخة من بياناتك، تصحيحها، أو حذف حسابك بالكامل في أي وقت عبر الدعم الفني على واتساب. سنستجيب خلال مدة معقولة لا تتجاوز 14 يوماً.",
  },
  {
    title: "أمن البيانات",
    body: "كلمات المرور تُخزن مشفرة (PBKDF2-SHA512) ولا يمكن لأحد في المنصة قراءتها. الاتصال بالمنصة مشفر عبر HTTPS، وقواعد البيانات معزولة عن الإنترنت العام وتُنسخ احتياطياً بانتظام.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6">
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">سياسة الخصوصية</h1>
        <p className="mt-3 text-sm text-muted-foreground">آخر تحديث: سبتمبر 2026 — منصة سمارت أوردر، من عائلة الربط الذكي</p>
        {/* r128-F8 (B23): legal = quiet — mono chapter labels per section,
            hairline rhythm separation, prose measure (62ch) at 15px/1.75,
            and the shared SSR-visible Reveal on each section block. */}
        <div className="mt-10 space-y-8">
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
      </main>
      <Footer />
    </div>
  );
}
