---
name: Smart Order
description: Digital ordering platform for Libyan food businesses — Smart family member
colors:
  background-dark: "#010000"
  background-light: "oklch(0.985 0.004 70)"
  foreground-dark: "#ebe7e2"
  card-dark: "#070503"
  card-light: "oklch(1 0.002 70)"
  primary: "#bc4700"
  primary-light: "oklch(0.4 0.19 45)"
  primary-foreground: "#f8f8f8"
  accent-foreground: "#df5a00"
  ember: "#863800"
  saffron: "#f0a646"
  espresso: "#1a130b"
  border-dark: "#211c18"
  muted-foreground-dark: "#8c857d"
  success: "#23a136"
  warning: "#ce9200"
  info: "#348dcf"
  destructive: "#e62b34"
  whatsapp: "#25D366"
typography:
  display:
    fontFamily: "Readex Pro, Cairo, Noto Sans Arabic, system-ui, sans-serif"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "Readex Pro, Cairo, Noto Sans Arabic, system-ui, sans-serif"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Cairo, Noto Sans Arabic, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Cairo, Noto Sans Arabic, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    letterSpacing: "0.18em"
  naskh:
    fontFamily: "Noto Naskh Arabic, Cairo, system-ui, sans-serif"
    fontWeight: 400
rounded:
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "28px"
spacing:
  base: "4px"
  component: "16px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    height: "48px"
    rounded: "{rounded.lg}"
    fontWeight: 700
  button-flame:
    backgroundColor: "linear-gradient(135deg, var(--c-ember), var(--c-saffron) 50%, var(--c-ember))"
    textColor: "{colors.espresso}"
    height: "48px"
    rounded: "{rounded.lg}"
  button-sm:
    height: "40px"
  button-lg:
    height: "56px"
  badge:
    height: "20px"
    rounded: "999px"
    fontSize: "0.75rem"
  badge-gold:
    backgroundColor: "color-mix(in oklab, {colors.primary} 15%, transparent)"
    textColor: "{colors.primary}"
  empty-state-icon:
    size: "64px"
    rounded: "16px"
    backgroundColor: "color-mix(in oklab, {colors.primary} 8%, transparent)"
  input:
    height: "48px"
    rounded: "{rounded.lg}"
---

# Design System: Smart Order

## Overview

**Creative North Star: "The Warm Kitchen Counter"**

Smart Order is the third product of the Smart family and renders as a
sibling, not a stranger: the same flame-orange over warm near-black that
Smart Menu and SmartBot use, the same Arabic-first Cairo/Readex Pro voice,
the same soft-tint status language. The identity is deliberately warm and
kitchen-like — ember, saffron, espresso, ash — because the product sells
food, not software. Dark is the default theme (the family default); light
is a warm-paper override.

**Key Characteristics:**
- Flame `#bc4700` as the single primary; WhatsApp green reserved for
  WhatsApp actions only.
- Dark-first warm near-black (`#010000` / `#070503`), never neutral gray.
- Arabic RTL-first, Cairo body + Readex Pro headings, Naskh for quotes.
- Premium tactile controls: h-12 buttons, shine-sweep hover, 0.97 press.
- Status via soft tints (14% wash) + solid literal text, never pale chips.

## Colors

One warm ramp carries every surface; the flame family is the only accent.

