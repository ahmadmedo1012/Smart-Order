// Arabic text + date helpers (Western digits policy, Arabic month names, search normalization).

const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

/* r136 (السوق الليبي أولاً): ليبيا = UTC+2 ثابت بلا توقيت صيفي منذ 2013
 * (نفس حكم SmartBot pdf_reports_engine._tripoli_now). على Vercel (TZ=UTC)
 * كان «اليوم» يتبدل 02:00 طرابلس: طلب 01:30 يحمل تاريخ الأمس في رقمه،
 * و«إيراد اليوم» والتسلسل اليومي يصفران متأخرين ساعتين. كل حدود اليوم
 * في المسار الخادمي تمر من هنا الآن. */
const TRIPOLI_OFFSET_MS = 2 * 60 * 60 * 1000;

/** بداية اليوم الحالي بتوقيت طرابلس (كقيمة UTC صالحة للمقارنات ≥/≤). */
export function tripoliDayStart(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + TRIPOLI_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - TRIPOLI_OFFSET_MS);
}

/** بداية الشهر الحالي بتوقيت طرابلس (نفس صنف خطأ الحد اليومي). */
export function tripoliMonthStart(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + TRIPOLI_OFFSET_MS);
  shifted.setUTCDate(1);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - TRIPOLI_OFFSET_MS);
}

/** أجزاء التاريخ (سنة/شهر/يوم) بتوقيت طرابلس — لأرقام الطلبات SO-YYYYMMDD. */
export function tripoliDateParts(now: Date = new Date()): { y: number; m: number; d: number } {
  const shifted = new Date(now.getTime() + TRIPOLI_OFFSET_MS);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate() };
}

export function formatArabicDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = d.getDate();
  const month = AR_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h < 12 ? "ص" : "م";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${day} ${month} ${year} · ${h12}:${m} ${ampm}`;
}

export function formatArabicDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Counted relative-time phrase — r133 (A12 S6): the «منذ 5 دقيقة»
 * plural bug is fixed with the counted-plural engine (SB _unitPhrase /
 * madarek countAr shape): 1 = واحد/واحدة, 2 = dual, 3-10 = plural,
 * 11+ = singular accusative. Prefix stays «منذ» (fleet ruling R9). */
function sincePhrase(
  n: number,
  one: string,
  two: string,
  few: string,
  many: string,
): string {
  if (n === 1) return `منذ ${one}`;
  if (n === 2) return `منذ ${two}`;
  if (n >= 3 && n <= 10) return `منذ ${n} ${few}`;
  return `منذ ${n} ${many}`;
}

/** Relative "منذ 5 دقائق" style label for dashboard freshness. */
export function timeAgoAr(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "الآن";
  const min = Math.floor(sec / 60);
  if (min < 60) return sincePhrase(min, "دقيقة واحدة", "دقيقتين", "دقائق", "دقيقة");
  const hr = Math.floor(min / 60);
  if (hr < 24) return sincePhrase(hr, "ساعة واحدة", "ساعتين", "ساعات", "ساعة");
  const day = Math.floor(hr / 24);
  if (day < 30) return sincePhrase(day, "يوم واحد", "يومين", "أيام", "يوم");
  return formatArabicDate(d);
}

/** Normalize Arabic for search: strip tashkeel/tatweel, fold alef/yaa/taa variants. */
export function normalizeArabic(input: string): string {
  return String(input ?? "")
    .replace(/[\u064B-\u0652\u0640]/g, "") // harakat + tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .toLowerCase()
    .trim();
}
