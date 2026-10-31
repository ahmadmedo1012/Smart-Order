/**
 * Smart Order Mobile — تسجيل إشعارات الطلبات (P38 Phase F).
 *
 * القانون: الأذونات تُطلب لحظة القيمة — الشاشة تشرح الفائدة أولًا،
 * وزر التفعيل هو ما يطلب إذن النظام (لا طلب عند الإقلاع أبدًا).
 *
 * الدورة: تفعيل → إذن النظام → Android channel «الطلبات» →
 * getExpoPushTokenAsync → POST /api/mobile/devices (توكن الجهاز يسكن
 * السجل الخادمي) → التوكن يُستبدل عند تجديده (listener) →
 * الإيقاف/إلغاء التثبيت → DELETE (إبطال خادمي).
 *
 * حاجز الاعتماد الموثّق: التسليم الفعلي يتطلب اعتمادات FCM v1
 * (أندرويد) + APNs (iOS) على مشروع EAS — الشيفة والسجل والاختبارات
 * مستقلة عنها، والتسجيل يعمل اليوم؛ التسليم يُفعَّل بإضافة
 * الاعتمادات من expo.dev → Project → Credentials → Push Notifications.
 */
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
// القيم المطلوبة كأسماء مباشرة (المودول الرئيسي يعيد تصديرها كقيم) —
// الوصول عبر فضاء الأسماء يربك محلل استيراد eslint (import/namespace)
// ولا حاجة له أصلاً.
import {
  AndroidImportance,
  AndroidNotificationVisibility,
  IosAuthorizationStatus,
} from 'expo-notifications'
import { post, del } from '@/services/merchant'

/** معرّف قناة أندرويد — كل إشعارات الطلبات عبر قناة واحدة قابلة للضبط
 * من إعدادات النظام (المستخدم يملك صوته). */
export const ORDERS_CHANNEL_ID = 'smartorder-orders'

/** كيف تُعرض الإشعارات داخل التطبيق (foreground) — بطاقة صامتة بلا
 * مقاطعة: الصفحة نفسها تحيّن استطلاعها، والإشعار علامة إضافية. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
})

/** هل إذن النظام ممنوح؟ (بلا طلب — للعرض الصادق في الواجهة) */
export async function pushPermissionGranted(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync()
  return cur.granted || cur.ios?.status === IosAuthorizationStatus.PROVISIONAL
}

/** طلب الإذن — يُستدعى فقط من زر التفعيل بعد شرح القيمة. */
async function requestPermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync()
  if (cur.granted) return true
  if (!cur.canAskAgain) return false
  const next = await Notifications.requestPermissionsAsync()
  return next.granted || next.ios?.status === IosAuthorizationStatus.PROVISIONAL
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(ORDERS_CHANNEL_ID, {
    name: 'الطلبات الجديدة',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: AndroidNotificationVisibility.PRIVATE,
  })
}

/** التفعيل الكامل: إذن → قناة → توكن → تسجيل خادمي. يرجع التوكن عند
 * النجاح أو null (رفض/فشل — الشاشة تعرض السبب بصدق). */
export async function enableOrderNotifications(): Promise<string | null> {
  const granted = await requestPermission()
  if (!granted) return null
  await ensureAndroidChannel()
  const tokenRes = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId as string | undefined,
  })
  const token = tokenRes.data
  if (!token) return null
  await post('/api/mobile/devices', {
    token,
    platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown',
  })
  return token
}

/** الإيقاف: إبطال خادمي (idempotent) — التوكن يبقى في الخزنة المحلية
 * للجهاز لكن السجل الخادمي لا يرسل إليه بعد الآن. */
export async function disableOrderNotifications(token: string): Promise<void> {
  await del(`/api/mobile/devices`, { token })
}

/** استبدال التوكن عند تجديده (تسجيل دخول جديد/إعادة تثبيت) — يستدعيه
 * مزوّد الإشعارات عند توفر توكن قائم مُفعَّل. */
export async function registerTokenRefreshListener(
  onRegister: (token: string) => Promise<void>,
): Promise<Notifications.Subscription> {
  return Notifications.addPushTokenListener(async (event) => {
    try {
      await onRegister(event.data)
      await post('/api/mobile/devices', {
        token: event.data,
        platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown',
      })
    } catch {
      /* الاستبدال أفضل جهد — التسجيل القادم يلتقطه */
    }
  })
}
