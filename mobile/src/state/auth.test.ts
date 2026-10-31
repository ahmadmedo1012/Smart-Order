/**
 * P38 Phase D — عقود نموذج حالة المصادقة: التمييز بين أسباب الفشل.
 *
 * الجلسة القديمة كانت تبتلع كل أخطاء fetchMe في catch واحدة وتنزل إلى
 * unauthenticated — فيُخرَج التاجر إلى شاشة الدخول بسبب انقطاع لحظي
 * رغم أن توكنه الحيّ في SecureStore. هذه العقود تثبّت النموذج الجديد:
 *
 *   لا توكن                    → unauthenticated
 *   توكن + /me ناجح            → authenticated (+ اختيار المتجر بسلاسة
 *                                 العضويات: صالح واحد/متعدد/باطل)
 *   توكن + 401                 → unauthenticated (موت حقيقي)
 *   إبطال بعيد (401 في نداء    → unauthenticated عبر المعالِج المركزي
 *   موثّق لاحق)
 *   توكن + انقطاع شبكة         → session-unverified/network والتوكن باقٍ
 *   توكن + خطأ خادم 5xx        → session-unverified/server والتوكن باقٍ
 *   فشل قراءة SecureStore      → session-unverified/store
 *   retryRestore بعد التعثر    → loading ثم authenticated عند النجاح
 *   login/logout/selectBusiness/إلخ — السلوك التعاقدي القائم يُصان.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

/* ── الحالة المشتركة (vi.hoisted: المصنع يُرفَع فوق كل تعريف) ──────── */

const h = vi.hoisted(() => {
  class MockApiError extends Error {
    status: number
    body: unknown
    constructor(status: number, body: unknown) {
      super(`api ${status}`)
      this.status = status
      this.body = body
    }
  }
  class MockNetworkError extends Error {}
  return {
    MockApiError,
    MockNetworkError,
    storage: new Map<string, string>(),
    storedToken: null as string | null,
    bootShouldThrow: false,
    fetchMeCalls: 0,
    loginCalls: 0,
    logoutCalls: 0,
    unauthorizedHandler: null as (() => void) | null,
    meResponse: null as null | (() => Promise<unknown>),
    loginResponse: null as null | (() => Promise<unknown>),
  }
})

vi.mock('@/services/merchant', () => ({
  ApiError: h.MockApiError,
  NetworkError: h.MockNetworkError,
  bootMerchantToken: vi.fn(async () => {
    if (h.bootShouldThrow) throw new Error('SecureStore unavailable')
    return h.storedToken
  }),
  fetchMe: vi.fn(async () => {
    h.fetchMeCalls += 1
    return h.meResponse!()
  }),
  merchantLogin: vi.fn(async () => {
    h.loginCalls += 1
    return h.loginResponse!()
  }),
  merchantLogout: vi.fn(async () => {
    h.logoutCalls += 1
    h.storedToken = null
  }),
  setUnauthorizedHandler: vi.fn((fn: () => void) => {
    h.unauthorizedHandler = fn
  }),
}))

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => h.storage.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      h.storage.set(k, v)
    },
    removeItem: async (k: string) => {
      h.storage.delete(k)
    },
  },
}))

const removeQueries = vi.fn()
vi.mock('@/lib/query-client', () => ({
  queryClient: { removeQueries: (...args: unknown[]) => removeQueries(...args) },
}))

/* ── الوحدة قيد الاختبار ───────────────────────────────────────────── */

import { useAuthStore } from './auth'
import type { AuthUser, Membership } from '@/types/merchant'

const user: AuthUser = {
  id: 'u1',
  name: 'التاجر',
  email: 'merchant@example.com',
} as unknown as AuthUser

const memberships: Membership[] = [
  { businessId: 'b1', businessName: 'مخبز الواحة', role: 'OWNER' },
  { businessId: 'b2', businessName: 'مطعم البحر', role: 'ADMIN' },
] as unknown as Membership[]

