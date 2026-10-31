/**
 * Smart Order Mobile — تنسيق المال «مليم» (توأم الويب حرفيًا).
 *
 * عقد الخادم التاجر: كل المبالغ أعداد صحيحة بالمليم (1 د.ل = 1000
 * مليم، والدينار الليبي ثلاثي المنازل). formatMillimes هو formatLyd
 * في الويب (src/lib/money.ts) بالنقاط نفسها: صحيح نظيف («19 د.ل»)
 * وكسر فعلي بدقة الدرهم («19.500 د.ل») — ولا تعويم في أي خطوة.
 */

function groupDots(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** مليم → «12.500 د.ل» — تجميع ar-LY + سقوط الذيل «.000». */
export function formatMillimes(millimes: number): string {
  const safe = Number.isFinite(millimes) ? Math.round(millimes) : 0
  const sign = safe < 0 ? '-' : ''
  const abs = Math.abs(safe)
  const whole = Math.floor(abs / 1000)
  const frac = String(abs % 1000).padStart(3, '0')
  const fracPart = frac === '000' ? '' : `.${frac}`
  return `${sign}${groupDots(String(whole))}${fracPart} د.ل`
}

/** مليم → «12.500» — سلسلة عشرية خام بثلاث منازل (توأم formatLydAmount
 * في الويب): بذرة حقول تحرير الأسعار، رحلة عودة عبر parseAmountMillimes
 * (وعبر parseLyd في الخادم — نقطة واحدة لا تُقبل «12.500.000»). */
export function formatMillimesAmount(millimes: number): string {
  const safe = Number.isFinite(millimes) ? Math.round(millimes) : 0
  const sign = safe < 0 ? '-' : ''
  const abs = Math.abs(safe)
  const whole = Math.floor(abs / 1000)
  const frac = String(abs % 1000).padStart(3, '0')
  return `${sign}${whole}.${frac}`
}

/**
 * سلسلة عشرية → مليم صحيح أو null — مرآة نصية لـ parseLyd في الخادم
 * (أرقام عربية مقبولة، «٫»/«,» نقطة، بلا تعويم: parseInt فقط). تحقق
 * محلي قبل الإرسال؛ الخادم يبقى مصدر الحقيقة.
 */
export function parseAmountMillimes(input: string): number | null {
  const cleaned = input
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[,،٫]/g, '.')
    .replace(/[^\d.]/g, '')
    .trim()
  if (!cleaned) return null
  const parts = cleaned.split('.')
  if (parts.length > 2) return null
  const whole = parseInt(parts[0] || '0', 10)
  if (!Number.isFinite(whole)) return null
  let frac = parts[1] ?? ''
  if (frac.length > 3) frac = frac.slice(0, 3)
  const fracNum = frac ? parseInt(frac.padEnd(3, '0'), 10) : 0
  if (!Number.isFinite(fracNum)) return null
  return whole * 1000 + fracNum
}
