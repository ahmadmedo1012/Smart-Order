/**
 * Smart Order Mobile — UUID v4 بدون crypto.randomUUID (غير متوفر في
 * جسر React Native القديم). react-native-get-random-values غير مطلوب:
 * expo 57 يعرض expo-crypto، لكن يكفي مصدر إنتروبيا Math.random لمفتاح
 * idempotency (قوة التفرد تُقيّده uniqueness قاعدة البيانات على
 * مستوى (businessId, idempotencyKey) — التصادم يُعاد تشغيله كرد
 * replay آمن، لا طلبًا مكررًا).
 */
export function randomUUID(): string {
  const hex = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += '-'
    } else if (i === 14) {
      out += '4'
    } else if (i === 19) {
      out += hex[(Math.random() * 4) | 0x8]
    } else {
      out += hex[(Math.random() * 16) | 0]
    }
  }
  return out
}
