/**
 * Smart Order Mobile — التقارير (C2-REST، M4).
 *
 * GET /api/mobile/reports?businessId&from&to — نافذة تختارها بتقويم
 * مصغّر (افتراضيًا آخر 30 يومًا). التحقق المحلي يسبق النداء ويطابق
 * قواعد 422 في الخادم حرفيًا: صيغة YYYY-MM-DD بتاريخ تقويمي حقيقي
 * (ذهابًا وإيابًا)، البداية قبل النهاية، لا مستقبل بتوقيت طرابلس
 * (UTC+2 ثابتة)، ومدى ≤ 366 يومًا. الملخص: إيراد النافذة وطلباتها
 * ومتوسط الطلب (مليم صحيح — formatMillimes) وتوزيع الحالات بأشرطة
 * أفقية بألوان عائلات الحالة نفسها. بوابة الخطة بريميوم+ تردّ 403
 * برسالة عربية تظهر كما هي.
 */
import React, { useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { fonts, type ThemeColors } from '@/constants/theme'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuthStore } from '@/state/auth'
import { fetchMobileReports } from '@/services/merchant'
import { apiErrorMessage } from '@/lib/api-error'
import { formatNumber } from '@/lib/money'
import { formatMillimes } from '@/lib/money-millimes'
import { AR_MONTHS } from '@/lib/datetime'
import { ORDER_STATUS_AR, type OrderStatus } from '@/types/storefront'
import { ErrorState, LoadingState } from '@/components/state-views'

/* ── مفاتيح الأيام التقويمية (طرابلس UTC+2 ثابتة — بلا صيفي) ───── */

