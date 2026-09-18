# PRODUCT.md — Smart Order (سمارت أوردر)

## Product
Digital ordering platform for Libyan food businesses: a shareable storefront
link (QR / WhatsApp / Instagram bio) with cart, delivery zones, and a full
order-management dashboard. Third product of the Smart family
(Smart Menu → menu.smart-link.ly, SmartBot → bot.smart-link.ly,
Smart Order → order.smart-link.ly).

## Audience
- **Primary:** owners of small-to-medium Libyan food businesses —
  restaurants, bakeries, home kitchens, juice bars — who take orders over
  WhatsApp and phone calls and lose track of them.
- **Secondary:** their customers, who order from a phone, almost always in
  Arabic, often on mid-range Android devices over variable networks.

## Purpose
Move a business from chaotic WhatsApp ordering to one managed flow:
customer orders themselves on a clean storefront → owner tracks status
from NEW to DELIVERED → customer follows a live tracking link. The first
order should be receivable the same evening the owner registers.

## Operating context
- Libya: Arabic-first RTL, LYD pricing (3-decimal fils precision),
  Libyan phone numbers (09x/0xx), city + delivery-zone model with per-zone
  fees and minimums.
- Payments: cash on delivery, manual transfer via local banks
  (مصرفي مدار/الوحدة). No card gateway in market reality.
- Networks can be slow — pages must stay light, fonts local-first.
- WhatsApp is the default business channel, not email.

## Durable constraints
- Arabic UI only for end customers; Arabic-first for the dashboard.
- COD and manual-transfer flows must be honest: no fake "paid" states.
- Free tier; zero-friction onboarding (no credit card, no contracts).
- Single tenant per business; strict cross-tenant isolation.

## Voice
Warm, capable, local. Speaks Libyan business Arabic — concrete and
reassuring, never corporate ("متجرك يجهز في نفس الجلسة" not "قم بتحسين
التحويل الرقمي"). Numbers in Arabic-Indic context but Latin tabular
numerals for money.

## Evidence
- E2E suite: 30 tests covering register → onboarding → products →
  checkout → order lifecycle → tracking.
- Production QA verified: real orders placed through the real UI
  (SO-20260918-000x series), dashboard status chain, customer tracking.
