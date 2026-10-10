// Libyan phone normalization — Western digits, E.164-ready (218 country code).
// Libyan mobile prefixes: 091/093 (Al Madar), 092/094 (Libyana), 095 (Aljeel Aljadeed/LTT).

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigits(input: string): string {
  return input.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

/** Extract bare digits from any user-typed phone string. */
function phoneDigits(input: string): string {
  return normalizeDigits(String(input ?? "")).replace(/\D/g, "");
}

/**
 * Normalize a Libyan phone number to its local form (0XXXXXXXXX / 0XXXXXXXX)
 * or E.164 without '+'.
 * Accepts: 0912345678, 218912345678, +218 91 234 5678, ٩١٢٣٤٥٦٧٨, 912345678.
 * Returns null when the number cannot be a valid Libyan mobile/landline.
 *
 * (r138 — توحيد الأسطولة، تدقيق r138-e): كان الالتزام الصارم «10 خانات
 * بالضبط» بلا سبب موثق في أي مكان (الاختبار القديم وصف السلوك ولم يعلله)،
 * فكان «091234567» (محمول 9 خانات) يُقبل في Smart-Link ويُرفض هنا بينما
 * الأرضي «021…» يُقبل هنا ويُرفض هناك. العقد الموحّد الأوسع:
 *  - محمول 09 بطول 9-10 خانات (091234567 نموذج المشغّلين القصار — نفس
 *    LIBYAN_PHONE_RE عند Smart-Link حرفيًا)؛
 *  - أرضي 0[1-9] بعشر خانات (البادئة الوطنية اتسعت عن 0[125-9] السابقة
 *    لتغطية مساحة الترقيم الليبية كاملة — توثيق القرار، لا اختبار يعلّل
 *    القديمة فلا يُخالَف قرار موثق).
 * ملاحظة مقبولة عمدًا: إسقاط الخانة الأخيرة من محمول 10 خانات يُنتج رقمًا
 * قصيرًا صالحًا (نفس مقايضة Smart-Link الموثقة) — أولوية القبول على الرفض.
 */
export function normalizeLibyanPhone(input: string): string | null {
  let d = phoneDigits(input);
  if (!d) return null;
  if (d.startsWith("00218")) d = d.slice(5);
  else if (d.startsWith("218")) d = d.slice(3);
  // جذع 0 المفقود للمحمول: 9xxxxxxxx (10 خانات بعد الجذع) و 9xxxxxxx
  // (9 خانات — النموذج القصير؛ نفس فكرة Smart-Link: الجذع يُسبق قبل التحقق)
  if (d.startsWith("9") && (d.length === 8 || d.length === 9)) d = "0" + d;
  // (r138) المحمول القصير 9 خانات: 09 + 7 أرقام
  if (d.length === 9 && d.startsWith("09")) return d;
  if (d.length !== 10 || !d.startsWith("0")) return null;
  if (!/^0[1-9]/.test(d)) return null; // (r138) البادئات الوطنية: محمول + أرضي
  return d;
}

/** E.164 without plus: 218912345678 */
export function toE164(localPhone: string): string {
  const d = phoneDigits(localPhone);
  if (d.startsWith("218")) return d;
  if (d.startsWith("0")) return "218" + d.slice(1);
  return d;
}

/** Human display: "091 234 5678" (and the short form "091 234 567" — r138) */
export function formatPhoneDisplay(localPhone: string): string {
  const d = phoneDigits(localPhone);
  // (r138) الشكل المحلي 9 خانات (0…) يُجمَّع مثل العشري؛ غير المحلي يمر كما دخل
  const isLocal = (d.length === 10 || d.length === 9) && d.startsWith("0");
  if (!isLocal) return localPhone;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}
