/**
 * Smart Order Mobile — توكنات التصميم (P36: «ضوء النهار التشغيلي —
 * المسار والعقدة» / Operational Daylight: Route & Node).
 *
 * منقولة حرفيًا من نظام تصميم الويب (src/app/globals.css — r152):
 *   · نهاري «الورق»: أرض #F7F7F4، سطح #EFEFEA، بطاقات بيضاء، حبر
 *     فولاذي #1B2A41، ثانوي #4E5A6E، برتقالي التوصيل #D14900 أساسيًا،
 *     مضغوط #8F3A00، عمق #8A3400، وخط شعر #E2E2DC.
 *   · ليلي «غرفة العمليات» (الافتراضي — الويب يقلع داكنًا عبر
 *     next-themes defaultTheme="dark"): أرض #0D1626، سطح #152238،
 *     سطح مرفوع #1B2A41، حبر ورقي #F1F0EA، برتقالي مضيء #FF7A38
 *     بحبر داكن #241307 فوقه (6.9:1)، ونص مميّز #FFA170.
 *   · أخضر واتساب #25D366 محجوز لواجهة واتساب نفسها حصرًا.
 *
 * عائلات طوابع الحالة (copper/sky/yellow/mint/grey/rose) بقيم
 * --c-*-bg/-ink/-deep لكل وضع — النهارية معاجين فاتحة والحبر
 * العائلي، والليلية أرضيات داكنة بحدّ عائلي مضيء.
 *
 * الخط (نفس عقد الويب fonts.css): Tajawal 400/500/700/800 صوتًا
 * أساسيًا (لا وزن 600 — طلبات 600 تحلّ على 700 الحقيقي كما في
 * الويب)، Barlow Semi Condensed 600/700 للعرض اللاتيني، وIBM Plex
 * Mono 400/500 للرموز والأرقام التشغيلية.
 */

/** أسماء الوضعين — الافتراضي «داكن» (توافق الويب). */
export type ThemeName = 'dark' | 'light'

export interface ThemeColors {
  /** أرض التطبيق — ورق #F7F7F4 نهارًا، كحلي #0D1626 ليلًا. */
  background: string
  /** سطح غارق — #EFEFEA نهارًا، #152238 ليلًا. */
  surface: string
  /** بطاقات — أبيض نهارًا، #152238 ليلًا. */
  card: string
  /** سطح مرفوع (--surface-raised) — أبيض نهارًا، #1B2A41 ليلًا. */
  raised: string
  foreground: string
  muted: string
  mutedFg: string
  /** الأساسي — برتقالي التوصيل نهارًا، البرتقالي المضيء ليلًا. */
  primary: string
  /** الحبر فوق الأساسي — أبيض نهارًا، الحبر الداكن #241307 فوق المضيء. */
  primaryFg: string
  /** درجة الضغط (--accent-pressed). */
  primaryPressed: string
  border: string
  /** حلقة التركيز/الحبر العميق كنص — #8A3400 / #FFA170. */
  ring: string
  /** نص التمييز (لهجة العمق كنص) — قيمة ring نفسها، صراحةً. */
  accentText: string
  /** الموضوعة الناعمة للأساسي (--accent-soft = عائلة copper): كانت
   *  غسلة ذهبية قديمة؛ أعيد تثبيتها على غسلة البرتقالي الناعمة. */
  goldSoft: string
  success: string
  destructive: string
  scrim: string
  /** صبغة الظل (elev) — حبر كحلي نهارًا، أسود مزرق ليلًا. */
  shadow: string
  /** غسلة فوق تعبئة الأساسي (رقاقة العدد على شريط السلة). */
  onPrimaryWash: string
}

/** الهوية النهارية «الورق» — :root في globals.css. */
export const daylight: ThemeColors = {
  background: '#F7F7F4',
  surface: '#EFEFEA',
  card: '#FFFFFF',
  raised: '#FFFFFF',
  foreground: '#1B2A41',
  muted: '#EFEFEA',
  mutedFg: '#4E5A6E',
  primary: '#D14900',
  primaryFg: '#FFFFFF',
  primaryPressed: '#8F3A00',
  border: '#E2E2DC',
  ring: '#8A3400',
  accentText: '#8A3400',
  goldSoft: '#FCE3D6',
  success: '#1E7A46',
  destructive: '#C4384A',
  scrim: 'rgba(27, 42, 65, 0.42)',
  shadow: '#1B2A41',
  onPrimaryWash: 'rgba(255, 255, 255, 0.22)',
}

/** الهوية الليلية «غرفة العمليات» — .dark في globals.css. */
export const night: ThemeColors = {
  background: '#0D1626',
  surface: '#152238',
  card: '#152238',
  raised: '#1B2A41',
  foreground: '#F1F0EA',
  muted: '#1B2A41',
  mutedFg: '#B9C2D2',
  primary: '#FF7A38',
  primaryFg: '#241307',
  primaryPressed: '#E85D10',
  border: '#24344F',
  ring: '#FFA170',
  accentText: '#FFA170',
  goldSoft: '#38200F',
  success: '#6FD99B',
  destructive: '#F4938F',
  scrim: 'rgba(4, 9, 16, 0.62)',
  shadow: '#02060E',
  onPrimaryWash: 'rgba(36, 19, 7, 0.18)',
}

