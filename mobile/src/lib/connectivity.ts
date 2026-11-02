/**
 * Smart Order Mobile — حالة الاتصال (P42-W5، GAP-SO-3/GAP-X2).
 *
 * مصفوفة صادقة بين «لا اتصال بالجهاز» و«الخادم تعثّر»: الأولى تعلنها
 * لافتة NetInfo العالمية (لا إنترنت عندك)، والثانية تظهر كحالة خطأ
 * مع إعادة محاولة على السطح نفسه (ErrorState) — لا تُخلط أبدًا، ولا
 * تُدّعى «تم الحفظ» أثناء الانقطاع.
 *
 * هذا الملف نقي عمدًا (بلا استيراد react-native أو NetInfo) — نفس
 * درس plan-gates.ts: بيئة اختبار node الخالصة لا تحتمل الوحدات
 * الأصلية. الاشتراك الحقيقي في NetInfo (وربط onlineManager في
 * react-query) يعيش في components/connectivity-banner.tsx الذي يُركَّب
 * من جذر التخطيط فقط؛ المنطق القابل للاختبار هنا.
 *
 * عند عودة الاتصال: onlineManager.setOnline(true) يستأنف الطفرات
 * المتوقفة ويعيد جلب الاستعلامات الراكدة (سلوك queryClient المشترك
 * في onlineManager — موثّق من مصدر @tanstack/query-core). السلة حالة
 * محلية لا يمسّها الانقطاع؛ الفشل يظهر بصدق مع إعادة محاولة.
 */

/** لقطة بنية حالة NetInfo — الحقول التي يقرأها الحكم فقط. */
export interface ConnectivitySnapshot {
  isConnected: boolean | null
  isInternetReachable: boolean | null
}

/**
 * هل الجهاز متصل بالإنترنت؟ — قاعدة العائلة (Smart-Menu): متصل
 * يعني isConnected === true و isInternetReachable ليست false صراحةً
 * (null = غير معروف بعد → تفاؤل مؤقت، لا لافتة كاذبة عند الإقلاع).
 */
export function isOnlineSnapshot(snapshot: ConnectivitySnapshot | null): boolean {
  return snapshot?.isConnected === true && snapshot.isInternetReachable !== false
}

type Listener = () => void

/**
 * مخزن حالة الاتصال — tiny external store لـ useSyncExternalStore:
 * قيمة واحدة (online) ومشتركون؛ setOnline بلا تغيير لا يوقظ أحدًا.
 */
export interface OnlineStore {
  getSnapshot: () => boolean
  subscribe: (listener: Listener) => () => void
  setOnline: (next: boolean) => void
}

export function createOnlineStore(initial = true): OnlineStore {
  let online = initial
  const listeners = new Set<Listener>()
  return {
    getSnapshot: () => online,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setOnline: (next) => {
      if (next === online) return
      online = next
      listeners.forEach((fn) => fn())
    },
  }
}

/** المخزن المفرد للتطبيق — يكتب فيه مشترك NetInfo ويقرأه كل مستهلك. */
export const onlineStore = createOnlineStore()
