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
