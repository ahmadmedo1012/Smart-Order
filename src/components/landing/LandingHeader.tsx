"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown, ArrowLeft, Route, BarChart3, Banknote, ShoppingBag, PackageSearch } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";

/* r128 Stage B (F4b) — the landing header, converted from the product
   MainNav to the canonical Madarek chrome (PORT-KIT §4, smart-link
   LandingHeader anatomy):
   · persistent sticky header — solid ink-2 @ 92% once scrolled, hairline
     edge, NO glass blur anywhere;
   · `.scrolled` + the top progress ribbon's `--p` are written
     imperatively (one passive scroll listener → one rAF → DOM writes);
     React NEVER re-renders for scrolling (zero setState);
   · scroll-spy (r128 R2): IntersectionObserver thresholds [0,.35,.5,.65,1],
     rootMargin -20% 0px -40% 0px, candidates ratio > .35, winner by most
     viewport coverage → header.dataset.activeSection (the landing.css
     rules read it there) — ids in lockstep with the r142 «الخط»
     narrative: stations/store/dashboard/payments;
   · megamenu with tone-coded icon wells (Escape + onBlur close, focus
     return to the trigger);
   · burger + mobile drawer ≤1024px;
   · P9-3-d (E3): the family ThemeToggle rides the rail in its own
     .landing-header-tools slot AFTER the burger — end-of-rail at every
     breakpoint, so it survives the ≤1080px .landing-header-cta hide
     (the same placement law Smart-Menu P9-3-b landed) and stays visible
     at 1440px AND 390px. RTL: the links' margin-inline-start:auto keeps
     pushing the rail tail (burger+toggle) to the inline-end edge.
   The product MainNav keeps serving every non-landing surface. */

