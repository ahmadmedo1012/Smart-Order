/**
 * Smart Order Mobile — المتاجر الأخيرة (AsyncStorage).
 *
 * قائمة صغيرة (حد 8) من { slug, name } لكل متجر فتحه المستخدم —
 * بوابات سريعة من الشاشة الأولى. لا تُخزَّن أي بيانات مالية.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from '@/constants/config'

export interface RecentStore {
  slug: string
  name: string
  at: number
}

export async function readRecents(): Promise<RecentStore[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.recentStores)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (x): x is RecentStore =>
          typeof x === 'object' &&
          x !== null &&
          typeof (x as RecentStore).slug === 'string' &&
          typeof (x as RecentStore).name === 'string',
      )
      .slice(0, 8)
  } catch {
    return []
  }
}

export async function rememberStore(slug: string, name: string): Promise<RecentStore[]> {
  const current = await readRecents()
  const next = [
    { slug, name, at: Date.now() },
    ...current.filter((x) => x.slug !== slug),
  ].slice(0, 8)
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.recentStores, JSON.stringify(next))
  } catch {
    // تخزين معطوب — القائمة تُعاد من الذاكرة لهذه الجلسة فقط.
  }
  return next
}