function resetWorld(): void {
  h.storedToken = null
  h.bootShouldThrow = false
  h.fetchMeCalls = 0
  h.loginCalls = 0
  h.logoutCalls = 0
  // ملاحظة: unauthorizedHandler لا يُصفَّر — سُجِّل مرة عند تحميل
  // الوحدة (نفس دورة حياة التطبيق الحقيقي) ويبقى صالحًا لكل الاختبارات.
  h.meResponse = async () => ({ user, memberships })
  h.loginResponse = async () => ({ token: 'fresh-token', user, memberships })
  h.storage.clear()
  removeQueries.mockClear()
  useAuthStore.setState({
    token: null,
    user: null,
    memberships: [],
    status: 'loading',
    unverifiedReason: null,
    selectedBusinessId: null,
  })
}

const s = () => useAuthStore.getState()

describe('استرجاع الجلسة عند الإقلاع', () => {
  beforeEach(resetWorld)

  it('لا توكن مخزّن → زائر فورًا وبلا نداء /me', async () => {
    await s().restore()
    expect(s().status).toBe('unauthenticated')
    expect(s().token).toBeNull()
    expect(h.fetchMeCalls).toBe(0)
  })

  it('توكن + /me ناجح → موثّق؛ بلا محفوظ لا يُختار تلقائيًا (سلوك الأصل: شاشة الاختيار)', async () => {
    h.storedToken = 'live-token'
    h.meResponse = async () => ({ user, memberships: [memberships[0]] })
    await s().restore()
    expect(s().status).toBe('authenticated')
    expect(s().token).toBe('live-token')
    expect(s().user).toEqual(user)
    // restore لا يُختار آليًا (login فقط يفعل) — سلوك الأصل مُصان.
    expect(s().selectedBusinessId).toBeNull()
  })

  it('عضويات متعددة + مختار محفوظ صالح → يبقى الاختيار', async () => {
    h.storedToken = 'live-token'
    h.storage.set('smartorder.merchant_business_v1', 'b2')
    await s().restore()
    expect(s().status).toBe('authenticated')
    expect(s().selectedBusinessId).toBe('b2')
  })

  it('مختار محفوظ باطل (id متجر أجنبي/محذوف) → بلا اختيار، والجلسة حيّة', async () => {
    h.storedToken = 'live-token'
    h.storage.set('smartorder.merchant_business_v1', 'gone-business')
    await s().restore()
    expect(s().status).toBe('authenticated')
    expect(s().selectedBusinessId).toBeNull()
    // المحفوظ الباطل يُمحى حتى لا يعلق عبر الإقلاعات.
    expect(h.storage.get('smartorder.merchant_business_v1')).toBeUndefined()
  })

  it('نداءان متزامنان لـ restore → /me مرة واحدة (تحزيم الاسترجاع)', async () => {
    h.storedToken = 'live-token'
    await Promise.all([s().restore(), s().restore()])
    expect(h.fetchMeCalls).toBe(1)
    expect(s().status).toBe('authenticated')
  })
})

describe('P38 Phase D — تعثّر التحقق ليس موت جلسة', () => {
  beforeEach(resetWorld)

  it('انقطاع الشبكة → session-unverified/network والتوكن باقٍ في الحالة', async () => {
    h.storedToken = 'live-token'
    h.meResponse = async () => {
      throw new h.MockNetworkError()
    }
    await s().restore()
    expect(s().status).toBe('session-unverified')
    expect(s().unverifiedReason).toBe('network')
    expect(s().token).toBe('live-token')
  })

  it('خطأ خادم 5xx → session-unverified/server والتوكن باقٍ', async () => {
    h.storedToken = 'live-token'
    h.meResponse = async () => {
      throw new h.MockApiError(503, null)
    }
    await s().restore()
    expect(s().status).toBe('session-unverified')
    expect(s().unverifiedReason).toBe('server')
    expect(s().token).toBe('live-token')
  })

  it('فشل قراءة SecureStore → session-unverified/store (لا ادعاء زوّارية)', async () => {
    h.storedToken = 'live-token'
    h.bootShouldThrow = true
    await s().restore()
    expect(s().status).toBe('session-unverified')
    expect(s().unverifiedReason).toBe('store')
    expect(h.fetchMeCalls).toBe(0)
  })

  it('retryRestore بعد الانقطاع: loading ثم موثّق عند عودة الاتصال', async () => {
    h.storedToken = 'live-token'
    h.meResponse = async () => {
      throw new h.MockNetworkError()
    }
    await s().restore()
    expect(s().status).toBe('session-unverified')
    // عاد الاتصال:
    h.meResponse = async () => ({ user, memberships: [memberships[0]] })
    const p = s().retryRestore()
    expect(s().status).toBe('loading')
    await p
    expect(s().status).toBe('authenticated')
    expect(s().unverifiedReason).toBeNull()
  })
})