const SPY_SECTIONS = "#stations, #store, #dashboard, #payments";

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [megamenuOpen, setMegamenuOpen] = useState(false);
  const megamenuTriggerRef = useRef<HTMLButtonElement>(null);
  /* Scroll chrome lives on refs and is written imperatively below — a React
     re-render per scroll event was the canonical round-3 regression. */
  const headerRef = useRef<HTMLElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  /* Scroll-driven chrome with ZERO setState: coalesced to one rAF per frame
     (pending-flag pattern, mirrors useSectionProgress) and written straight
     to the DOM — the .scrolled class on the header and the --p var on the
     top ribbon. */
  useEffect(() => {
    const header = headerRef.current;
    const bar = progressBarRef.current;

    let raf = 0;
    const apply = () => {
      raf = 0;
      const y = window.scrollY;
      if (header) header.classList.toggle("scrolled", y > 6);
      if (bar) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, y / max) : 0;
        bar.style.setProperty("--p", p.toFixed(4));
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /* Scroll-spy — active section highlight in the nav. Zero setState: written
     to a data attribute on the header via imperative DOM. */
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const sections = Array.from(document.querySelectorAll<HTMLElement>(SPY_SECTIONS));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        /* P16-4c (the deferred P15 P2, closed): the r128 ratio>0.35
           filter was structurally unreachable — the live chapters are
           1179-1682px tall while the -20%/-40% root band is ~360px, so
           intersectionRatio could never exceed ~0.31 and
           data-active-section was NEVER set (live-verified in the P15
           audit; the CSS half was orphaned on retired ids at the same
           time). Scale-independent coverage instead (the Smart-Link
           twin fix): the share of the ROOT BAND the section covers —
           a 1400px chapter crossing the 360px band scores 1.0. */
        const visible: Array<{ id: string; coverage: number }> = [];
        for (const entry of entries) {
          const bandH = entry.rootBounds?.height ?? 0;
          const coverH = entry.intersectionRect.height;
          const coverage = bandH > 0 ? coverH / bandH : 0;
          if (coverage > 0.1) {
            visible.push({ id: entry.target.id, coverage });
          }
        }
        /* Pick the section with the most band coverage; tie-break by order. */
        visible.sort((a, b) => b.coverage - a.coverage);
        if (visible.length > 0) {
          header.dataset.activeSection = visible[0]!.id;
        } else {
          delete header.dataset.activeSection;
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "-20% 0px -40% 0px" },
    );

    for (const s of sections) observer.observe(s);

    return () => observer.disconnect();
  }, []);

  /* Megamenu: Escape closes with focus return; blur outside the group closes. */
  const closeMegamenu = () => setMegamenuOpen(false);

  return (
    <>
      {/* Top scroll-progress bar — driven imperatively via --p */}
      <div className="landing-progress" aria-hidden="true">
        <div className="landing-progress-bar" ref={progressBarRef} style={{ ["--p" as string]: 0 }} />
      </div>

      {/* Header — the .scrolled state class is toggled imperatively */}
      <header className="landing-header" ref={headerRef}>
        <div className="landing-nav">
          {/* P26-D follow-up (Label-in-Name root cause): the aria-label
              is GONE — name-from-content, the Smart-Link main-nav.tsx:184
              law. Any explicit label must repeat the full visible lockup
              (the aria-hidden S counts as visible text for WCAG 2.5.3 and
              glues: "SSmart Order"), which the old transliterated label
              dropped entirely. Name-from-content is compliant by
              construction and self-maintaining; «/» reads from context. */}
          <Link href="/" className="landing-brand">
            <span className="landing-brand-mark" aria-hidden="true">S</span>
            <span className="landing-brand-text">
              <span className="landing-brand-name">Smart Order</span>
              <span className="landing-brand-sub">منصّة الطلبات الرقمية</span>
            </span>
          </Link>

          <nav className="landing-nav-links" aria-label="أقسام الرحلة">
            <div
              className={`landing-nav-group${megamenuOpen ? " open" : ""}`}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setMegamenuOpen(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && megamenuOpen) {
                  setMegamenuOpen(false);
                  megamenuTriggerRef.current?.focus();
                }
              }}
            >
              <button
                type="button"
                className="landing-nav-link"
                aria-haspopup="true"
                aria-expanded={megamenuOpen}
                ref={megamenuTriggerRef}
                onClick={() => setMegamenuOpen((v) => !v)}
              >
                المنصّة
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              <div className="landing-megamenu" onClick={closeMegamenu}>
                <a href="#stations" className="landing-megamenu-item">
                  <span className="ln-menu-ico gold" aria-hidden="true"><Route size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    {/* P13-2d (T2): «الخمس» — the journey map has 5 stops (STOPS 001–005); was the lone «الست» mismatch vs the chapter lede «خمس محطات». */}
                    <span className="landing-megamenu-item-title">المحطات الخمس</span>
                    <span className="landing-megamenu-item-desc">من «جديد» إلى باب العميل</span>
                  </span>
                </a>
                <a href="#store" className="landing-megamenu-item">
                  <span className="ln-menu-ico azure" aria-hidden="true"><ShoppingBag size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    <span className="landing-megamenu-item-title">متجر يعمل فوراً</span>
                    <span className="landing-megamenu-item-desc">واجهة حقيقية وسلة وطلب</span>
                  </span>
                </a>
                <a href="#dashboard" className="landing-megamenu-item">
                  <span className="ln-menu-ico mist" aria-hidden="true"><BarChart3 size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    <span className="landing-megamenu-item-title">لوحة التاجر</span>
                    <span className="landing-megamenu-item-desc">آلة الحالات الحقيقية حيّة</span>
                  </span>
                </a>
                <a href="#payments" className="landing-megamenu-item">
                  <span className="ln-menu-ico gold" aria-hidden="true"><Banknote size={20} /></span>
                  <span className="landing-megamenu-item-body">
                    <span className="landing-megamenu-item-title">محطات الدفع</span>
                    <span className="landing-megamenu-item-desc">طرق ليبيا الست الحقيقية</span>
                  </span>
                </a>
              </div>
            </div>
            <a href="#stations" className="landing-nav-link">المحطات</a>
            <a href="#store" className="landing-nav-link">المتجر</a>
            <a href="#dashboard" className="landing-nav-link">اللوحة</a>
            <a href="#payments" className="landing-nav-link">الدفع</a>
            {/* W2-D1 (P21-D's one open gap): the tracking DOOR — the nav's
                only non-anchor ROUTE link. A customer with a receipt in
                hand needs the entry point (publicToken is unguessable);
                /track takes order number + the phone used at order time. */}
            <Link href="/track" className="landing-nav-link">
              تتبع طلبك
              <PackageSearch size={13} aria-hidden="true" />
            </Link>
          </nav>

          <div className="landing-header-cta">
            <Link href="/login" className="ln-btn-ghost">تسجيل الدخول</Link>
            {/* P31-D (CTA de-competition): the register affordance rode
                the filled gold pill — a SECOND primary fighting the
                hero's own ابدأ مجاناً in the first viewport. Same href,
                same label, now the quiet .ln-btn-text rung (accent ink
                + arrow + underline on hover): exactly ONE filled
                primary per viewport, the hero keeps it. */}
            <Link href="/register" className="ln-btn-text">
              أنشئ متجرك
              <ArrowLeft size={14} aria-hidden="true" />
            </Link>
          </div>

          <button
            type="button"
            className="landing-burger"
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>

          {/* P9-3-d (E3) — the theme toggle: family twin (size-11 chip, spring
              icon swap, Arabic aria labels «الوضع الليلي/النهاري»), focus rides
              the global :focus-visible contract. Its own slot so the ≤1080px
              CTA hide can never swallow it. */}
          <div className="landing-header-tools">
            <ThemeToggle />
          </div>
        </div>

        {menuOpen && (
          <nav className="landing-mobile-menu" aria-label="قائمة الجوال" onClick={() => setMenuOpen(false)}>
            <a href="#stations" className="ln-btn-ghost">المحطات الخمس</a>
            <a href="#store" className="ln-btn-ghost">متجر يعمل فوراً</a>
            <a href="#dashboard" className="ln-btn-ghost">لوحة التاجر</a>
            <a href="#payments" className="ln-btn-ghost">محطات الدفع</a>
            <Link href="/track" className="ln-btn-ghost">تتبع طلبك</Link>
            <Link href="/login" className="ln-btn-ghost">تسجيل الدخول</Link>
            <Link href="/register" className="ln-btn-gold">
              أنشئ متجرك
              <ArrowLeft size={16} aria-hidden="true" />
            </Link>
          </nav>
        )}
      </header>
    </>
  );
}
