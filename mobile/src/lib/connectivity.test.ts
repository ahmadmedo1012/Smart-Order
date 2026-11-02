/**
 * Smart Order Mobile — اختبار حالة الاتصال النقية (P42-W5، GAP-SO-3).
 *
 * العقد هنا نقي عمدًا (لا NetInfo ولا react-native — نفس درس
 * plan-gates.ts): جدول حقيقة isOnlineSnapshot (قاعدة العائلة من
 * Smart-Menu: متصل = isConnected صراحةً true و isInternetReachable ليست
 * false صراحةً — null غير معروف يُعامل تفاؤلًا حتى أول حدث) وسلوك
 * المخزن الصغير (useSyncExternalStore: بلا تغيير لا إيقاظ، وبالقيمة
 * نفسها لا تسريب). الاشتراك الحقيقي في NetInfo يُغطى بتثبيت المصدر
 * في skeleton-wiring.test.ts — بيئة node لا تحتمل الوحدة الأصلية.
 */
import { describe, expect, it, vi } from 'vitest'
import { createOnlineStore, isOnlineSnapshot } from './connectivity'

/* ── جدول الحقيقة: متى نعلن الانقطاع؟ ──────────────────────────── */

describe('isOnlineSnapshot: قاعدة العائلة (تفاؤل حتى أول حدث صريح)', () => {
  it('متصل ومتاح الإنترنت → متصل', () => {
    expect(isOnlineSnapshot({ isConnected: true, isInternetReachable: true })).toBe(true)
  })

  it('متصل والوصول غير معروف (null) → متصل (لا لافتة كاذبة عند الإقلاع)', () => {
    expect(isOnlineSnapshot({ isConnected: true, isInternetReachable: null })).toBe(true)
  })

  it('متصل والوصول صراحةً false → مقطوع (لا إنترنت خلف شبكة موصولة)', () => {
    expect(isOnlineSnapshot({ isConnected: true, isInternetReachable: false })).toBe(false)
  })

  it('isConnected صراحةً false → مقطوع (أي قيمة للوصول)', () => {
    expect(isOnlineSnapshot({ isConnected: false, isInternetReachable: null })).toBe(false)
    expect(isOnlineSnapshot({ isConnected: false, isInternetReachable: true })).toBe(false)
  })

  it('isConnected غير معروف (null) → مقطوع (لا نفترض اتصالًا بلا دليل)', () => {
    expect(isOnlineSnapshot({ isConnected: null, isInternetReachable: true })).toBe(false)
    expect(isOnlineSnapshot({ isConnected: null, isInternetReachable: null })).toBe(false)
  })

  it('لا لقطة أصلًا (قبل أول حدث NetInfo) → مقطوع عند من يسأل صراحةً', () => {
    // المخزن المفرد يقلع متفائلًا (true) — هذا الحكم للأداة الخام فقط.
    expect(isOnlineSnapshot(null)).toBe(false)
  })
})

/* ── المخزن الصغير: عقد useSyncExternalStore ───────────────────── */

describe('createOnlineStore: مخزن خارجي صغير', () => {
  it('يقلع على القيمة الأولية', () => {
    expect(createOnlineStore(true).getSnapshot()).toBe(true)
    expect(createOnlineStore(false).getSnapshot()).toBe(false)
  })

  it('setOnline يغيّر القيمة ويوقظ المشتركين', () => {
    const store = createOnlineStore(true)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.setOnline(false)
    expect(store.getSnapshot()).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
  })

  it('القيمة نفسها لا توقظ أحدًا (لا وميض لافتة)', () => {
    const store = createOnlineStore(true)
    const listener = vi.fn()
    store.subscribe(listener)

    store.setOnline(true)
    store.setOnline(true)
    expect(listener).not.toHaveBeenCalled()
  })

  it('إلغاء الاشتراك يوقف الإيقاظ', () => {
    const store = createOnlineStore(true)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    unsubscribe()
    store.setOnline(false)
    expect(listener).not.toHaveBeenCalled()
  })

  it('عدة مشتركين — كلهم يسمعون الانتقال نفسه مرة', () => {
    const store = createOnlineStore(true)
    const a = vi.fn()
    const b = vi.fn()
    store.subscribe(a)
    store.subscribe(b)

    store.setOnline(false)
    store.setOnline(true)
    expect(a).toHaveBeenCalledTimes(2)
    expect(b).toHaveBeenCalledTimes(2)
  })
})