/** عائلات طوابع الحالة — نفس خريطة status-badges للويب، لكل وضع. */
export interface StatusFamily {
  bg: string
  ink: string
  deep: string
}

export type StatusFamilyKey = 'copper' | 'sky' | 'yellow' | 'mint' | 'grey' | 'rose'

/** العائلات النهارية (معاجين فاتحة + حبر عائلي). */
const DAY_FAMILIES: Record<StatusFamilyKey, StatusFamily> = {
  copper: { bg: '#FCE3D6', ink: '#D14900', deep: '#8A3400' },
  sky: { bg: '#DFE9F0', ink: '#3E5C76', deep: '#2A3E52' },
  yellow: { bg: '#FCF1CD', ink: '#B45309', deep: '#6B4C0B' },
  mint: { bg: '#DCF0E4', ink: '#1E7A46', deep: '#14522D' },
  grey: { bg: '#ECEDE7', ink: '#6E7684', deep: '#2F3745' },
  rose: { bg: '#FBE3E6', ink: '#C4384A', deep: '#8C2733' },
}

/** العائلات الليلية (أرضيات داكنة + حبر مضيء). */
const NIGHT_FAMILIES: Record<StatusFamilyKey, StatusFamily> = {
  copper: { bg: '#38200F', ink: '#FF9A62', deep: '#FFC9A8' },
  sky: { bg: '#14263E', ink: '#8FBBF2', deep: '#C9DCEE' },
  yellow: { bg: '#2E2610', ink: '#F2C48D', deep: '#F8E5B5' },
  mint: { bg: '#0F2A1E', ink: '#6FD99B', deep: '#C9EAD3' },
  grey: { bg: '#1A2438', ink: '#A9B0C8', deep: '#D5DAE8' },
  rose: { bg: '#301723', ink: '#F4938F', deep: '#FACDD2' },
}

export const statusFamilies: Record<ThemeName, Record<string, StatusFamily>> = {
  light: DAY_FAMILIES,
  dark: NIGHT_FAMILIES,
}

/**
 * توكنات الخطوط — نفس عقد الويب (fonts.css r152): Tajawal الصوت
 * الأساسي (400/500/700/800 — لا 600؛ طلبات الويب للوزن 600 تُحلّ
 * على 700 الحقيقي، فتوكن «bold» = 700)، Barlow Semi Condensed
 * للعرض اللاتيني (600/700)، وPlex Mono للرموز والأرقام التشغيلية
 * (أرقام الطلبات، رموز USSD، أرقام المحافظ). المبالغ تبقى Tajawal
 * للقراءة العربية السلسة (formatLyd/formatMillimes).
 */
export const fonts = {
  /** Tajawal 400 — المتن. */
  regular: 'Tajawal_400Regular',
  /** Tajawal 500 — المتن المتوسط. */
  medium: 'Tajawal_500Medium',
  /** Tajawal 700 — العناوين والتوكيد (يحمل أيضًا دور 600 كما في الويب). */
  bold: 'Tajawal_700Bold',
  /** Tajawal 800 — العرض الثقيل. */
  black: 'Tajawal_800ExtraBold',
  /** Barlow Semi Condensed 600 — العرض اللاتيني. */
  display: 'BarlowSemiCondensed_600SemiBold',
  /** Barlow Semi Condensed 700 — العرض اللاتيني الثقيل. */
  displayBold: 'BarlowSemiCondensed_700Bold',
  /** IBM Plex Mono 400 — الرموز والأرقام التشغيلية. */
  mono: 'IBMPlexMono_400Regular',
  /** IBM Plex Mono 500 — الرموز التشغيلية المتوسطة. */
  monoMedium: 'IBMPlexMono_500Medium',
} as const

/** سلّم الأنصاف — الويب xs 6 · sm 8 · md 10 · lg 12 · xl 16 · 2xl 20؛
 * «stamp» = 8 درجة الطوابع المربعة (rounded-sm لغة الويب). */
export const radius = {
  sm: 6,
  stamp: 8,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const

/* ── جسر انتقالي (يُزال بنهاية المسح): `t` و`statusFamily` كانا
 * ثابتين وحيدتين؛ صارا كائنين حيّين يحلّان على الوضع النشط كي
 * تبقى الشاشات غير المهاجرة بعد صحيحة الإقلاع الداكن. الشاشات
 * المهاجرة تستهلك useTheme() حصرًا. ── */
let _activeName: ThemeName = 'dark'

/** يضبط الوضع الحيّ (يستدعيه ThemeProvider) — قيمة الجسر الانتقالي. */
export function setActiveTheme(name: ThemeName): void {
  _activeName = name
}

export const t: ThemeColors = new Proxy({} as ThemeColors, {
  get: (_target, key: string | symbol) => (_activeName === 'light' ? daylight : night)[key as keyof ThemeColors],
})

export const statusFamily: Record<string, StatusFamily> = new Proxy({} as Record<string, StatusFamily>, {
  get: (_target, key: string | symbol) => statusFamilies[_activeName][key as string],
})