const DAY_MS = 24 * 60 * 60 * 1000
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
/** أيام الأسبوع تبدأ السبت (الأسبوع الليبي). */
const WEEKDAYS = ['سبت', 'أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع']

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function dayKey(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`
}

/** مفتاح اليوم الحالي بتوقيت طرابلس — نفس منطق tripoliDayStart. */
function tripoliTodayKey(): string {
  const shifted = new Date(Date.now() + 2 * 3600 * 1000)
  return dayKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate())
}

function dayKeyMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number]
  return Date.UTC(y, m - 1, d)
}

function shiftDay(key: string, days: number): string {
  const d = new Date(dayKeyMs(key) + days * DAY_MS)
  return dayKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

/** تاريخ حقيقي ينجو من رحلة العودة (30 فبراير يُرفض) — قاعدة الخادم. */
function validDayKey(key: string): boolean {
  if (!DAY_RE.test(key)) return false
  const [y, m, d] = key.split('-').map(Number) as [number, number, number]
  const utc = new Date(Date.UTC(y, m - 1, d))
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === m - 1 && utc.getUTCDate() === d
}

/** سلم رفض 422 في الخادم — نفس الرسائل، قبل أي نداء شبكي. */
function validateWindow(from: string, to: string, today: string): string | null {
  if (!validDayKey(from)) return 'تاريخ البداية غير صحيح — صيغة التاريخ: YYYY-MM-DD'
  if (!validDayKey(to)) return 'تاريخ النهاية غير صحيح — صيغة التاريخ: YYYY-MM-DD'
  if (dayKeyMs(from) > dayKeyMs(to)) return 'تاريخ البداية بعد تاريخ النهاية'
  if (dayKeyMs(to) > dayKeyMs(today)) return 'لا يمكن اختيار نافذة في المستقبل'
  if ((dayKeyMs(to) - dayKeyMs(from)) / DAY_MS + 1 > 366) return 'النافذة كبيرة جداً — الحد الأقصى 366 يوماً'
  return null
}

function dayKeyToArabic(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number]
  return `${d} ${AR_MONTHS[m - 1] ?? ''} ${y}`
}

/** نفس ترتيب آلة الحالات في لوحة القيادة. */
const STATUS_ORDER: OrderStatus[] = [
  'NEW',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
]

/** عائلة اللون لكل حالة — نفس خريطة طوابع الحالة. */
function statusFamilyKey(st: OrderStatus): 'copper' | 'sky' | 'yellow' | 'mint' | 'grey' | 'rose' {
  return st === 'NEW' || st === 'READY'
    ? 'copper'
    : st === 'CONFIRMED' || st === 'OUT_FOR_DELIVERY'
      ? 'sky'
      : st === 'PREPARING'
        ? 'yellow'
        : st === 'DELIVERED'
          ? 'mint'
          : st === 'REJECTED'
            ? 'rose'
            : 'grey'
}

/** شرائط النطاقات السريعة — الافتراضي 30 يومًا. */
const QUICK_RANGES: { label: string; days: number }[] = [
  { label: 'آخر 7 أيام', days: 7 },
  { label: 'آخر 30 يومًا', days: 30 },
  { label: 'آخر 90 يومًا', days: 90 },
]

function KpiCard({ label, value }: { label: string; value: string }) {
  const { t } = useTheme()
  const s = makeStyles(t)

  return (
    <View style={s.kpi}>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  )
}

export default function ManageReportsScreen() {
  const { t, statusFamily } = useTheme()
  const s = makeStyles(t)

  const businessId = useAuthStore((s) => s.selectedBusinessId)
  const membership = useAuthStore((s) => s.memberships.find((m) => m.businessId === s.selectedBusinessId))
  const canRead = useMemo(() => (membership?.permissions ?? []).includes('orders.read'), [membership])

  // الافتراضي: آخر 30 يومًا تقويميًا (اليوم مشمولًا) — نفس افتراض الخادم.
  const todayKey = tripoliTodayKey()
  const [fromKey, setFromKey] = useState(() => shiftDay(tripoliTodayKey(), -29))
  const [toKey, setToKey] = useState(() => tripoliTodayKey())
  const [calTarget, setCalTarget] = useState<'from' | 'to' | null>(null)
  const [viewYear, setViewYear] = useState(() => {
    const [y] = tripoliTodayKey().split('-').map(Number) as [number, number, number]
    return y
  })
  const [viewMonth, setViewMonth] = useState(() => {
    const [, m] = tripoliTodayKey().split('-').map(Number) as [number, number, number]
    return m - 1
  })

  const windowError = useMemo(() => validateWindow(fromKey, toKey, todayKey), [fromKey, toKey, todayKey])

  const query = useQuery({
    queryKey: ['merchant', 'reports', businessId, fromKey, toKey],
    queryFn: () => fetchMobileReports(businessId as string, fromKey, toKey),
    enabled: !!businessId && canRead && !windowError,
  })

  const [ty, tm] = useMemo(() => todayKey.split('-').map(Number) as [number, number, number], [todayKey])
  const atCurrentMonth = viewYear === ty && viewMonth === tm - 1

  function openCal(target: 'from' | 'to') {
    const key = target === 'from' ? fromKey : toKey
    const [y, m] = key.split('-').map(Number) as [number, number, number]
    setViewYear(y)
    setViewMonth(m - 1)
    setCalTarget(target)
  }

  function shiftMonth(dir: -1 | 1) {
    let m = viewMonth + dir
    let y = viewYear
    if (m < 0) {
      m = 11
      y -= 1
    } else if (m > 11) {
      m = 0
      y += 1
    }
    setViewYear(y)
    setViewMonth(m)
  }

  /** اختيار يوم — الترتيب يبقى سليمًا (تبديل تلقائي عند التقاطع). */
  function pickDay(key: string) {
    if (calTarget === 'from') {
      if (dayKeyMs(key) > dayKeyMs(toKey)) {
        setFromKey(key)
        setToKey(key)
      } else {
        setFromKey(key)
      }
      // بعد البداية ننتقل لاختيار النهاية مباشرة.
      setCalTarget('to')
    } else if (calTarget === 'to') {
      if (dayKeyMs(key) < dayKeyMs(fromKey)) {
        setToKey(fromKey)
        setFromKey(key)
      } else {
        setToKey(key)
      }
      setCalTarget(null)
    }
  }

  function applyQuick(days: number) {
    const today = tripoliTodayKey()
    setFromKey(shiftDay(today, -(days - 1)))
    setToKey(today)
    setCalTarget(null)
  }

  const report = query.data
  const statusRows = useMemo(() => {
    if (!report) return []
    return STATUS_ORDER.filter((st) => (report.statusCounts[st] ?? 0) > 0).map((st) => ({
      status: st,
      count: report.statusCounts[st] ?? 0,
    }))
  }, [report])
  const maxStatusCount = useMemo(
    () => statusRows.reduce((mx, r) => Math.max(mx, r.count), 0),
    [statusRows],
  )

  if (!canRead) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ErrorState message="هذه الشاشة تتطلب صلاحية الاطلاع على الطلبات" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              void query.refetch()
            }}
            tintColor={t.primary}
            colors={[t.primary]}
          />
        }
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => router.back()}
          style={({ pressed }) => [s.backRow, pressed && { opacity: 0.6 }]}
        >
          <Text style={s.backText}>رجوع</Text>
          <Text style={s.backChevron}>‹</Text>
        </Pressable>
        <Text style={s.title}>التقارير</Text>
        <Text style={s.sub}>إيرادات متجرك وطلباته على نافذة تختارها — بتوقيت طرابلس</Text>

        {/* نافذة التقرير */}
        <View style={s.card}>
          <View style={s.rangeRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="اختيار تاريخ البداية"
              onPress={() => openCal('from')}
              style={({ pressed }) => [
                s.dateBox,
                calTarget === 'from' && s.dateBoxActive,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={s.dateLabel}>من</Text>
              <Text style={s.dateValue}>{dayKeyToArabic(fromKey)}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="اختيار تاريخ النهاية"
              onPress={() => openCal('to')}
              style={({ pressed }) => [
                s.dateBox,
                calTarget === 'to' && s.dateBoxActive,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Text style={s.dateLabel}>إلى</Text>
              <Text style={s.dateValue}>{dayKeyToArabic(toKey)}</Text>
            </Pressable>
          </View>

          <View style={s.chipRow}>
            {QUICK_RANGES.map((r) => (
              <Pressable
                key={r.days}
                accessibilityRole="button"
                accessibilityLabel={r.label}
                onPress={() => {
                  applyQuick(r.days)
                }}
                style={({ pressed }) => [s.chip, pressed && { opacity: 0.75 }]}
              >
                <Text style={s.chipText}>{r.label}</Text>
              </Pressable>
            ))}
          </View>

          {calTarget ? (
            <MiniCalendar
              fromKey={fromKey}
              toKey={toKey}
              todayKey={todayKey}
              viewYear={viewYear}
              viewMonth={viewMonth}
              atCurrentMonth={atCurrentMonth}
              onShiftMonth={shiftMonth}
              onPickDay={pickDay}
            />
          ) : null}

          {windowError ? <Text style={s.windowError}>{windowError}</Text> : null}
        </View>

        {/* التقرير */}
        {windowError ? null : query.isPending ? (
          <LoadingState label="جارٍ تحميل التقرير…" />
        ) : query.isError || !report ? (
          <ErrorState
            message={query.isError ? apiErrorMessage(query.error, 'تعذر تحميل التقرير — حاول بعد قليل') : 'تعذر تحميل التقرير'}
            onRetry={() => {
              void query.refetch()
            }}
          />
        ) : (
          <>
            <View style={s.kpiGrid}>
              <KpiCard label="إيراد النافذة" value={formatMillimes(report.totals.revenue)} />
              <KpiCard label="عدد الطلبات" value={formatNumber(report.totals.orders)} />
              <KpiCard label="متوسط قيمة الطلب" value={formatMillimes(report.totals.avgOrder)} />
              <KpiCard label="أيام النافذة" value={formatNumber(report.window.days)} />
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>توزيع الحالات في النافذة</Text>
              {statusRows.length === 0 ? (
                <Text style={s.hint}>لا طلبات في هذه النافذة — جرّب نطاقًا أوسع</Text>
              ) : (
                statusRows.map((row) => {
                  const fam = statusFamily[statusFamilyKey(row.status)]
                  const pct = maxStatusCount > 0 ? Math.max((row.count / maxStatusCount) * 100, 3) : 0
                  return (
                    <View key={row.status} style={s.barRow}>
                      <Text style={s.barLabel} numberOfLines={1}>
                        {ORDER_STATUS_AR[row.status]}
                      </Text>
                      <View style={s.barTrack}>
                        <View
                          style={[
                            s.barFill,
                            { width: `${pct}%`, backgroundColor: fam.ink },
                          ]}
                        />
                      </View>
                      <Text style={s.barCount}>{formatNumber(row.count)}</Text>
                    </View>
                  )
                })
              )}
              <Text style={s.windowMeta}>
                من {dayKeyToArabic(report.window.from)} إلى {dayKeyToArabic(report.window.to)} ·{' '}
                {formatNumber(report.window.days)} يومًا — الملغاة والمرفوضة لا تُحسب في الإيراد
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

/** تقويم مصغّر — شبكة شهر سبت-الجمعة، RTL، المستقبل معطّل، والنطاق
 *  المختار مظلل (البداية/النهاية بالأساسي، ما بينهما بغسلته الناعمة). */
function MiniCalendar({
  fromKey,
  toKey,
  todayKey,
  viewYear,
  viewMonth,
  atCurrentMonth,
  onShiftMonth,
  onPickDay,
}: {
  fromKey: string
  toKey: string
  todayKey: string
  viewYear: number
  viewMonth: number
  atCurrentMonth: boolean
  onShiftMonth: (dir: -1 | 1) => void
  onPickDay: (key: string) => void
}) {
  const { t } = useTheme()
  const s = makeStyles(t)

  // أول يوم في الشهر: السبت = بداية الأسبوع (getUTCDay: الأحد=0).
  const firstWeekday = (new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay() + 1) % 7
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate()

  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => dayKey(viewYear, viewMonth + 1, i + 1)),
  ]

  return (
    <View style={s.calBox}>
      <View style={s.calHead}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الشهر السابق"
          onPress={() => onShiftMonth(-1)}
          style={({ pressed }) => [s.calNavBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={s.calNavGlyph}>›</Text>
        </Pressable>
        <Text style={s.calMonthLabel}>
          {AR_MONTHS[viewMonth] ?? ''} {viewYear}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الشهر التالي"
          accessibilityState={{ disabled: atCurrentMonth }}
          disabled={atCurrentMonth}
          onPress={() => onShiftMonth(1)}
          style={({ pressed }) => [
            s.calNavBtn,
            pressed && { opacity: 0.6 },
            atCurrentMonth && { opacity: 0.3 },
          ]}
        >
          <Text style={s.calNavGlyph}>‹</Text>
        </Pressable>
      </View>

      <View style={s.calWeekRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={s.calWeekday}>
            {w}
          </Text>
        ))}
      </View>

      <View style={s.calGrid}>
        {cells.map((key, i) => {
          if (!key) return <View key={`empty-${i}`} style={s.calCell} />
          const future = key > todayKey
          const selected = key === fromKey || key === toKey
          const inRange = !selected && key > fromKey && key < toKey
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={dayKeyToArabic(key)}
              accessibilityState={{ disabled: future, selected }}
              disabled={future}
              onPress={() => {
                onPickDay(key)
              }}
              style={({ pressed }) => [
                s.calCell,
                s.calDay,
                pressed && { opacity: 0.7 },
                inRange && { backgroundColor: t.goldSoft },
                selected && { backgroundColor: t.primary },
                future && { opacity: 0.3 },
              ]}
            >
              <Text style={[s.calDayText, selected && s.calDayTextSelected]}>{Number(key.slice(8))}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const makeStyles = (t: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.background },
  scroll: { padding: 16, gap: 12, paddingBottom: 32 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 4 },
  backText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: t.primary,
  },
  backChevron: { color: t.primary, fontSize: 20, lineHeight: 24 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: t.foreground,
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: t.mutedFg,
    lineHeight: 19,
    paddingBottom: 2,
  },
  card: {
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: t.foreground,
  },
  rangeRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  dateBox: {
    flex: 1,
    gap: 3,
    backgroundColor: t.background,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 60,
    justifyContent: 'center',
  },
  dateBoxActive: { borderColor: t.primary },
  dateLabel: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: t.mutedFg,
  },
  dateValue: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: t.foreground,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.background,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: t.mutedFg,
  },
  windowError: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: t.destructive,
    lineHeight: 19,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: {
    width: '48.5%',
    flexGrow: 1,
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 14,
    gap: 4,
  },
  kpiValue: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: t.ring,
  },
  kpiLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
    lineHeight: 17,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    width: 74,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.mutedFg,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: t.surface,
    overflow: 'hidden',
  },
  barFill: { height: 10, borderRadius: 5 },
  barCount: {
    minWidth: 30,
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: t.foreground,
    textAlign: 'left',
  },
  windowMeta: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    color: t.mutedFg,
    lineHeight: 18,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: t.mutedFg,
    textAlign: 'center',
  },
  calBox: {
    backgroundColor: t.background,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  calHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNavGlyph: {
    fontFamily: fonts.medium,
    fontSize: 20,
    lineHeight: 24,
    color: t.primary,
  },
  calMonthLabel: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: t.foreground,
  },
  calWeekRow: { flexDirection: 'row' },
  calWeekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 10.5,
    color: t.mutedFg,
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: '14.28%', aspectRatio: 1 },
  calDay: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  calDayText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: t.foreground,
  },
  calDayTextSelected: { color: t.primaryFg },
})
