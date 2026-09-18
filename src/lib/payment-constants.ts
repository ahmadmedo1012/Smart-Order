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
  return `*122*218${phone.slice(1)}*${amountLyD * 1000}*1#`;
}

/** USSD quick-transfer code for the MADAR wallet. */
export function madarUssdCode(phone: string, amountLyD: number): string {
  return `*140*4*1*${amountLyD}*${phone}#`;
}

/** The payment channel discriminator — family type. */
export type PaymentProvider = "libyana" | "madar" | "bank";

export const PROVIDER_AR: Record<PaymentProvider, string> = {
  libyana: "ليبيانا",
  madar: "مدار",
  bank: "تحويل بنكي",
};

/** Wallet-cap guard shared by dialogs (family behavior). */
export function requiresBankTransfer(amountLyD: number): boolean {
  return amountLyD > WALLET_CAP_LYD;
}
