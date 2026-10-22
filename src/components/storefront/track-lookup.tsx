"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hash, Loader2, PackageSearch, Phone } from "lucide-react";
import { api } from "@/lib/client";
import { normalizeLibyanPhone } from "@/lib/phone";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SkipLink } from "@/components/shared/skip-link";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { FieldError } from "@/components/dashboard/form-field";

/**
 * W2-D1 — /track: the order-number DOOR to the tracking page.
 *
 * The publicToken is unguessable by design, so a customer holding only
 * the receipt (order number + the phone they ordered with) had no way
 * back to their order. This form POSTs /api/public/track (see that
 * route for why the phone rides along: orderNumber is per-business,
 * and the phone both disambiguates and hardens enumeration), then
 * routes to /track/[token] — the page that renders the order.
 *
 * Chrome + typography follow the P21-D tracking-page law (ThemeToggle
 * rail, max-w-lg card, the 26/34px display-voice claim over mono
 * facts) so the door and the destination read as one surface. The
 * empty state stays HONEST: a miss renders exactly «لا يوجد طلب بهذه
 * البيانات» + the real recovery copy — never a demo order, never a
 * fake timeline.
 *
 * W21-E: the door remembers its own successes — the last five FOUND
 * lookups ride back as a quiet «طلبات تابعتها» row (localStorage on
 * the customer's device only, mount-gated so SSR paints none — the
 * clock-text hydration law; the phone chip MASKS the number for
 * shoulder-surfers). A chip replays the exact payload that worked; a
 * stale one meets the same honest miss as a manual lookup.
 */

const ORDER_NUMBER_RE = /^SO-\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])-\d{4,6}$/;

/* W21-E: «طلبات تابعتها» — the last five lookups that FOUND an order,
 * remembered on the customer's own device (same storage family as the
 * cart store's "smart-order-cart"). The RAW phone is what gets re-sent
 * (byte-identical replay of the payload that worked); the chip masks it
 * for display. Storage reads are defensive: anything unparsable or
 * foreign shapes up as "no recents", never as a crash. */
const RECENTS_STORAGE_KEY = "smart-order-track-recents";
const RECENTS_CAP = 5;

interface TrackRecent {
  orderNumber: string;
  phone: string;
}

function readRecents(): TrackRecent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is TrackRecent =>
          !!e &&
          typeof e === "object" &&
          typeof (e as TrackRecent).orderNumber === "string" &&
          typeof (e as TrackRecent).phone === "string",
      )
      .slice(0, RECENTS_CAP);
  } catch {
    return [];
  }
}

function rememberRecent(entry: TrackRecent): void {
  try {
    const next = [
      entry,
      ...readRecents().filter(
        (r) => !(r.orderNumber === entry.orderNumber && r.phone === entry.phone),
      ),
    ].slice(0, RECENTS_CAP);
    window.localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode / storage quota — the lookup itself already
       succeeded; remembering is best-effort, never blocking. */
  }
}

/** Display-only mask: keep the operator prefix (091x) + the last two
 * digits, mask the middle run — enough to tell two orders apart, not
 * enough to read over a shoulder. */
function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone;
  return `${phone.slice(0, 4)}${"•".repeat(phone.length - 6)}${phone.slice(-2)}`;
}

