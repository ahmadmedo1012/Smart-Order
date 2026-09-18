"use client";

import Link from "next/link";
import { m, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { AnimatedMessageCircle } from "@/components/ui/animated-icons";
import { BrandMark } from "@/components/shared/brand";

/** Canonical family support WhatsApp number (env-overridable). */
const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "218910089975";
const waLink = `https://wa.me/${SUPPORT_WHATSAPP}`;

interface FooterProps {
  className?: string;
}

const QUICK_LINKS = [
  { href: "/pricing", label: "الخطط" },
  { href: "/store/demo-store", label: "متجر تجريبي" },
  { href: "/login", label: "تسجيل الدخول" },
  { href: "/register", label: "أنشئ متجرك" },
];

/**
 * Footer — family twin (Smart Menu layout/Footer.tsx):
 * 4-column grid over border-t bg-card/30, WhatsApp icon chip, and the
 * full-width sunken bottom bar (bg-card/60) with terms/privacy.
 */
export function Footer({ className }: FooterProps) {
  const reduceMotion = useReducedMotion();
  return (
    <m.footer
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn("border-t border-border/40 bg-card/30 pt-12 sm:pt-16", className)}
    >
      <div className="max-w-[1220px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 mb-10 sm:mb-12">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4" aria-label="سمارت أوردر — الرئيسية">
              <BrandMark size={28} />
              <span className="font-heading font-bold text-sm text-foreground">Smart Order</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              منصة رقمية لإدارة متاجر ومطاعم ليبيا — متجر إلكتروني، طلبات، توصيل، ومدفوعات محلية من لوحة واحدة
            </p>
            <div className="flex gap-2">
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-card transition-[color,background-color,border-color,box-shadow] duration-200 hover:border-accent-foreground/40 hover:bg-accent-foreground/10 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-accent-foreground/60"
                aria-label="واتساب"
              >
                <AnimatedMessageCircle className="size-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">روابط سريعة</h3>
            <div className="space-y-2.5 text-sm text-muted-foreground">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block w-fit hover:text-accent-foreground hover:underline underline-offset-4 transition-colors focus-visible:ring-2 focus-visible:ring-accent-foreground/60 rounded-sm"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">الخدمات</h3>
            <div className="space-y-2.5 text-sm text-muted-foreground">
              {[
                "متجر إلكتروني",
                "إدارة الطلبات",
                "توصيل بمناطق ورسوم",
                "مدفوعات مدار وليبيانا",
                "تتبع مباشر للعميل",
              ].map((label) => (
                <span
                  key={label}
                  className="block w-fit cursor-default transition-colors hover:text-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">تواصل معنا</h3>
            <div className="space-y-2.5 text-sm text-muted-foreground">
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-fit hover:text-accent-foreground hover:underline underline-offset-4 transition-colors"
              >
                واتساب
              </a>
              <span className="block cursor-default transition-colors hover:text-foreground">
                دعم فني عبر واتساب
              </span>
              <span className="block cursor-default transition-colors hover:text-foreground tabular nums" dir="ltr">
                {SUPPORT_WHATSAPP}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Family: sunken full-width bottom bar (outside the 1220px container) */}
      <div className="border-t border-border/40 bg-card/60">
        <div className="max-w-[1220px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} الربط الذكي | Smart Order. جميع الحقوق محفوظة.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/terms" className="transition-colors hover:text-foreground">
              شروط الاستخدام
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              سياسة الخصوصية
            </Link>
          </div>
        </div>
      </div>
    </m.footer>
  );
}
