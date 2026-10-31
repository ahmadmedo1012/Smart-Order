/**
 * Smart Order Mobile — تخطيط منطقة التاجر (P36 Phase C).
 *
 * مجموعة مسارات مستقلة (/merchant/*): رحلة الزائر في جذر التطبيق لا
 * تعرف عنها شيئًا. البوابة هنا: أي شاشة تاجر غير شاشة الدخول تتطلب
 * جلسة موثّقة — موت التوكن (401 في أي نداء) يهبط بالمنطقة كلها إلى
 * الدخول مركزيًا من هذه البوابة.
 */
import React, { useEffect } from 'react'
import { Stack, usePathname, router } from 'expo-router'
import { t } from '@/constants/theme'
import { useAuthStore } from '@/state/auth'
import { LoadingState } from '@/components/state-views'

export default function MerchantLayout() {
  const pathname = usePathname()
  const status = useAuthStore((s) => s.status)

  // استرجاع الجلسة عند دخول المنطقة (يُنجَّد أيضًا عند إقلاع التطبيق —
  // نداء واحد مشترك، وبلا توكن لا يحدث أي نداء شبكي).
  useEffect(() => {
    if (status === 'loading') void useAuthStore.getState().restore()
  }, [status])

  const isLogin = pathname === '/merchant/login'

  // الجلسة ماتت أو لم توجد → كل مسارات التاجر تنزل إلى الدخول.
  useEffect(() => {
    if (!isLogin && status === 'unauthenticated') {
      router.replace('/merchant/login')
    }
  }, [isLogin, status])

  if (!isLogin && status !== 'authenticated') {
    return <LoadingState label="جارٍ تجهيز لوحة التاجر…" />
  }

  return (
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
    </Stack>
  )
}
