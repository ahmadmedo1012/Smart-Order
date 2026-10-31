/**
 * Smart Order Mobile — تخطيط منطقة التاجر (P36 Phase C).
 *
 * مجموعة مسارات مستقلة (/merchant/*): رحلة الزائر في جذر التطبيق لا
 * تعرف عنها شيئًا. البوابة هنا: أي شاشة تاجر غير شاشة الدخول تتطلب
 * جلسة موثّقة — موت التوكن (401 في أي نداء) يهبط بالمنطقة كلها إلى
 * الدخول مركزيًا من هذه البوابة.
 *
 * P38 Phase D — session-unverified: تعثّر التحقق (انقطاع شبكة/خادم 5xx/
 * خزنة غير مقروءة) ليس موت جلسة. التوكن ما زال في SecureStore، فبدل
 * إنزال التاجر إلى شاشة الدخول نعرض حالة قابلة للاستعادة بإعادة
 * المحاولة — لحظة انقطاع لا تُعامل ككلمة مرور خاطئة ولا كجلسة ملغاة.
 */
import React, { useEffect } from 'react'
import { View } from 'react-native'
import { Stack, usePathname, router } from 'expo-router'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/state/auth'
import { ErrorState, LoadingState } from '@/components/state-views'
import { ToastHost } from '@/components/toast'

/** رسالة سبب تعثّر التحقق — بنبرة المنتج، مع دلالة أن الجلسة محفوظة. */
const UNVERIFIED_MESSAGES = {
  network: 'تعذّر التحقق من جلستك — لا اتصال بالخادم. جلستك محفوظة على هذا الجهاز؛ أعد المحاولة عند عودة الاتصال.',
  server: 'تعثّر الخادم أثناء التحقق من جلستك. جلستك محفوظة على هذا الجهاز؛ أعد المحاولة بعد لحظات.',
  store: 'تعذّر قراءة بيانات الجلسة من التخزين الآمن. أعد المحاولة؛ إن تكرر الأمر أعد تشغيل التطبيق.',
} as const

export default function MerchantLayout() {
  const { t } = useTheme()

  const pathname = usePathname()
  const status = useAuthStore((s) => s.status)
  const unverifiedReason = useAuthStore((s) => s.unverifiedReason)

  // استرجاع الجلسة عند دخول المنطقة (يُنجَّد أيضًا عند إقلاع التطبيق —
  // نداء واحد مشترك، وبلا توكن لا يحدث أي نداء شبكي).
  useEffect(() => {
    if (status === 'loading') void useAuthStore.getState().restore()
  }, [status])

  const isLogin = pathname === '/merchant/login'

  // الجلسة ماتت أو لم توجد → كل مسارات التاجر تنزل إلى الدخول.
  // (session-unverified مقصود خارج هذا الفرع: ليس موت جلسة.)
  useEffect(() => {
    if (!isLogin && status === 'unauthenticated') {
      router.replace('/merchant/login')
    }
  }, [isLogin, status])

  // التعثّر مؤقت والجلسة محفوظة → استعادة بمحاولة جديدة، لا إسقاط.
  if (!isLogin && status === 'session-unverified') {
    const message =
      UNVERIFIED_MESSAGES[unverifiedReason ?? 'network'] ?? UNVERIFIED_MESSAGES.network
    return (
      <ErrorState
        message={message}
        onRetry={() => {
          void useAuthStore.getState().retryRestore()
        }}
      />
    )
  }

  if (!isLogin && status !== 'authenticated') {
    return <LoadingState label="جارٍ تجهيز لوحة التاجر…" />
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.background },
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="business" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="order/[id]" />
        <Stack.Screen name="manage/index" />
        <Stack.Screen name="manage/products" />
        <Stack.Screen name="manage/product/[id]" />
        <Stack.Screen name="manage/categories" />
        <Stack.Screen name="manage/delivery-zones" />
        <Stack.Screen name="manage/payment-methods" />
        <Stack.Screen name="manage/settings" />
        <Stack.Screen name="manage/customers" />
        <Stack.Screen name="manage/customer/[id]" />
        <Stack.Screen name="manage/staff" />
        <Stack.Screen name="manage/reports" />
      </Stack>
      {/* إشعارات النجاح العابرة لكل شاشات التاجر */}
      <ToastHost />
    </View>
  )
}