### Primary
- **Flame Orange** (#bc4700 / oklch(0.55 0.19 45) in light): every primary
  action, active nav state, focus ring, and brand mark. AA against
  #f8f8f8 text.

### Secondary
- **Ember** (#863800): dark end of the CTA gradient, borders of emphasis.
- **Saffron** (#f0a646): the gradient's bright midpoint; decorative glow,
  never body text on light (use Saffron-Ink instead).

### Neutral
- **Near-Black Background** (#010000 dark / warm paper oklch(0.985 0.004 70)
  light): page canvas.
- **Card** (#070503 / oklch(1 0.002 70)): raised surface tier.
- **Sunken** (#020101 / oklch(0.94 0.006 70)): the "alt" section band.
- **Ash** (#b3ada6): secondary text accents; **Muted-Fg** (#8c857d): body
  secondary text, AA 5.59:1 on cards.
- **Border** (#211c18 / oklch(0.86 0.008 70)): hairlines, usually at /40
  or /60 opacity.

### Named Rules
**The One Flame Rule.** Flame marks primary actions, active state, and
brand — ≤10% of any screen. Its rarity is the point.
**The WhatsApp Rule.** #25D366 appears exclusively on WhatsApp-brand
actions; it is a brand, not a success color.
**The Soft-Tint Rule.** Status = 14% wash (dark) / 12% (light) behind its
solid literal color. NEW=orange, CONFIRMED/OUT_FOR_DELIVERY=info,
READY=saffron, DELIVERED=success, CANCELLED=destructive.

## Typography

**Display/Heading:** Readex Pro (Cairo fallback) — bold, tight leading.
**Body:** Cairo, 16px floor, 1.6 leading, tabular numerals everywhere
money appears.
**Label/Eyebrow:** Cairo 11px uppercase tracked +0.18em in bright flame
(#df5a00) with a pulsing dot.
**Naskh:** Noto Naskh Arabic — editorial/quote text only, RTL.

### Hierarchy
- **Display** (700, 36-60px clamp, 1.15): landing hero, one per page.
- **Section title** (600, 30-52px, 1.25): SectionHeader rhythm, gradient
  divider beneath.
- **Card title** (600, 18px): font-heading inside cards.
- **Body** (400, 16px, 1.6): 45-75ch measure.
- **Micro** (500, 12-13px): table meta, badges.

### Named Rules
**The Tabular Rule.** Every price, total, and stat renders in tabular
numerals — digits never change width while status ticks.

## Layout

1220px content column on landing; 4xl column on storefront. Section
rhythm: py-16/24/28 with SectionContainer, "alt" tone bands separated by
border-y hairlines. Spacing base 4px, component padding 16-24px, card
gap 12-16px. Mobile-first: bottom nav + sticky order bar with safe-area
insets. Touch targets ≥44px (48px standard).

## Elevation & Depth

Hybrid: tonal layering (raised > overlay > sunken) does most of the work;
shadows stay quiet.

### Shadow Vocabulary
- **sm** (0 1px 3px rgba(0,0,0,.3)): resting cards.
- **md** (0 4px 16px rgba(0,0,0,.35)): buttons, elevated hover.
- **lg** (0 12px 40px rgba(0,0,0,.4)): card-premium hover, dropdowns.
- **xl** (0 24px 60px rgba(0,0,0,.45)): modals, hero mock.
- **glow** (0 8px 24px #bc470024): flame-tinted emphasis only.
- **glass** (blur 16px + inset highlight): glass-card surfaces.

### Named Rules
**The Flat-By-Default Rule.** Surfaces rest flat (shadow-sm); depth
appears only as response to state — hover, elevation, focus.
**The Grain Rule.** One fixed film-grain overlay (2.2% opacity dark,
1.2% light) adds the family atmosphere layer; pointer-events none.

## Shapes

Radius scale 8/12/18/28 (sm/md/lg/xl). Pills (999px) only for badges and
status chips. Icon tiles 44-64px at radius 12-16 with orange/10-15 wash.
Cards carry 1px border at 40-70% border color.

## Components

- **Button**: h-12 default (h-10 sm, h-14 lg, icon 48px), font-bold,
  rounded-lg, shine-sweep ::before, ambient radial glow ::after,
  active:scale-[0.97]. Variants: orange (default), flame (ember→saffron→
  ember gradient, espresso text — signature CTA), outline, ghost,
  destructive (soft /10), whatsapp, link.
- **Badge**: h-5 pill, 12px medium. Variants: gold/success/saffron/info
  soft-tints + outline/ghost/link.
- **Card**: rounded-xl bg-card border-border/40, elevation flat/
  elevated/outlined, interactive variant with cursor + orange border
  hover, card-premium lift (-3px + glow) for hero surfaces.
- **Input/Select/Textarea**: h-12, rounded-lg, flame focus ring
  (border-orange + ring orange/20), placeholder-text token.
- **EmptyState**: 64px flame-tinted icon ring (orange/20 border,
  orange/8 wash), title 14px bold, description 12px muted, action mt-3.
- **Skeleton**: family shimmer class (muted→border 200% sweep, 1.8s).
- **Eyebrow**: tracked uppercase flame label + pulse-dot (1.4s).
- **SectionHeader**: eyebrow → spring fade-up title → subtitle →
  gradient divider, stagger 80ms, fires once at -40px.
- **ScrollReveal/StaggeredReveal**: fade-up reveals (ease
  [0.23,1,0.32,1]), 0.2s fallback under prefers-reduced-motion.

## Do's and Don'ts

- Do keep WhatsApp green off non-WhatsApp surfaces.
- Do render every status as soft tint + solid literal, never pale text.
- Do use flame gradients only on CTAs and the brand mark.
- Don't introduce a second accent family (no blues, purples, emeralds).
- Don't use emoji as icons — lucide 24×24 stroke set only.
- Don't use generic Tailwind gray anywhere; the neutrals are warm.
- Don't animate layout properties; transform/opacity only, springs
  120-300 stiffness, exits faster than entrances.
- Don't kill motion under prefers-reduced-motion — clamp to 0.2s and
  stop loops, preserving state feedback.
