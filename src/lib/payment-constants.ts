/**
 * Family payment-channel business data — verbatim from Smart Menu
 * (payment-constants.ts, round86-C8/C12). Shared by the subscription
 * PaymentDialog and the checkout payment-method panel.
 *
 * The phones are LAST-RESORT defaults: live values can arrive via
 * NEXT_PUBLIC_TRANSFER_PHONES (JSON). These constants only mask a
 * misconfigured deployment so the payment flow never renders an empty
 * transfer target.
 */

/** Mobile-wallet single-transfer cap (LYD) — libyana/madar network constraint. */
export const WALLET_CAP_LYD = 99;

/** Fallback transfer phone for MADAR. */
export const MADAR_PHONE_FALLBACK = "0910089975";

/** Fallback transfer phone for LIBYANA. */
export const LIBYANA_PHONE_FALLBACK = "0942119637";

/** USSD quick-transfer code for the LIBYANA wallet (fils in the amount). */
export function libyanaUssdCode(phone: string, amountLyD: number): string {
  /* r140 (P2-3): التقريب يحيّد كسور الفاصلة العائمة — جبرًا كاملًا
   * 1472 قيمة millimes بين 1 و100000 كانت تنتج رمزًا ميتًا (total=1001
   * ← «1000.9999999999999») ينسخه الزبون فلا يتصل. النقاط السعرية
   * الشائعة (.000/.250/.500/.750) آمنة لكن أي درهم فردي كان يكسر بصمت. */
  return `*122*218${phone.slice(1)}*${Math.round(amountLyD * 1000)}*1#`;
}

/** USSD quick-transfer code for the MADAR wallet. */
export function madarUssdCode(phone: string, amountLyD: number): string {
  return `*140*4*1*${amountLyD}*${phone}#`;
}

/** The payment channel discriminator — family type. */
export type PaymentProvider = "libyana" | "madar" | "bank";
