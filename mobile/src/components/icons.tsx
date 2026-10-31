/**
 * Smart Order Mobile — أيقونات SVG (react-native-svg) بوزن 1.75
 * وزوايا مستديرة — نفس نبرة lucide في الويب بلا مكتبة إضافية.
 */
import React from 'react'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

export type IconProps = { size?: number; color?: string }

/** عملات متراكبة (lucide coins) — لبطاقات طرق الدفع. */
export function CoinsIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="8" cy="8" r="6" />
      <Path d="M18.09 10.37A6 6 0 1110.34 18" />
      <Path d="M7 6h1v4" />
      <Path d="M16.71 13.88l.7.71-2.82 2.82" />
    </Svg>
  )
}

export function StoreIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l1.5-5h15L21 9" />
      <Path d="M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9" />
      <Path d="M9 20v-6h6v6" />
    </Svg>
  )
}

export function CartIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9} cy={20} r={1.4} />
      <Circle cx={17} cy={20} r={1.4} />
      <Path d="M3 3h2l2.4 12.2a1 1 0 001 .8h9.7a1 1 0 001-.8L21 7H6" />
    </Svg>
  )
}

export function PlusIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function MinusIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M5 12h14" />
    </Svg>
  )
}

export function SearchIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20l-3.2-3.2" />
    </Svg>
  )
}

export function TruckIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={1} y={6} width={13} height={11} rx={1} />
      <Path d="M14 9h4l3 3.5V17a1 1 0 01-1 1h-2" />
      <Circle cx={6} cy={18.5} r={1.6} />
      <Circle cx={17} cy={18.5} r={1.6} />
    </Svg>
  )
}

export function CheckCircleIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M8.5 12.5l2.5 2.5 4.5-5.5" />
    </Svg>
  )
}

export function WhatsappIcon({ size = 24, color = '#25D366' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.03c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 01-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.55-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.8-.23-.09-.4-.12-.56.12-.17.25-.64.8-.78.97-.15.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
    </Svg>
  )
}

export function ClockIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7v5l3 3" />
    </Svg>
  )
}

/* ── أيقونات لوحة التاجر (P36) — نفس الوزن 1.75 ─────────────────── */

/** أعمدة بيانية (lucide bar-chart-3) — لوحة القيادة وبطاقة الدخول. */
export function ChartIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 3v18h18" />
      <Path d="M18 17V9" />
      <Path d="M13 17V5" />
      <Path d="M8 17v-3" />
    </Svg>
  )
}

/** فاتورة طلب (lucide receipt) — صندوق الطلبات. */
export function ReceiptIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
      <Path d="M8 7h8" />
      <Path d="M8 11h8" />
      <Path d="M8 15h5" />
    </Svg>
  )
}

/** مستخدم (lucide user) — تبويب المزيد. */
export function UserIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={8} r={5} />
      <Path d="M20 21a8 8 0 0 0-16 0" />
    </Svg>
  )
}

/** دبوس موقع (lucide map-pin) — بيانات التوصيل. */
export function MapPinIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <Circle cx={12} cy={10} r={3} />
    </Svg>
  )
}

/** هاتف (lucide phone) — بيانات العميل. */
export function PhoneIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </Svg>
  )
}

/** جهاز جوال (lucide smartphone) — قائمة الأجهزة. */
export function SmartphoneIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={5} y={2} width={14} height={20} rx={2} />
      <Path d="M12 18h.01" />
    </Svg>
  )
}

/** خروج (lucide log-out) — تسجيل الخروج. */
export function LogOutIcon({ size = 24, color = 'currentColor' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Path d="m16 17 5-5-5-5" />
      <Path d="M21 12H9" />
    </Svg>
  )
}
