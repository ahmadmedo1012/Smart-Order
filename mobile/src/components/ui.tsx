/**
 * Smart Order Mobile — عناصر UI أولية (زر/حقل input/شريحة/طابع حالة).
 *
 * لغة الويب نفسها: نحاس أساسي، حبر فولاذي، خط شعر #E2E2DC، أنصاف
 * 6-20، ودرجة ضغط #8F3A00. الحقول ترتكز على بطاقة بيضاء بأرض
 * الورق — نفس تسلسل surfaces للمتجر الحيّ.
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
import { statusFamily, t } from '@/constants/theme'
import { ORDER_STATUS_AR, type OrderStatus } from '@/types/storefront'

/* ── زر أساسي (نحاس) ──────────────────────────────────────────── */
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
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.82 : 1 },
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
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={t.mutedFg}
        {...inputProps}
        style={[s.input, !!error && { borderColor: t.destructive }]}
      />
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </View>
  )
}

/* ── شريحة تصنيف ──────────────────────────────────────────────── */
export function Chip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        s.chip,
        active && { backgroundColor: t.primary, borderColor: t.primary },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[s.chipText, active && { color: t.primaryFg }]}>{label}</Text>
    </Pressable>
  )
}

/* ── طابع حالة الطلب — لغة الطوابع في الويب ───────────────────── */
export function StatusStamp({ status, size = 'md' }: { status: OrderStatus; size?: 'sm' | 'md' }) {
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
  return <View style={s.hairline} />
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
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled: !!disabled }}
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: t.border, true: t.primary }}
        thumbColor="#FFFFFF"
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
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 15,
  },
  fieldWrap: { gap: 6 },
  fieldLabel: {
    color: t.foreground,
    fontFamily: 'IBMPlexSansArabic_500Medium',
    fontSize: 13,
  },
  input: {
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 46,
    color: t.foreground,
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 15,
    textAlign: 'right',
  },
  fieldError: {
    color: t.destructive,
    fontFamily: 'IBMPlexSansArabic_400Regular',
    fontSize: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  chipText: {
    color: t.mutedFg,
    fontFamily: 'IBMPlexSansArabic_500Medium',
    fontSize: 13,
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  stampDot: { width: 6, height: 6, borderRadius: 3 },
  stampText: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 12,
    lineHeight: 18,
  },
  hairline: { height: 1, backgroundColor: t.border },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 4,
  },
  toggleLabel: {
    color: t.foreground,
    fontFamily: 'IBMPlexSansArabic_500Medium',
    fontSize: 13.5,
    flex: 1,
  },
  miniStamp: {
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  miniStampText: {
    fontFamily: 'IBMPlexSansArabic_600SemiBold',
    fontSize: 11,
    lineHeight: 16,
  },
})
