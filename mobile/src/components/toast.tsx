/**
 * Smart Order Mobile — إشعارات نجاح عابرة (toast) لمنطقة التاجر.
 *
 * بلا مكتبات: مشتركو وحدة صغيرون + مُضيف واحد (ToastHost) يُركَّب مرة
 * واحدة في تخطيط التاجر. showToast يعرض رسالة خضراء (mint — عائلة
 * نجاح الويب) تختفي وحدها بعد 2.4 ثانية؛ رسالة جديدة تحل مكان القديمة
 * فورًا. الأخطاء تبقى Alert.alert كما في C2-CORE — الإشعار العابر
 * لتأكيد النجاح فقط (تم الحفظ/تمت الأرشفة…).
 */
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { statusFamily } from '@/constants/theme'

const TOAST_MS = 2400

type Listener = (message: string) => void
const listeners = new Set<Listener>()

let hideTimer: ReturnType<typeof setTimeout> | null = null

/** أظهر إشعار نجاح عابرًا (يحل محل أي إشعار قائم). */
export function showToast(message: string): void {
  if (hideTimer) clearTimeout(hideTimer)
  listeners.forEach((fn) => {
    fn(message)
  })
  hideTimer = setTimeout(() => {
    listeners.forEach((fn) => {
      fn('')
    })
  }, TOAST_MS)
}

/** مُضيف الإشعارات — يُركَّب مرة واحدة فوق محتوى المنطقة. */
export function ToastHost() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fn: Listener = (msg) => setMessage(msg)
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }, [])

  if (!message) return null
  return (
    <View pointerEvents="none" style={s.wrap}>
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="text"
        style={[s.toast, { backgroundColor: statusFamily.mint.bg, borderColor: `${statusFamily.mint.ink}59` }]}
      >
        <Text style={[s.text, { color: statusFamily.mint.deep }]}>{message}</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 28,
    start: 16,
    end: 16,
    alignItems: 'center',
  },
  toast: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 18,
    maxWidth: '100%',
  },
  text: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },
})
