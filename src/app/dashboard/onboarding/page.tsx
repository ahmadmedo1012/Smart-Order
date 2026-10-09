"use client";

// Onboarding wizard — get a non-technical owner to a published storefront fast.

import * as React from "react";
import { api } from "@/lib/client";
import { useBusiness } from "@/components/dashboard/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { OnboardingSkeleton } from "@/components/dashboard/skeletons";
import { formatLyd } from "@/lib/money";
import { toast } from "sonner";
import {
  Check,
  Plus,
  Trash2,
  Truck,
  Rocket,
  ExternalLink,
  Store,
  Package,
  CreditCard,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
}
interface Zone {
  id: string;
  name: string;
  fee: number;
  minOrder: number;
  isActive: boolean;
}

export default function OnboardingPage() {
  const { businessId, business } = useBusiness();
  const [loading, setLoading] = React.useState(true);
  const [publishing, setPublishing] = React.useState(false);

  // step data
  const [bizName, setBizName] = React.useState(business?.name ?? "");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [city, setCity] = React.useState("طرابلس");
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [newCat, setNewCat] = React.useState("");
  const [zones, setZones] = React.useState<Zone[]>([]);
  const [zoneName, setZoneName] = React.useState("");
  const [zoneFee, setZoneFee] = React.useState("5");
  const [hasCod, setHasCod] = React.useState(false);
  const [slug, setSlug] = React.useState(business?.slug ?? "");
  const [published, setPublished] = React.useState(
    business?.isPublished ?? false,
  );

  React.useEffect(() => {
    if (!businessId) return;
    Promise.all([
      api.get<{
        business: {
          name: string;
          slug: string;
          whatsappNumber: string | null;
          city: string | null;
          isPublished: boolean;
        };
      }>(`/api/business?businessId=${businessId}`),
      api.get<{ categories: Category[] }>(
        `/api/categories?businessId=${businessId}`,
      ),
      api.get<{ zones: Zone[] }>(
        `/api/delivery-zones?businessId=${businessId}`,
      ),
      api.get<{ methods: Array<{ type: string; isActive: boolean }> }>(
        `/api/payment-methods?businessId=${businessId}`,
      ),
    ])
      .then(([b, c, z, p]) => {
        setBizName(b.data.business.name);
        setSlug(b.data.business.slug);
        setWhatsapp(b.data.business.whatsappNumber ?? "");
        setCity(b.data.business.city ?? "طرابلس");
        setPublished(b.data.business.isPublished);
        setCategories(c.data.categories);
        setZones(z.data.zones);
        setHasCod(p.data.methods.some((m) => m.type === "COD" && m.isActive));
      })
      .catch(() => toast.error("تعذّر تحميل بيانات الإعداد"))
      .finally(() => setLoading(false));
  }, [businessId]);

  async function addCategory() {
    if (!newCat.trim()) return;
    try {
      const r = await api.post<{ category: Category }>("/api/categories", {
        businessId,
        name: newCat.trim(),
      });
      setCategories((c) => [...c, r.data.category]);
      setNewCat("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّرت الإضافة");
    }
  }

  async function addZone() {
    if (!zoneName.trim()) return;
    try {
      const r = await api.post<{ zone: Zone }>("/api/delivery-zones", {
        businessId,
        name: zoneName.trim(),
        fee: zoneFee || "0",
      });
      setZones((z) => [...z, r.data.zone]);
      setZoneName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّرت الإضافة");
    }
  }

  async function saveBasics() {
    try {
      await api.patch("/api/business", {
        businessId,
        name: bizName.trim(),
        whatsappNumber: whatsapp.trim() || null,
        city,
      });
      toast.success("تم الحفظ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الحفظ");
    }
  }

  async function publish() {
    setPublishing(true);
    try {
      await saveBasics();
      const r = await api.patch<{ business: { isPublished: boolean } }>(
        "/api/business",
        { businessId, isPublished: true },
      );
      if (
        (r.data as { published?: boolean; reason?: string }).published === false
      ) {
        toast.error(
          (r.data as { reason?: string }).reason ??
            "أكمل الخطوات الأساسية أولاً",
        );
      } else {
        setPublished(true);
        toast.success("تم نشر متجرك! شارك الرابط مع عملائك");
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "تعذّر النشر — أكمل الخطوات أولاً",
      );
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    /* r131 (F3, A5 P2-7): shape-matched checklist skeleton. */
    return <OnboardingSkeleton />;
  }

  const Step = ({
    n,
    icon: Icon,
    title,
    desc,
    done,
    children,
  }: {
    n: number;
    icon: React.ElementType;
    title: string;
    desc: string;
    done: boolean;
    children?: React.ReactNode;
  }) => (
    <section
      className={`rounded-xl border p-5 transition-colors ${done ? "border-success/40 bg-success/[0.04]" : "border-border bg-card"}`}
    >
      <div className="flex items-start gap-4">
        <span
          className={`flex size-10 items-center justify-center rounded-xl shrink-0 ${done ? "bg-success/15 text-success-ink" : "bg-primary/10 text-accent-foreground"}`}
        >
          {done ? (
            <Check className="size-5" aria-hidden="true" />
          ) : (
            <Icon className="size-5" aria-hidden="true" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              خطوة {n}
            </span>
            {done && (
              <span className="text-xs text-success-ink font-medium">
                مكتملة
              </span>
            )}
          </div>
          <h2 className="font-heading font-semibold mt-0.5">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{desc}</p>
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </section>
  );

  /* r131 (F3, A5 P3-4): honest progress — an Arabic-numerals summary
     + a meter strip (StepIndicator grammar: accent fill on the
     completed prefix) + a skip affordance for owners who want to
     browse the dashboard first. */
  const stepStates = [
    !!whatsapp,
    categories.length > 0,
    zones.length > 0,
    hasCod,
    published,
  ];
  const doneCount = stepStates.filter(Boolean).length;
  const totalSteps = stepStates.length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <PageHeader
        title="إعداد متجرك"
        subtitle={
          published
            ? "متجرك منشور — يمكنك تحسين هذه الإعدادات في أي وقت"
            : "أكمل الخطوات التالية لنشر متجرك للعملاء"
        }
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">تخطي مؤقتاً</Link>
          </Button>
        }
      />

      {/* Progress meter */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">
            <span className="tabular-nums">{doneCount}</span> من{" "}
            <span className="tabular-nums">{totalSteps}</span> خطوات مكتملة
          </p>
          {doneCount === totalSteps ? (
            <span className="inline-flex items-center rounded-full bg-(--c-mint-bg) px-2.5 py-1 text-[11px] font-semibold text-(--c-mint-deep)">
              اكتمل الإعداد
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {published ? "منشور وجاهز" : "تابع لتصل للنشر"}
            </span>
          )}
        </div>
        <div
          className="mt-3 flex gap-1.5"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalSteps}
          aria-valuenow={doneCount}
          aria-label={`تقدم الإعداد: ${doneCount} من ${totalSteps}`}
        >
          {stepStates.map((done, i) => (
            <span
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors duration-(--t-base) ${
                done ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      <Step
        n={1}
        icon={Store}
        title="بيانات العمل"
        desc="الاسم والرقم الذي يستقبل طلبات واتساب"
        done={!!whatsapp}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            value={bizName}
            onChange={(e) => setBizName(e.target.value)}
            placeholder="اسم العمل"
            aria-label="اسم العمل"
          />
          <Input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="واتساب: 0912345678"
            inputMode="tel"
            dir="ltr"
            aria-label="رقم واتساب"
            className="text-start tabular-nums"
          />
          <div className="sm:col-span-2 justify-self-start">
            <Button variant="outline" size="sm" onClick={saveBasics}>
              حفظ البيانات
            </Button>
          </div>
        </div>
      </Step>

      <Step
        n={2}
        icon={Package}
        title="أول قسم ومنتج"
        desc="أضف قسماً (مثال: مشروبات) ثم منتجاً من صفحة المنتجات"
        done={categories.length > 0}
      >
        <div className="flex gap-2">
          <Input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            placeholder="اسم القسم الجديد"
            aria-label="اسم القسم"
            className="flex-1"
          />
          <Button onClick={addCategory} size="sm" className="shrink-0">
            <Plus className="size-4" aria-hidden="true" />
            إضافة
          </Button>
        </div>
        {categories.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 h-8 text-xs font-medium"
              >
                {c.name}
                <button
                  onClick={async () => {
                    try {
                      await api.delete(
                        `/api/categories/${c.id}?businessId=${businessId}`,
                      );
                      setCategories((cs) => cs.filter((x) => x.id !== c.id));
                    } catch (e) {
                      toast.error(
                        e instanceof Error ? e.message : "تعذّر الحذف",
                      );
                    }
                  }}
                  aria-label={`حذف ${c.name}`}
                  className="text-muted-foreground hover:text-destructive-ink"
                >
                  <Trash2 className="size-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          بعد إضافة قسم، أنشئ منتجك الأول من{" "}
          <a
            href="/dashboard/products"
            className="text-accent-foreground font-medium hover:underline"
          >
            صفحة المنتجات
          </a>
          .
        </p>
      </Step>

      <Step
        n={3}
        icon={Truck}
        title="مناطق التوصيل"
        desc="أضف منطقة واحدة على الأقل لتفعيل خيار التوصيل (اختياري إن كان الاستلام فقط)"
        done={zones.length > 0}
      >
        <div className="flex gap-2">
          <Input
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addZone()}
            placeholder="مثال: تاجوراء"
            aria-label="اسم المنطقة"
            className="flex-1"
          />
          <Input
            value={zoneFee}
            onChange={(e) => setZoneFee(e.target.value)}
            placeholder="5"
            inputMode="decimal"
            dir="ltr"
            aria-label="رسوم التوصيل"
            className="w-24 text-start tabular-nums"
          />
          <Button onClick={addZone} size="sm" className="shrink-0">
            <Plus className="size-4" aria-hidden="true" />
            إضافة
          </Button>
        </div>
        {zones.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {zones.map((z) => (
              <li
                key={z.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 h-8 text-xs font-medium"
              >
                {z.name} —{" "}
                <span className="tabular-nums">{formatLyd(z.fee)}</span>
                <button
                  onClick={async () => {
                    try {
                      await api.delete(
                        `/api/delivery-zones/${z.id}?businessId=${businessId}`,
                      );
                      setZones((zs) => zs.filter((x) => x.id !== z.id));
                    } catch {
                      toast.error("تعذّر الحذف");
                    }
                  }}
                  aria-label={`حذف ${z.name}`}
                  className="text-muted-foreground hover:text-destructive-ink"
                >
                  <Trash2 className="size-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Step>

      <Step
        n={4}
        icon={CreditCard}
        title="طرق الدفع"
        desc="الدفع عند التوصيل مفعّل تلقائياً — أضف تحويلات مدار/ليبيانا من صفحة المدفوعات"
        done={hasCod}
      >
        <p className="text-xs text-muted-foreground">
          لإضافة المزيد:{" "}
          <a
            href="/dashboard/payments"
            className="text-accent-foreground font-medium hover:underline"
          >
            صفحة المدفوعات
          </a>
        </p>
      </Step>

      <Step
        n={5}
        icon={Rocket}
        title="انشر متجرك"
        desc="سيصبح رابط متجرك متاحاً للعملاء"
        done={published}
      >
        {!published ? (
          <Button
            onClick={publish}
            disabled={publishing}
            loading={publishing}
            size="lg"
          >
            <Rocket className="size-5" aria-hidden="true" />
            نشر المتجر الآن
          </Button>
        ) : (
          <Button asChild size="lg">
            <a
              href={`/store/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-5" aria-hidden="true" />
              افتح متجرك المنشور
            </a>
          </Button>
        )}
        {slug && (
          <p className="mt-2 text-xs text-muted-foreground" dir="ltr">
            /store/{slug}
          </p>
        )}
      </Step>
    </div>
  );
}
