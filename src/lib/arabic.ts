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

export function formatArabicTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h < 12 ? "ص" : "م";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

/** Relative "منذ ٥ دقائق" style label for dashboard freshness. */
export function timeAgoAr(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "الآن";
  const min = Math.floor(sec / 60);
  if (min < 60) return `منذ ${min} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} ساعة`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `منذ ${day} يوم`;
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

/** Arabic plural for orders ("طلب واحد/طلبان/٥ طلبات/١٠ طلبات/١١ طلبًا"). */
export function arabicCount(n: number, singular: string, dual: string, plural: string, pluralMany?: string): string {
  if (n === 0) return `لا ${singular}`;
  if (n === 1) return `${singular} واحد`;
  if (n === 2) return dual;
  if (n >= 3 && n <= 10) return `${n} ${plural}`;
  return `${n} ${pluralMany ?? singular}`;
}
