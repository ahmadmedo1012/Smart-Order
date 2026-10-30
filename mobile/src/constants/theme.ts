/**
 * Smart Order Mobile — توكنات التصميم (النحاس على الورق).
 *
 * القيم منقولة حرفيًا من نظام تصميم الويب (src/app/globals.css —
 * الهوية النهارية الافتراضية للمتجر): ورق #F7F7F4، حبر فولاذي
 * #1B2A41، نحاس #D14900 أساسيًا، وخط شعر #E2E2DC. عائلات الحالة
 * (mint/sky/yellow/rose/grey/copper) بنفس قيم --c-*-bg/-ink/-deep
 * النهارية — الطوابع تتكلم لغة الويب نفسها.
 *
 * الخط: IBM Plex Sans Arabic 400/500/600/700 — نفس وجه العلامة
 * الذي يستضيفه الويب ذاتيًا.
 */

export interface ThemeColors {
  background: string
  surface: string
  card: string
  foreground: string
  muted: string
  mutedFg: string
  primary: string
  primaryFg: string
  primaryPressed: string
  border: string
  ring: string
  goldSoft: string
  success: string
  destructive: string
  scrim: string
}

/** الهوية النهارية (الورق) — مطابقة للويب الافتراضي. */
export const paper: ThemeColors = {
  background: '#F7F7F4',
  surface: '#EFEFEA',
  card: '#FFFFFF',
  foreground: '#1B2A41',
  muted: '#EFEFEA',
  mutedFg: '#4E5A6E',
  primary: '#D14900',
  primaryFg: '#FFFFFF',
  primaryPressed: '#8F3A00',
  border: '#E2E2DC',
  ring: '#8A3400',
  goldSoft: '#FCF1CD',
  success: '#1E7A46',
  destructive: '#C4384A',
  scrim: 'rgba(27, 42, 65, 0.40)',
}

export const t = paper

/** عائلات طوابع الحالة — نفس خريطة status-badges للويب. */
export interface StatusFamily {
  bg: string
  ink: string
  deep: string
}

export const statusFamily: Record<string, StatusFamily> = {
  copper: { bg: '#FCE3D6', ink: '#D14900', deep: '#8A3400' },
  sky: { bg: '#DFE9F0', ink: '#3E5C76', deep: '#2A3E52' },
  yellow: { bg: '#FCF1CD', ink: '#B45309', deep: '#6B4C0B' },
  mint: { bg: '#DCF0E4', ink: '#1E7A46', deep: '#14522D' },
  grey: { bg: '#ECEDE7', ink: '#6E7684', deep: '#2F3745' },
  rose: { bg: '#FBE3E6', ink: '#C4384A', deep: '#8C2733' },
}

/** سلّم الأنصاف (نفس سلّم الويب 6-28 + الدوائر). */
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const
