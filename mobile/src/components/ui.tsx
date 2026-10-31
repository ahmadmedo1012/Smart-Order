/**
 * Smart Order Mobile — عناصر UI أولية (زر/حقل input/شريحة/طابع حالة).
 *
 * لغة الويب نفسها (r152 «ضوء النهار التشغيلي»): برتقالي التوصيل
 * أساسيًا بحبر فولاذي نهارًا والبرتقالي المضيء بحبر داكن ليلًا، خط
 * شعر، طوابع مربعة (radius.stamp = 8 — rounded-sm للويب). الألوان
 * كلها عبر useTheme — لا لون مثبّت. الشريحة النشطة تتحول إلى طابع
 * copper مربّع (نفس رقائق التصفية على الويب)، والضغط على الزر
 * الأساسي ينزل إلى درجة primaryPressed.
 */
import React from 'react'
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import { fonts, radius } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { ORDER_STATUS_AR, type OrderStatus } from '@/types/storefront'

/* ── زر أساسي (برتقالي التوصيل) ──────────────────────────────── */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'ghost' | 'outline'
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const { t } = useTheme()
  const bg = variant === 'primary' ? t.primary : variant === 'outline' ? t.card : 'transparent'
  const fg = variant === 'primary' ? t.primaryFg : t.primary
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed && variant !== 'primary' ? 0.82 : 1 },
        pressed && variant === 'primary' && { backgroundColor: t.primaryPressed },
        variant === 'outline' && { borderWidth: 1, borderColor: t.primary },
        style,
      ]}
    >
      <Text style={[s.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  )
}

/* ── حقل إدخال ────────────────────────────────────────────────── */
export function Field({
  label,
  error,
  ...inputProps
}: TextInputProps & { label: string; error?: string | null }) {
  const { t } = useTheme()
  return (
    <View style={s.fieldWrap}>
      <Text style={[s.fieldLabel, { color: t.foreground }]}>{label}</Text>
      <TextInput
        placeholderTextColor={t.mutedFg}
        {...inputProps}
        style={[s.input, { backgroundColor: t.card, color: t.foreground, borderColor: error ? t.destructive : t.border }]}
      />
      {error ? <Text style={[s.fieldError, { color: t.destructive }]}>{error}</Text> : null}
    </View>
  )
}

/* ── شريحة تصنيف — النشطة طابع copper مربّع (لغة رقائق الويب) ── */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  const { t, statusFamily } = useTheme()
  const fam = statusFamily.copper
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        { backgroundColor: t.card, borderColor: t.border },
        active && {
          backgroundColor: fam.bg,
          borderColor: `${fam.ink}59`,
          borderRadius: radius.stamp,
        },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[s.chipText, { color: active ? fam.deep : t.mutedFg }]}>{label}</Text>
    </Pressable>
  )
}

/* ── طابع حالة الطلب — طوابع الويب المربعة (rounded-sm) ─────── */
export function StatusStamp({ status, size = 'md' }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  const { statusFamily } = useTheme()
  const fam = statusFamily[
    status === 'NEW' || status === 'READY'
      ? 'copper'
      : status === 'CONFIRMED' || status === 'OUT_FOR_DELIVERY'
        ? 'sky'
        : status === 'PREPARING'
          ? 'yellow'
          : status === 'DELIVERED'
            ? 'mint'
            : status === 'REJECTED'
              ? 'rose'
              : 'grey'
  ]
  return (
    <View
      accessibilityRole="text"
      style={[
        s.stamp,
        {
          backgroundColor: fam.bg,
          borderColor: `${fam.ink}59`,
          paddingVertical: size === 'sm' ? 3 : 5,
          paddingHorizontal: size === 'sm' ? 8 : 12,
        },
      ]}
    >
      <View style={[s.stampDot, { backgroundColor: fam.ink }]} />
      <Text style={[s.stampText, { color: fam.deep }]}>{ORDER_STATUS_AR[status]}</Text>
    </View>
  )
}

/* ── فاصل شعري مسمّى ──────────────────────────────────────────── */
export function Hairline() {
  const { t } = useTheme()
  return <View style={[s.hairline, { backgroundColor: t.border }]} />
}

/* ── مفتاح تبديل (متاح/مميز/مفعّل) — Switch أصلي بلغة العلامة ──── */
export function Toggle({
  value,
  onValueChange,
  disabled,
  label,
}: {
  value: boolean
  onValueChange: (next: boolean) => void
  disabled?: boolean
  label: string
}) {
  const { t } = useTheme()
  return (
    <View style={s.toggleRow}>
      <Text style={[s.toggleLabel, { color: t.foreground }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled: !!disabled }}
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: t.border, true: t.primary }}
        thumbColor={t.card}
      />
    </View>
  )
}

/** سطر طابع صغير (متاح/مميز/معطلة…) — عائلات حالة الويب نفسها. */
export function MiniStamp({
  text,
  family,
}: {
  text: string
  family: 'copper' | 'sky' | 'yellow' | 'mint' | 'grey' | 'rose'
}) {
  const { statusFamily } = useTheme()
  const fam = statusFamily[family]
  return (
    <View
      accessibilityRole="text"
      style={[s.miniStamp, { backgroundColor: fam.bg, borderColor: `${fam.ink}59` }]}
    >
      <Text style={[s.miniStampText, { color: fam.deep }]}>{text}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  fieldWrap: { gap: 6 },
  fieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 46,
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlign: 'right',
  },
  fieldError: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.stamp,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  stampDot: { width: 6, height: 6, borderRadius: 3 },
  stampText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 18,
  },
  hairline: { height: 1 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 4,
  },
  toggleLabel: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    flex: 1,
  },
  miniStamp: {
    borderRadius: radius.stamp,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  miniStampText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 16,
  },
})