describe('موت الجلسة الحقيقي يبقى صارمًا', () => {
  beforeEach(resetWorld)

  it('401 من /me → unauthenticated (توكن منتهٍ/ملغى)', async () => {
    h.storedToken = 'dead-token'
    h.meResponse = async () => {
      throw new h.MockApiError(401, null)
    }
    await s().restore()
    expect(s().status).toBe('unauthenticated')
    expect(s().token).toBeNull()
    expect(s().unverifiedReason).toBeNull()
  })

  it('إبطال بعيد (401 في نداء موثّق لاحق عبر المعالِج المركزي) → إسقاط كامل', async () => {
    h.storedToken = 'live-token'
    await s().restore()
    expect(s().status).toBe('authenticated')
    // المعالِج سُجِّل عند تحميل الوحدة (محاكاة 401 في أي نداء تاجر):
    expect(h.unauthorizedHandler).toBeTypeOf('function')
    h.unauthorizedHandler!()
    expect(s().status).toBe('unauthenticated')
    expect(s().token).toBeNull()
    expect(removeQueries).toHaveBeenCalled()
  })
})

describe('الدخول والخروج واختيار المتجر', () => {
  beforeEach(resetWorld)

  it('login: عضوية واحدة → موثّق ومختار تلقائيًا وتوكن جديد', async () => {
    h.loginResponse = async () => ({ token: 'fresh-token', user, memberships: [memberships[0]] })
    await s().login('merchant@example.com', 'pw')
    expect(s().status).toBe('authenticated')
    expect(s().token).toBe('fresh-token')
    expect(s().selectedBusinessId).toBe('b1')
    expect(h.loginCalls).toBe(1)
  })

  it('login: عضويات متعددة + محفوظ صالح → يُحترم المحفوظ', async () => {
    h.storage.set('smartorder.merchant_business_v1', 'b2')
    await s().login('merchant@example.com', 'pw')
    expect(s().selectedBusinessId).toBe('b2')
  })

  it('login يمحو أي سبب تعثّر سابق', async () => {
    h.storedToken = 'live-token'
    h.meResponse = async () => {
      throw new h.MockNetworkError()
    }
    await s().restore()
    expect(s().unverifiedReason).toBe('network')
    await s().login('merchant@example.com', 'pw')
    expect(s().unverifiedReason).toBeNull()
    expect(s().status).toBe('authenticated')
  })

  it('logout → زائر والتوكن المحلي مُمحى (إبطال الجهاز)', async () => {
    h.storedToken = 'live-token'
    await s().restore()
    expect(s().status).toBe('authenticated')
    await s().logout()
    expect(s().status).toBe('unauthenticated')
    expect(s().token).toBeNull()
    expect(h.logoutCalls).toBe(1)
    expect(h.storedToken).toBeNull()
  })

  it('selectBusiness: صالح → يُثبّت ويُحفظ؛ باطل → يُتجاهل', async () => {
    h.storedToken = 'live-token'
    await s().restore()
    s().selectBusiness('b2')
    expect(s().selectedBusinessId).toBe('b2')
    expect(h.storage.get('smartorder.merchant_business_v1')).toBe('b2')
    s().selectBusiness('someone-elses')
    expect(s().selectedBusinessId).toBe('b2')
  })
})
