/**
 * Smart Order Mobile — حالة مصادقة التاجر (zustand).
 *
 * التوكن يسكن SecureStore (عبر services/merchant.ts) ولا يُرى هنا إلا
 * في الذاكرة. الاسترجاع عند إقلاع التطبيق عبر GET /me، بنموذج حالات
 * يميّز سبب الفشل (P38 Phase D):
 *
 *   لا توكن مخزّن            → unauthenticated (زائر فورًا)
 *   توكن + /me ناجح          → authenticated (المستخدم + العضويات)
 *   توكن + /me ردّ 401       → unauthenticated (الخدمة محت التوكن
 *                              واستدعت sessionExpired — انتهاء/إبطال
 *                              حقيقي، لا لبس فيه)
 *   توكن + انقطاع شبكة       → session-unverified/network — التوكن
 *                              يبقى في الذاكرة والخزنة، والتحقق قابل
 *                              للإعادة: انقطاع لحظي ≠ كلمة مرور خاطئة
 *                              ولا جلسة ملغاة.
 *   توكن + خطأ خادم (5xx)    → session-unverified/server — نفس الدلالة:
 *                              الخادم هو من تعثّر، لا هوية التاجر.
 *   فشل قراءة SecureStore    → session-unverified/store — الخزنة قد
 *                              تكون غير قابلة للقراءة مؤقتًا؛ لا ندّعي
 *                              زوّارية لا دليل عليها.
 *
 * اختيار المتجر (selectedBusinessId) ليس سرًا — يسكن AsyncStorage مثل
 * «المتاجر الأخيرة» ويُتحقق من صلاحيته ضد العضويات عند كل استرجاع.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { queryClient } from '@/lib/query-client'
import {
  bootMerchantToken,
  fetchMe,
  merchantLogin,
  merchantLogout,
  setUnauthorizedHandler,
  ApiError,
  NetworkError,
} from '@/services/merchant'
import type { AuthUser, LoginResponse, Membership } from '@/types/merchant'

const SELECTED_BUSINESS_KEY = 'smartorder.merchant_business_v1'

/**
 * P38 Phase D — لماذا لم يعد الاسترجاع يعامل كل فشل بـ unauthenticated:
 * catch واحدة كانت تبتلع انقطاع الشبكة و5xx وفشل الخزنة مع 401 الحقيقي
 * فتُنزل التاجر إلى شاشة الدخول رغم أن توكنه الحيّ ما زال في SecureStore.
 * سبب واحد قابل لإعادة المحاولة لكل حالة غير موثّقة، والواجهة تعرضه.
 */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'session-unverified'

/** سبب عدم القدرة على التحقق من الجلسة (للعرض، ليس للمنطق). */
export type UnverifiedReason = 'network' | 'server' | 'store' | null

interface AuthState {
  token: string | null
  user: AuthUser | null
  memberships: Membership[]
  status: AuthStatus
  unverifiedReason: UnverifiedReason
  selectedBusinessId: string | null
  login: (email: string, password: string) => Promise<void>
  restore: () => Promise<void>
  /** إعادة محاولة التحقق بعد session-unverified — تعيد loading ثم الجسم. */
  retryRestore: () => Promise<void>
  logout: () => Promise<void>
  selectBusiness: (businessId: string) => void
  sessionExpired: () => void
}

async function readPersistedBusinessId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SELECTED_BUSINESS_KEY)
  } catch {
    return null
  }
}

async function persistBusinessId(id: string | null): Promise<void> {
  try {
    if (id) await AsyncStorage.setItem(SELECTED_BUSINESS_KEY, id)
    else await AsyncStorage.removeItem(SELECTED_BUSINESS_KEY)
  } catch {
    // تخزين معطوب — الاختيار يعيش في الذاكرة لهذه الجلسة فقط.
  }
}

function guestState() {
  return {
    token: null as string | null,
    user: null as AuthUser | null,
    memberships: [] as Membership[],
    selectedBusinessId: null as string | null,
    unverifiedReason: null as UnverifiedReason,
  }
}

let restoring: Promise<void> | null = null