export function TrackLookup() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<{ orderNumber?: string; phone?: string }>({});
  /* the server's honest miss (404) or rate limit (429) — one quiet
     stamp under the form, role=alert announces it. */
  const [miss, setMiss] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const missRef = React.useRef<HTMLDivElement>(null);
  /* W21-E: recents ride the mount-gated idiom — SSR + first paint show
     none, the effect fills them after mount (zero hydration drift, the
     same law as clock text). */
  const [recents, setRecents] = React.useState<TrackRecent[]>([]);

  React.useEffect(() => {
    setRecents(readRecents());
  }, []);

  function validate(): boolean {
    const errs: { orderNumber?: string; phone?: string } = {};
    const num = orderNumber.trim().toUpperCase();
    if (!num) errs.orderNumber = "أدخل رقم طلبك كما وصل في الإيصال";
    else if (!ORDER_NUMBER_RE.test(num)) errs.orderNumber = "صيغة رقم الطلب غير صحيحة — مثال: SO-20260617-0042";
    const normalized = normalizeLibyanPhone(phone);
    if (!normalized) errs.phone = "أدخل رقم هاتف صحيح — مثال صحيح: 0912345678";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* The one POST both doors share — the form submit and a recents chip
     replay the exact payload that worked. On hit, the token route owns
     everything; on miss, the honest stamp (role=alert) speaks. */
  async function lookup(num: string, tel: string) {
    setMiss(null);
    setSubmitting(true);
    try {
      const r = await api.post<{ token: string }>("/api/public/track", {
        orderNumber: num,
        phone: tel,
      });
      rememberRecent({ orderNumber: num, phone: tel });
      /* found → the token route owns everything from here (order data,
         station road, polls). replace(): the lookup form never enters
         Back history between the customer and their order. */
      router.replace(`/track/${r.data.token}`);
    } catch (err) {
      setMiss(err instanceof Error ? err.message : "تعذّر الاتصال بالشبكة — تحقّق من اتصالك وحاول مرة أخرى");
      /* keep the keyboard with the answer, not on a dead button */
      requestAnimationFrame(() => missRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMiss(null);
    if (!validate()) return;
    await lookup(orderNumber.trim().toUpperCase(), phone.trim());
  }

  function clearRecents() {
    try {
      window.localStorage.removeItem(RECENTS_STORAGE_KEY);
    } catch {
      /* noop — an unwritable store reads as empty next mount anyway */
    }
    setRecents([]);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <SkipLink />
      {/* the tracking-page chrome: quiet header, theme toggle at the rail end */}
      <header className="bg-background border-b border-border safe-top sticky top-0 z-(--z-dropdown)">
        <div className="mx-auto max-w-lg lg:max-w-2xl px-4 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <PackageSearch className="size-4" aria-hidden="true" />
            سمارت أوردر
          </Link>
          <ThemeToggle className="ms-auto" />
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-lg lg:max-w-2xl px-4 py-6 lg:py-10 space-y-4 focus:outline-none">
        <section className="rounded-xl border border-border bg-card p-5 lg:p-7">
          {/* the FACTS voice (UC mono-for-facts): the page's handle, LTR */}
          <p className="text-[11px] text-muted-foreground font-mono" dir="ltr">
            SMART ORDER · TRACK
          </p>
          {/* the CLAIM voice (the tracking-page display register —
              W7-G fix 13: tracking-tight deleted per the Arabic law) */}
          <h1 className="mt-1.5 font-heading text-[26px] font-extrabold leading-tight lg:text-[34px] lg:leading-[1.15]">
            تتبع طلبك
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            أدخل رقم الطلب ورقم الهاتف الذي طلبت به — وصل الاثنان في إيصالك
            عند إتمام الطلب.
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-5 space-y-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="track-lookup-number"
                className="text-xs font-medium text-muted-foreground flex items-center gap-1"
              >
                <Hash className="size-3" aria-hidden="true" />
                رقم الطلب *
              </label>
              <Input
                id="track-lookup-number"
                value={orderNumber}
                onChange={(e) => {
                  setOrderNumber(e.target.value);
                  if (fieldErrors.orderNumber) setFieldErrors((x) => ({ ...x, orderNumber: undefined }));
                }}
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                /* the handle is latin-only (SO- + digits): the latin keyboard,
                   not the dialer */
                inputMode="text"
                autoCapitalize="characters"
                maxLength={20}
                placeholder="SO-20260617-0042"
                className="text-start font-mono tabular-nums"
                aria-invalid={!!fieldErrors.orderNumber}
                aria-describedby={fieldErrors.orderNumber ? "track-lookup-number-error" : undefined}
                disabled={submitting}
              />
              {fieldErrors.orderNumber && (
                <FieldError id="track-lookup-number-error">{fieldErrors.orderNumber}</FieldError>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="track-lookup-phone"
                className="text-xs font-medium text-muted-foreground flex items-center gap-1"
              >
                <Phone className="size-3" aria-hidden="true" />
                رقم الهاتف الذي طلبت به *
              </label>
              <Input
                id="track-lookup-phone"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (fieldErrors.phone) setFieldErrors((x) => ({ ...x, phone: undefined }));
                }}
                autoComplete="tel"
                inputMode="tel"
                dir="ltr"
                maxLength={20}
                placeholder="0912345678"
                className="text-start tabular-nums"
                aria-invalid={!!fieldErrors.phone}
                aria-describedby={fieldErrors.phone ? "track-lookup-phone-error" : undefined}
                disabled={submitting}
              />
              {fieldErrors.phone && <FieldError id="track-lookup-phone-error">{fieldErrors.phone}</FieldError>}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  جارٍ البحث…
                </>
              ) : (
                "تتبّع الطلب"
              )}
            </Button>
          </form>

          {/* the honest empty state — a miss is a miss, no demo data,
              no fake timeline. Focusable so the keyboard lands on the
              answer (role=alert announces it). */}
          {miss && (
            <div
              ref={missRef}
              role="alert"
              tabIndex={-1}
              className="mt-4 flex items-start gap-3 rounded-sm border border-border bg-muted/40 px-4 py-3 text-start focus:outline-none focus-visible:outline-solid focus-visible:outline-[length:var(--state-focus-ring-width,2px)] focus-visible:outline-[color:var(--state-focus-ring-color,var(--ring))] focus-visible:outline-offset-[length:var(--state-focus-ring-offset,2px)]"
            >
              <PackageSearch className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div>
                <div className="text-sm font-semibold">{miss}</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  تحقّق من رقم الطلب كما وصل في إيصالك، ومن رقم الهاتف الذي
                  استخدمته عند الطلب، ثم أعد المحاولة.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* W21-E: «طلبات تابعتها» — the last five FOUND lookups, this
            device's localStorage only. Chips replay the exact payload
            that worked; a stale chip meets the same honest miss block
            above (never a fabricated order). Order number + masked
            phone = mono facts (dir=ltr); the row rides the quiet stamp
            grammar (rounded-sm, muted ground) + the 44px touch floor. */}
        {recents.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-5 lg:p-7">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium text-muted-foreground">طلبات تابعتها</h2>
              <button
                type="button"
                onClick={clearRecents}
                className="inline-flex min-h-11 items-center text-xs text-muted-foreground transition-colors duration-(--t-fast) hover:text-foreground"
              >
                مسح الكل
              </button>
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              {recents.map((r) => (
                <button
                  key={`${r.orderNumber}|${r.phone}`}
                  type="button"
                  disabled={submitting}
                  onClick={() => lookup(r.orderNumber, r.phone)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border bg-muted/40 px-3 py-2 text-xs transition-colors duration-(--t-fast) hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span dir="ltr" className="font-mono tabular-nums font-semibold">
                    {r.orderNumber}
                  </span>
                  <span aria-hidden="true" className="text-muted-foreground">·</span>
                  <span dir="ltr" className="font-mono tabular-nums text-muted-foreground">
                    {maskPhone(r.phone)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <p className="px-1 text-xs leading-relaxed text-muted-foreground">
          وصلتك رسالة واتساب برابط التتبّع؟ افتح الرابط نفسه مباشرة — لا
          تحتاج هذه الصفحة.
        </p>
      </main>
    </div>
  );
}
