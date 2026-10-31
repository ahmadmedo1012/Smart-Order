/**
 * Smart Order Mobile — مزوّد الوضع اللوني (P36).
 *
 * «داكن» هو الافتراضي — توافق حرفي مع الويب (next-themes
 * defaultTheme="dark"؛ النهاري اختيار صريح). الخيار يُخزَّن في
 * AsyncStorage (ليس سرًّا) ويبقى عبر إعادة التشغيل. الحالة
 * (expo-status-bar) وشريط تنقّل أندرويد (expo-navigation-bar)
 * يتبعان الوضع. الشاشات تستهلك useTheme() — لا استيراد ثابت
 * للألوان.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { StatusBar } from 'expo-status-bar'
import { NavigationBar } from 'expo-navigation-bar'
import {
  daylight,
  night,
  statusFamilies,
  type StatusFamily,
  type ThemeColors,
  type ThemeName,
} from '@/constants/theme'

/** مفتاح التخزين — اختيار الوضع ليس بيانات حساسة. */
const THEME_STORAGE_KEY = 'smart-order.theme'

export interface ThemeContextValue {
  name: ThemeName
  /** توكنات الألوان للوضع الحالي (الأسماء نفسها التي تعرفها الشاشات). */
  t: ThemeColors
  /** عائلات طوابع الحالة للوضع الحالي. */
  statusFamily: Record<string, StatusFamily>
  setTheme: (name: ThemeName) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // الافتراضي داكن — الويب يقلع داكنًا، والقراءة المحفوظة تصل لاحقًا.
  const [name, setName] = useState<ThemeName>('dark')

  // استرجاع الخيار المحفوظ (بلا تعطيل — الفشل يُسكت ويبقى الداكن).
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') setName(stored)
      })
      .catch(() => undefined)
  }, [])

  const setTheme = useCallback((next: ThemeName) => {
    setName(next)
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => undefined)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      name,
      t: name === 'dark' ? night : daylight,
      statusFamily: statusFamilies[name],
      setTheme,
    }),
    [name, setTheme],
  )

  return (
    <ThemeContext.Provider value={value}>
      {/* الحالة وشريط تنقّل أندرويد يتبعان الوضع — bar داكن بأيقونات
          فاتحة ليلًا وفاتح بأيقونات داكنة نهارًا (SDK 58 edge-to-edge:
          التحوّل تصريحي، لا-op على iOS/web). */}
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <NavigationBar style={name} />
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
