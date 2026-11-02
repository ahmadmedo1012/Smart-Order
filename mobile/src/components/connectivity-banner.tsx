/**
 * Smart Order Mobile — لافتة الاتصال العالمية (P42-W5، GAP-SO-3).
 *
 * مرآة عائلة الويب (شريط WifiOff في tracking-client) بنبرة التطبيق:
 * شريط أعلى الشاشة يظهر فقط عند انقطاع إنترنت الجهاز (NetInfo)، بلغة
 * عائلة rose (الحقيقة الصادقة: لا ادعاء حفظٍ أثناء الانقطاع، ولا
 * خلطها بمرادف «الخادم تعثّر» — تعثّر الخادم حالة خطأ على السطح نفسه).
 *
 * الأسلاك الثلاثة في مكون واحد يُركَّب مرة من جذر التخطيط:
 *   1. NetInfo.addEventListener → isOnlineSnapshot → المخزن المفرد
 *      (كل مستهلك قادم يقرأ بلا وحدة أصلية إضافية).
 *   2. onlineManager.setOnline (react-query): عند العودة تُستأنف
 *      الطفرات المتوقفة وتُعاد جلبات الاستعلامات الراكدة تلقائيًا
 *      (سلوك queryClient المشترك في onlineManager — من مصدر
 *      query-core: onOnline يفحص shouldFetchOnReconnect ويكمل
 *      الجلبات المتوقفة). NetInfo وحدة أصلية — هذا الملف لا يُستورد
 *      في اختبارات node أبدًا؛ المنطق النقي في lib/connectivity.ts.
 *   3. إعلانات قارئ الشاشة عند الانتقالين (انقطع/عاد) عبر
 *      announceForAccessibility — نفس نمط العائلة.
 *
 * الأمان التشغيلي: السلة حالة محلية لا يلمسها الانقطاع (cart.tsx لا
 * يستمع للشبكة)، وcreateOrder يفشل بصوت (Alert + مفتاح idempotency
 * ثابت لإعادة المحاولة) — لا شيء يُفقد بصمت.
 */
import React, { useEffect, useRef, useSyncExternalStore } from 'react'
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { onlineManager } from '@tanstack/react-query'
import { fonts } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { isOnlineSnapshot, onlineStore } from '@/lib/connectivity'
import { WifiOffIcon } from '@/components/icons'

/** قراءة حالة الاتصال — مشترك واحد على NetInfo، وكل مستهلك هنا. */
export function useOnline(): boolean {
  return useSyncExternalStore(onlineStore.subscribe, onlineStore.getSnapshot, onlineStore.getSnapshot)
}

/**
 * اللافتة العالمية — تُركَّب مرة في جذر التخطيط. تحمل اشتراك NetInfo
 * (مصدر الحقيقة الوحيد) وتربطه بالمخزن وonlineManager، وتعلن
 * الانتقالين لقارئ الشاشة.
 */
export function ConnectivityBanner() {
  const { statusFamily } = useTheme()
  const online = useOnline()
  const prev = useRef(online)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const next = isOnlineSnapshot({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
      })
      onlineStore.setOnline(next)
      // ربط react-query: العودة للاتصال تستأنف وتعيد الجلب تلقائيًا.
      onlineManager.setOnline(next)
    })
    return unsubscribe
  }, [])

  // إعلان الانتقالين — قارئ الشاشة يعرف أن الانقطاع حصل وأنه انتهى.
  useEffect(() => {
    if (prev.current === online) return
    prev.current = online
    AccessibilityInfo.announceForAccessibility(
      online ? 'عاد الاتصال بالإنترنت' : 'انقطع الاتصال بالإنترنت',
    )
  }, [online])

  if (online) return null

  const fam = statusFamily.rose
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        s.banner,
        { backgroundColor: fam.bg, borderBottomColor: `${fam.ink}59` },
      ]}
    >
      <WifiOffIcon size={15} color={fam.ink} />
      <Text style={[s.text, { color: fam.deep }]}>
        لا يوجد اتصال بالإنترنت — تحقق من شبكتك
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    minHeight: 32,
  },
  text: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 18,
  },
})
