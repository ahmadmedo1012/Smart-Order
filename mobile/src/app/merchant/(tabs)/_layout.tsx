/**
 * Smart Order Mobile — تبويبات التاجر السفلية (P36 Phase C).
 *
 * الطلبات · لوحة القيادة · المزيد — بنفس لغة التطبيق (ورق/نحاس/
 * IBM Plex Sans Arabic). البوابة هنا تكمّل بوابة المنطقة: جلسة
 * موثّقة بلا متجر مختار تنزل إلى شاشة الاختيار (المتجر الوحيد
 * يُختار تلقائيًا).
 */
import React, { useEffect } from 'react'
import { Tabs, router } from 'expo-router'
import { t } from '@/constants/theme'
import { useAuthStore } from '@/state/auth'
import { ChartIcon, ReceiptIcon, UserIcon } from '@/components/icons'

export default function MerchantTabsLayout() {
  const status = useAuthStore((s) => s.status)
  const memberships = useAuthStore((s) => s.memberships)
  const selectedBusinessId = useAuthStore((s) => s.selectedBusinessId)

  useEffect(() => {
    if (status !== 'authenticated' || selectedBusinessId) return
    if (memberships.length === 1) {
      useAuthStore.getState().selectBusiness(memberships[0].businessId)
      return
    }
    router.replace('/merchant/business')
  }, [status, selectedBusinessId, memberships])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.mutedFg,
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontFamily: 'IBMPlexSansArabic_500Medium',
          fontSize: 11,
        },
        sceneStyle: { backgroundColor: t.background },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="orders"
        options={{
          title: 'الطلبات',
          tabBarIcon: ({ color, size }) => <ReceiptIcon size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'لوحة القيادة',
          tabBarIcon: ({ color, size }) => <ChartIcon size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'المزيد',
          tabBarIcon: ({ color, size }) => <UserIcon size={size} color={color as string} />,
        }}
      />
    </Tabs>
  )
}
