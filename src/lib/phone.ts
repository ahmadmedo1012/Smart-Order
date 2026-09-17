// Libyan phone normalization — Western digits, E.164-ready (218 country code).
// Libyan mobile prefixes: 091/093 (Al Madar), 092/094 (Libyana), 095 (Aljeel Aljadeed/LTT).

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalizeDigits(input: string): string {
  return input.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

/** Extract bare digits from any user-typed phone string. */
export function phoneDigits(input: string): string {
  return normalizeDigits(String(input ?? "")).replace(/\D/g, "");
}

/**
 * Normalize a Libyan phone number to local 10-digit format (0XXXXXXXXX) or E.164 without '+'.
 * Accepts: 0912345678, 218912345678, +218 91 234 5678, ٩١٢٣٤٥٦٧٨, 912345678.
 * Returns null when the number cannot be a valid Libyan mobile/landline.
 */
export function normalizeLibyanPhone(input: string): string | null {
  let d = phoneDigits(input);
  if (!d) return null;
  if (d.startsWith("00218")) d = d.slice(5);
  else if (d.startsWith("218")) d = d.slice(3);
  if (d.length === 9 && d.startsWith("9")) d = "0" + d; // 91xxxxxxx missing trunk 0
  if (d.length !== 10 || !d.startsWith("0")) return null;
  if (!/^0[125-9]/.test(d)) return null; // Libyan national prefixes
  return d;
}

/** E.164 without plus: 218912345678 */
export function toE164(localPhone: string): string {
  const d = phoneDigits(localPhone);
  if (d.startsWith("218")) return d;
  if (d.startsWith("0")) return "218" + d.slice(1);
  return d;
}

/** Human display: 091 234 5678 */
export function formatPhoneDisplay(localPhone: string): string {
  const d = phoneDigits(localPhone);
  if (d.length !== 10) return localPhone;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

/** wa.me target (international format, no plus). */
export function whatsappTarget(localPhone: string): string {
  return toE164(localPhone);
}