async function runRestore(set: (partial: Partial<AuthState>) => void): Promise<void> {
  let token: string | null
  try {
    token = await bootMerchantToken()
  } catch {
    // SecureStore رفض القراءة (خزنة مشغولة/قرص مؤقتًا غير متاح): التوكن
    // قد يكون موجودًا لكنه غير مقروء الآن — لا ندّعي زوّارية.
    set({ ...guestState(), status: 'session-unverified', unverifiedReason: 'store' })
    return
  }
  if (!token) {
    set({ ...guestState(), status: 'unauthenticated' })
    return
  }
  try {
    const res = await fetchMe()
    const memberships = res.memberships
    const persisted = await readPersistedBusinessId()
    const selected =
      persisted && memberships.some((m) => m.businessId === persisted) ? persisted : null
    await persistBusinessId(selected)
    set({
      token,
      user: res.user,
      memberships,
      selectedBusinessId: selected,
      status: 'authenticated',
      unverifiedReason: null,
    })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      // 401: الخدمة محت التوكن واستدعت sessionExpired (نزلت الحالة
      // عبر المعالِج) — نجعلها صريحة هنا أيضًا دفاعيًا.
      set({ ...guestState(), status: 'unauthenticated' })
      return
    }
    // انقطاع/مهلة (NetworkError) أو خادم متعثر (ApiError 5xx) أو رد
    // غير متوقع: التوكن ما زال في الخزنة والذاكرة — حالة قابلة
    // لإعادة المحاولة، لا نُجبر مالكًا على دخول جديد بسبب لحظة تعثر.
    const reason: UnverifiedReason = err instanceof NetworkError ? 'network' : 'server'
    set({
      token,
      user: null,
      memberships: [],
      selectedBusinessId: null,
      status: 'session-unverified',
      unverifiedReason: reason,
    })
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  memberships: [],
  status: 'loading',
  unverifiedReason: null,
  selectedBusinessId: null,

  login: async (email, password) => {
    const res: LoginResponse = await merchantLogin({ email, password })
    const memberships = res.memberships
    // اختيار واحد تلقائيًا؛ المتعدد: نبقي المختار المحفوظ إن ظل صالحًا.
    const persisted = memberships.length === 1 ? memberships[0].businessId : await readPersistedBusinessId()
    const selected = persisted && memberships.some((m) => m.businessId === persisted) ? persisted : null
    await persistBusinessId(selected)
    set({
      token: res.token,
      user: res.user,
      memberships,
      selectedBusinessId: selected,
      status: 'authenticated',
      unverifiedReason: null,
    })
  },

  restore: async () => {
    // نداء واحد مشترك مهما طلبه عدة مكوّنات في نفس الإقلاع.
    if (restoring) return restoring
    restoring = runRestore(set)
    try {
      await restoring
    } finally {
      restoring = null
    }
  },

  retryRestore: async () => {
    // إعادة تحقق صريحة (زر «إعادة المحاولة» على شاشة session-unverified).
    // لا ندخل في تحزيم restoring: المستخدم طلب المحاولة الآن.
    set({ status: 'loading' })
    await runRestore(set)
  },

  logout: async () => {
    try {
      await merchantLogout()
    } catch {
      // الإبطال الشبكي فشل — محو التوكن المحلي تم داخل merchantLogout.
    }
    queryClient.removeQueries({ queryKey: ['merchant'] })
    set({ ...guestState(), status: 'unauthenticated' })
  },

  selectBusiness: (businessId) => {
    const valid = get().memberships.some((m) => m.businessId === businessId)
    if (!valid) return
    void persistBusinessId(businessId)
    set({ selectedBusinessId: businessId })
    // بيانات المتجر السابق لا تختلط مع الجديد.
    queryClient.removeQueries({ queryKey: ['merchant'] })
  },

  sessionExpired: () => {
    queryClient.removeQueries({ queryKey: ['merchant'] })
    set({ ...guestState(), status: 'unauthenticated' })
  },
}))

// موت التوكن في أي نداء موثّق → إسقاط الجلسة كاملة (يُسجَّل مرة عند
// تحميل الوحدة؛ الخدمة لا تستوردها فلا استيراد دائري).
setUnauthorizedHandler(() => {
  useAuthStore.getState().sessionExpired()
})
