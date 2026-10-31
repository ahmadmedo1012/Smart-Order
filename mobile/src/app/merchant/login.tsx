/**
 * Smart Order Mobile — دخول التاجر (P36 Phase C).
 *
 * POST /api/mobile/auth/login → توكن جلسة جهاز (som_…) يسكن
 * SecureStore حصرًا. رحلة الزائر في التطبيق لا تتغير قيد أنملة:
 * هذه شاشة اختيارية تُفتح من بطاقة «لوحة التاجر» في الشاشة الأولى.
 */
import React, { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { fonts, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/state/auth'
import { ApiError, NetworkError } from '@/services/merchant'
import { ChartIcon } from '@/components/icons'
import { Button, Field } from '@/components/ui'

export default function MerchantLoginScreen() {
  const { t } = useTheme()
  const s = makeStyles(t)

  const status = useAuthStore((s) => s.status)
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // جلسة حيّة أصلًا → مباشرة إلى الصندوق (أو اختيار المتجر).
  useEffect(() => {
    if (status === 'authenticated') {
      const hasSelection = useAuthStore.getState().selectedBusinessId !== null
      router.replace(hasSelection ? '/merchant/orders' : '/merchant/business')
    }
  }, [status])

  const canSubmit = email.trim().length >= 3 && password.length >= 1 && !submitting

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await login(email.trim(), password)
      // الحالة صارت authenticated — التأثير أعلاه يقود التوجيه.
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof NetworkError
            ? 'تعذر الاتصال بالخادم — تحقق من الإنترنت وحاول مجددًا'
            : 'تعذر تسجيل الدخول — حاول بعد قليل'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.hero}>
            <View style={s.markWell}>
              <ChartIcon size={32} color={t.primary} />
            </View>
            <Text style={s.heroTitle}>لوحة التاجر</Text>
            <Text style={s.heroSub}>
              سجّل الدخول بحساب متجرك لإدارة الطلبات ولوحة القيادة من تطبيقك مباشرة
            </Text>
          </View>

          <View style={s.card}>
            <Field
              label="البريد الإلكتروني"
              value={email}
              onChangeText={(v) => {
                setEmail(v)
                setError(null)
              }}
              placeholder="بريد حسابك في Smart Order"
              placeholderTextColor={t.mutedFg}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              inputMode="email"
            />
            <Field
              label="كلمة المرور"
              value={password}
              onChangeText={(v) => {
                setPassword(v)
                setError(null)
              }}
              placeholder="••••••••"
              placeholderTextColor={t.mutedFg}
              secureTextEntry
              textContentType="password"
            />
            {error ? <Text style={s.error}>{error}</Text> : null}
            <Button
              label={submitting ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
              onPress={() => {
                void submit()
              }}
              disabled={!canSubmit}
            />
            <Text style={s.hint}>
              جلسة جهازك محفوظة بأمان لمدة 30 يومًا وتجدد تلقائيًا أثناء الاستخدام
            </Text>
          </View>

          <Text style={s.guestHint}>
            تبحث عن طلبك كزبون؟ ارجع للشاشة الرئيسية وافتح المتجر برمزه
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  hero: { alignItems: 'center', paddingTop: 24, paddingBottom: 8, gap: 10 },
  markWell: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: t.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: t.foreground,
  },
  heroSub: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: t.mutedFg,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 16,
    gap: 12,
  },
  error: {
    color: t.destructive,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
    textAlign: 'center',
    lineHeight: 18,
  },
  guestHint: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: t.mutedFg,
    textAlign: 'center',
    paddingVertical: 10,
    lineHeight: 20,
  },
})
