/**
 * Smart Order Mobile — خزنة توكن التاجر (expo-secure-store).
 *
 * توكن الجلسة som_… سرّ اعتماد كامل: لا يُخزَّن إلا في SecureStore
 * (Keychain/Keystore) — AsyncStorage ممنوع منعاً باتًا هنا (عقد P36 C3).
 * كل شيء else (اختيار المتجر مثلًا) ليس سرًا وقد يسكن AsyncStorage.
 */
import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'smartorder.merchant_token_v1'

/** قراءة التوكن — null عند الغياب أو تعطل الخزنة (نضبط جلسة نظيفة). */
export async function readMerchantToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY)
  } catch {
    return null
  }
}

export async function writeMerchantToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function clearMerchantToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
  } catch {
    // الخزنة معطوبة أو المفتاح غائب — الذاكرة تُنظَّف على أي حال.
  }
}
