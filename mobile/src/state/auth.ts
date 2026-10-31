/**
 * Smart Order Mobile — حالة مصادقة التاجر (zustand).
 *
 * التوكن يسكن SecureStore (عبر services/merchant.ts) ولا يُرى هنا إلا
 * في الذاكرة. الاسترجاع عند إقلاع التطبيق عبر GET /me: لا توكن →
 * زائر فورًا؛ توكن حيّ → المستخدم + العضويات؛ توكن ميت (401) →
 * الخدمة تمحوه وتستدعي sessionExpired فننزل إلى الدخول.
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
} from '@/services/merchant'
import type { AuthUser, LoginResponse, Membership } from '@/types/merchant'

const SELECTED_BUSINESS_KEY = 'smartorder.merchant_business_v1'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  token: string | null
  user: AuthUser | null
  memberships: Membership[]
  status: AuthStatus
  selectedBusinessId: string | null
  login: (email: string, password: string) => Promise<void>
  restore: () => Promise<void>
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

let restoring: Promise<void> | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  memberships: [],
  status: 'loading',
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
    })
  },

  restore: async () => {
    // نداء واحد مشترك مهما طلبه عدة مكوّنات في نفس الإقلاع.
    if (restoring) return restoring
    restoring = (async () => {
      const token = await bootMerchantToken()
      if (!token) {
        set({ token: null, user: null, memberships: [], selectedBusinessId: null, status: 'unauthenticated' })
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
        })
      } catch {
        // 401: الخدمة محت التوكن واستدعت sessionExpired (نزلت الحالة
        // عبر المعالِج). أي فشل آخر (أوفلاين مثلًا): نظهر بلا جلسة
        // لكن التوكن يبقى في الخزنة — لا نُجبر مالكًا على دخول جديد
        // بسبب لحظة انقطاع.
        set({ token: null, user: null, memberships: [], selectedBusinessId: null, status: 'unauthenticated' })
      }
    })()
    try {
      await restoring
    } finally {
      restoring = null
    }
  },

  logout: async () => {
    try {
      await merchantLogout()
    } catch {
      // الإبطال الشبكي فشل — محو التوكن المحلي تم داخل merchantLogout.
    }
    queryClient.removeQueries({ queryKey: ['merchant'] })
    set({ token: null, user: null, memberships: [], selectedBusinessId: null, status: 'unauthenticated' })
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
    set({ token: null, user: null, memberships: [], selectedBusinessId: null, status: 'unauthenticated' })
  },
}))

// موت التوكن في أي نداء موثّق → إسقاط الجلسة كاملة (يُسجَّل مرة عند
// تحميل الوحدة؛ الخدمة لا تستوردها فلا استيراد دائري).
setUnauthorizedHandler(() => {
  useAuthStore.getState().sessionExpired()
})
