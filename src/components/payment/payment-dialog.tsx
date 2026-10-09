"use client";

import { useState, useEffect, useRef, useId } from "react";
import { Smartphone, Landmark, CheckCircle2, XCircle } from "lucide-react";
import { m } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AnimatedCopy } from "@/components/ui/animated-icons";
import { ProviderPicker } from "@/components/payment/provider-picker";
import { ReceiptUpload } from "@/components/payment/receipt-upload";
import { api, ApiError } from "@/lib/client";
import { normalizeLibyanPhone } from "@/lib/phone";
import {
  WALLET_CAP_LYD,
  MADAR_PHONE_FALLBACK,
  LIBYANA_PHONE_FALLBACK,
  libyanaUssdCode,
  madarUssdCode,
  type PaymentProvider,
} from "@/lib/payment-constants";
import { toast } from "sonner";

type Provider = PaymentProvider;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planNameAr: string;
  price: number;
  businessId?: string;
  onSuccess?: () => void;
  onApproved?: () => void;
}

/**
 * PaymentDialog — family twin (Smart Menu shared/PaymentDialog.tsx):
 * 4-step money path — form (provider picker + transfer targets + USSD
 * quick code / bank fields + receipt) → waiting (pulse rings + status
 * poll) → approved / rejected. Wallet amounts above the 99 LYD network
 * cap force bank transfer. Transfer numbers copy with a toast.
 */
export function PaymentDialog({
  open,
  onOpenChange,
  planId,
  planNameAr,
  price,
  businessId,
  onSuccess,
  onApproved,
}: PaymentDialogProps) {
  const [provider, setProvider] = useState<Provider>("libyana");
  const requiresBank = Number(price) > WALLET_CAP_LYD;

  // Auto-switch to bank when the plan exceeds the wallet cap
  useEffect(() => {
    if (requiresBank && (provider === "libyana" || provider === "madar")) {
      setProvider("bank");
    }
  }, [requiresBank, provider]);

  const [phone, setPhone] = useState("");
  /* r133 (A1 F11/S7): inline field error for the wallet phone (the
     aria-invalid + role=alert grammar) — validation rides
     normalizeLibyanPhone, matching the server twin. */
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const bankAmountId = useId();
  const senderNameId = useId();
  const senderNumberId = useId();
  const [bankAmount, setBankAmount] = useState(price);
  const [senderAccountName, setSenderAccountName] = useState("");
  const [senderAccountNumber, setSenderAccountNumber] = useState("");
  const [receiptImageUrl, setReceiptImageUrl] = useState("");
  const [step, setStep] = useState<"form" | "waiting" | "approved" | "rejected">("form");
  const [resolutionMsg, setResolutionMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  /* r133 (A1 F14): after ~2 minutes of consecutive poll failures the
     timer used to stop rescheduling silently while the UI kept the
     live "waiting" pulse forever — pollFailed surfaces a retry state. */
  const [pollFailed, setPollFailed] = useState(false);
  const [pollNonce, setPollNonce] = useState(0);

  const providerPhone = provider === "libyana" ? LIBYANA_PHONE_FALLBACK : MADAR_PHONE_FALLBACK;
  const providerName = provider === "libyana" ? "ليبيانا" : "مدار";

  const quickTransferCode =
    provider === "libyana"
      ? libyanaUssdCode(LIBYANA_PHONE_FALLBACK, Number(price))
      : madarUssdCode(MADAR_PHONE_FALLBACK, Number(price));

  const encodedUSSD = quickTransferCode.replace(/#/g, "%23");

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم النسخ");
      return true;
    } catch {
      toast.error("تعذّر النسخ");
      return false;
    }
  };

  const sentRef = useRef(false);
  const handleSent = async () => {
    if (sentRef.current) return; // block double-click double-payment
    const isBank = provider === "bank";
    // Validate BEFORE latching the guard — failure must leave the button usable
    if (!isBank) {
      /* r133 (A1 F11): the helper text promised “10 أرقام تبدأ بـ 09” but
         only non-empty was checked — normalizeLibyanPhone is the single
         validation seam (same twin as the server route). */
      const normalized = normalizeLibyanPhone(phone);
      if (!normalized) {
        const msg = "رقم الهاتف غير صحيح — مثال صحيح: 0912345678";
        setPhoneError(msg);
        toast.error(msg);
        return;
      }
    } else {
      if (!senderAccountName.trim()) {
        toast.error("يرجى إدخال اسم صاحب الحساب");
        return;
      }
      if (!senderAccountNumber.trim()) {
        toast.error("يرجى إدخال رقم الحساب");
        return;
      }
    }
    sentRef.current = true;
    setSubmitting(true);
    try {
      const res = await api.post<{ id: string; status: string }>("/api/subscriptions", {
        planId,
        provider,
        amount: isBank ? bankAmount : price,
        phone: isBank ? undefined : (normalizeLibyanPhone(phone) ?? phone.trim()),
        senderAccountName: isBank ? senderAccountName.trim() : undefined,
        senderAccountNumber: isBank ? senderAccountNumber.trim() : undefined,
        receiptImageUrl: receiptImageUrl || undefined,
        businessId,
      });
      setPaymentId(res.data?.id ?? null);
      setPollFailed(false);
      setStep("waiting");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "تعذّر إرسال طلب الدفع");
      sentRef.current = false; // allow retry on failure
    } finally {
      setSubmitting(false);
    }
  };

  // Status poll — pauses when the tab is hidden; after 30 consecutive
  // failures (~2 minutes) it stops rescheduling and surfaces pollFailed
  // (r133 A1 F14 — previously the give-up was silent while the UI kept
  // promising active waiting; pollNonce restarts the loop on retry).
  useEffect(() => {
    if (step !== "waiting" || !paymentId) return;
    let stopped = false;
    let failures = 0;
    const tick = async () => {
      if (stopped) return;
      if (typeof document !== "undefined" && document.hidden) {
        timer = setTimeout(tick, 3000);
        return;
      }
      try {
        const res = await api.get<{ status: string; note?: string }>(`/api/subscriptions/status?id=${paymentId}`);
        failures = 0;
        const status = res.data?.status;
        if (status === "APPROVED") {
          setResolutionMsg("تم الموافقة على اشتراكك بنجاح! سيتم تفعيل الباقة على متجرك الآن.");
          setStep("approved");
          onApproved?.();
          return;
        }
        if (status === "REJECTED") {
          setResolutionMsg(
            res.data?.note || "عذراً، تم رفض طلب تفعيل الاشتراك. يمكنك تعديل البيانات والمحاولة مرة أخرى."
          );
          setStep("rejected");
          return;
        }
      } catch {
        failures += 1;
      }
      if (failures >= 30) {
        setPollFailed(true);
        return;
      }
      timer = setTimeout(tick, 4000);
    };
    let timer: ReturnType<typeof setTimeout> = setTimeout(tick, 2500);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, paymentId, pollNonce]);

  // Reset-on-open — clean form on every open or plan switch
  useEffect(() => {
    if (open) {
      sentRef.current = false;
      setStep("form");
      setBankAmount(price);
      setPhone("");
      setPhoneError(null);
      setSenderAccountName("");
      setSenderAccountNumber("");
      setReceiptImageUrl("");
      setPaymentId(null);
      setResolutionMsg("");
      setSubmitting(false);
      setPollFailed(false);
    }
  }, [open, planId, price]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      sentRef.current = false;
      setStep("form");
      setPhone("");
      setPhoneError(null);
      setBankAmount(price);
      setSenderAccountName("");
      setSenderAccountNumber("");
      setReceiptImageUrl("");
      setPaymentId(null);
      setPollFailed(false);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* r131-F2 (P0-3): re-based on the SO ui/dialog recipe — kit
          rounded-xl 16px + --shadow-modal + the signature top-edge accent
          gradient hairline (::before, inset-inline 30%); the 20px
          rounded-2xl/shadow-2xl spelling is retired. Width rides the kit
          cap (min(560px,100%)). */}
      <DialogContent className="max-h-[90dvh] overflow-y-auto p-0">
        {/* Header — family flame gradient band. r131-F2 (P1): ink rides
            the --orange-foreground token (10.63:1 dark / 4.95:1 light) —
            text-white on gold was 1.89:1. */}
        <div className="bg-gradient-to-br from-orange to-orange/80 p-6 text-orange-foreground">
          <div className="mb-2 flex items-center gap-2">
            <Smartphone className="size-5" aria-hidden="true" />
            <DialogTitle className="text-lg font-bold text-orange-foreground">دفع الاشتراك</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-orange-foreground/70">ادفع عبر المحفظة الإلكترونية</DialogDescription>
        </div>

        <div className="space-y-5 p-5">
          {/* Plan summary — r131-F2: surface + dot (the alpha-wash alert
              recipe; no more border-orange/15 + bg-orange/10). */}
          <div className="rounded-xl border border-border/20 bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 font-bold">
                <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                {planNameAr}
              </span>
              <span className="text-lg font-bold text-accent-foreground tabular-nums" dir="ltr">
                {price} د.ل
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">اشتراك شهري</p>
          </div>

          {step === "form" && (
            <>
              {/* Payment method tabs */}
              <ProviderPicker provider={provider} onSelect={setProvider} requiresBank={requiresBank} />

              {provider !== "bank" && (
                <>
                  {/* Provider phone — transfer target with copy */}
                  <div className="rounded-xl border border-border/20 bg-muted/30 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">أرسل المبلغ إلى {providerName}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-lg font-bold tracking-wide" dir="ltr">
                        {providerPhone}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(providerPhone)}
                        className="flex size-10 items-center justify-center rounded-md border border-border/30 transition-colors hover:bg-muted"
                        title="نسخ الرقم"
                      >
                        <AnimatedCopy className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick transfer code — USSD with copy + dial */}
                  <div className="rounded-xl border border-success/25 bg-success/10 p-3">
                    <p className="mb-1.5 text-xs font-medium text-success-ink">رمز التحويل السريع</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-sm font-bold text-accent-foreground" dir="ltr">
                        {quickTransferCode}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {/* One-tap: copy the code, then open the dialer */}
                        <button
                          type="button"
                          onClick={async () => {
                            const okCopy = await copyToClipboard(quickTransferCode);
                            if (!okCopy) return;
                            setTimeout(() => {
                              window.location.href = `tel:${encodedUSSD}`;
                            }, 150);
                          }}
                          className="flex h-9 items-center gap-1.5 rounded-md bg-success px-3 text-xs font-medium text-success-foreground transition-colors hover:bg-success/90"
                          title="نسخ الرمز وفتح الاتصال"
                        >
                          <AnimatedCopy className="size-3.5" />
                          نسخ واتصال
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* User phone */}
                  <div>
                    <Label htmlFor="payment-phone">رقم هاتفك</Label>
                    <Input
                      id="payment-phone"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (phoneError) setPhoneError(null);
                      }}
                      placeholder="09XXXXXXXX"
                      inputMode="numeric"
                      maxLength={10}
                      aria-invalid={!!phoneError}
                      aria-describedby={phoneError ? "payment-phone-error" : undefined}
                      className="mt-1.5 text-start font-mono"
                      dir="ltr"
                    />
                    {phoneError ? (
                      <p id="payment-phone-error" role="alert" className="mt-1 text-[11px] font-medium text-destructive-ink">
                        {phoneError}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        10 أرقام تبدأ بـ 09 — حتى نتمكن من التأكد من استلام التحويل
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Bank transfer section */}
              {provider === "bank" && (
                <>
                  {/* Bank account info card — values from env-configurable constants */}
                  <div className="space-y-2.5 rounded-xl border border-border/20 bg-muted/30 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-medium">
                      <Landmark className="size-3.5 text-accent-foreground" aria-hidden="true" />
                      حوّل على الحساب البنكي التالي
                    </p>
                    {[
                      { label: "المصرف", value: process.env.NEXT_PUBLIC_BANK_NAME || "مصرف التجارة والتنمية" },
                      { label: "رقم الحساب", value: process.env.NEXT_PUBLIC_BANK_ACCOUNT || "0021-0045-3378-2901" },
                      { label: "الاسم", value: process.env.NEXT_PUBLIC_BANK_HOLDER || "شركة الربط الذكي" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-2">
                        <span className="shrink-0 text-xs text-muted-foreground">{row.label}</span>
                        <span className="truncate text-start font-mono text-sm font-bold" dir="ltr">
                          {row.value}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(row.value)}
                          className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border/30 transition-colors hover:bg-muted"
                          title={`نسخ ${row.label}`}
                        >
                          <AnimatedCopy className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Bank amount */}
                  <div>
                    <Label htmlFor={bankAmountId}>المبلغ (د.ل)</Label>
                    <Input
                      id={bankAmountId}
                      type="number"
                      value={bankAmount}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isNaN(v) || v < 0) return;
                        setBankAmount(v);
                      }}
                      className="mt-1.5"
                      min={1}
                    />
                  </div>

                  {/* Sender account name */}
                  <div>
                    <Label htmlFor={senderNameId}>اسم صاحب الحساب المُرسِل *</Label>
                    <Input
                      id={senderNameId}
                      value={senderAccountName}
                      onChange={(e) => setSenderAccountName(e.target.value)}
                      placeholder="الاسم كما يظهر في الحساب"
                      className="mt-1.5"
                    />
                  </div>

                  {/* Sender account number */}
                  <div>
                    <Label htmlFor={senderNumberId}>رقم حساب المُرسِل *</Label>
                    <Input
                      id={senderNumberId}
                      value={senderAccountNumber}
                      onChange={(e) => setSenderAccountNumber(e.target.value)}
                      placeholder="رقم الحساب الذي حُوّل منه"
                      className="mt-1.5 text-start font-mono"
                      dir="ltr"
                    />
                  </div>

                  <ReceiptUpload receiptImageUrl={receiptImageUrl} onReceiptChange={setReceiptImageUrl} />
                </>
              )}

              {provider !== "bank" && (
                <div className="flex items-center justify-between rounded-xl border border-border/20 bg-muted/30 p-3">
                  <span className="text-sm text-muted-foreground">المبلغ المطلوب</span>
                  <span className="text-lg font-bold text-accent-foreground tabular-nums" dir="ltr">
                    {price} د.ل
                  </span>
                </div>
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={handleSent}
                disabled={
                  submitting ||
                  (provider !== "bank" && !phone.trim()) ||
                  (provider === "bank" &&
                    (!senderAccountName.trim() || !senderAccountNumber.trim()))
                }
              >
                {submitting ? "جارٍ الإرسال…" : "إرسال طلب الدفع"}
              </Button>
            </>
          )}

          {step === "waiting" && (
            <div className="flex flex-col items-center space-y-6 py-10">
              {/* r131-F2: the off-ladder animate-ping rings retire (motion
                  ladder); the static layered rings + the ladder-safe
                  pulse-soft live dot carry the waiting state. */}
              <div className="relative size-28">
                <div className="absolute inset-0 rounded-full border-2 border-orange/20" />
                <div className="absolute inset-2 rounded-full border border-orange/30" />
                <div className="absolute inset-4 flex items-center justify-center rounded-full bg-gradient-to-br from-orange to-orange/80 shadow-lg shadow-orange/25">
                  <Smartphone className="size-8 text-orange-foreground" aria-hidden="true" />
                </div>
              </div>

              <div className="space-y-1.5 text-center">
                <p className="text-base font-bold">في انتظار تأكيد الدفع</p>
                <p className="mx-auto max-w-[220px] text-xs leading-relaxed text-muted-foreground">
                  بعد التحويل، انتظر موافقة الإدارة
                </p>
              </div>

              {/* Live status indicator — r133 (A1 F14): after ~2 minutes
                  of consecutive poll failures the waiting state surfaces a
                  retry affordance instead of pulsing forever. */}
              {pollFailed ? (
                <div
                  className="space-y-2 rounded-2xl border border-border/20 bg-muted/30 px-4 py-3"
                  role="alert"
                >
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    تعذّر التحقق من حالة الدفع — تحقّق من اتصالك بالإنترنت ثم أعد الفحص.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPollFailed(false);
                      setPollNonce((n) => n + 1);
                    }}
                  >
                    إعادة الفحص
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full border border-border/20 bg-muted/30 px-4 py-2">
                  <span className="relative flex size-2">
                    <span className="relative size-2 animate-pulse-soft rounded-full bg-orange" />
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {provider === "libyana" ? "بانتظار تأكيد التحويل" : "بانتظار موافقة الإدارة"}
                  </span>
                </div>
              )}
            </div>
          )}

          {step === "approved" && (
            <div className="flex flex-col items-center space-y-6 py-8">
              <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative size-20">
                <div className="absolute inset-0 rounded-full bg-success/20" />
                <div className="relative flex size-full items-center justify-center rounded-full bg-gradient-to-br from-success to-success/80 shadow-lg shadow-success/30">
                  <CheckCircle2 className="size-10 text-success-foreground" aria-hidden="true" />
                </div>
              </m.div>
              <div className="space-y-2 text-center">
                <m.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-lg font-bold text-success-ink">
                  تم الموافقة على الاشتراك
                </m.p>
                <m.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground"
                >
                  {resolutionMsg}
                </m.p>
              </div>
              <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="w-full">
                <Button
                  size="lg"
                  className="w-full bg-success text-success-foreground hover:bg-success/90"
                  onClick={() => {
                    onOpenChange(false);
                    onSuccess?.();
                  }}
                >
                  الانتقال إلى لوحة التحكم
                </Button>
              </m.div>
            </div>
          )}

          {step === "rejected" && (
            <div className="flex flex-col items-center space-y-6 py-8">
              <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative size-20">
                <div className="absolute inset-0 rounded-full bg-destructive/20" />
                <div className="relative flex size-full items-center justify-center rounded-full bg-gradient-to-br from-destructive to-destructive/80 shadow-lg shadow-destructive/30">
                  <XCircle className="size-10 text-destructive-foreground" aria-hidden="true" />
                </div>
              </m.div>
              <div className="space-y-2 text-center">
                <m.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-lg font-bold text-destructive-ink">
                  تم رفض طلب الاشتراك
                </m.p>
                <m.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground"
                >
                  {resolutionMsg}
                </m.p>
              </div>
              <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex w-full gap-2">
                <Button variant="outline" size="lg" className="flex-1" onClick={() => handleOpenChange(false)}>
                  إغلاق
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    // r132-F1a (A2 F2): un-latch the sent guard — it was
                    // set true when the original request fired and never
                    // reset on this rejected→form path, so "إعادة المحاولة"
                    // silently no-oped (handleSent early-returned forever).
                    sentRef.current = false;
                    setStep("form");
                    setResolutionMsg("");
                    setPhone("");
                    setPhoneError(null);
                    setBankAmount(price);
                    setSenderAccountName("");
                    setSenderAccountNumber("");
                    setReceiptImageUrl("");
                    setPaymentId(null);
                    setPollFailed(false);
                  }}
                >
                  إعادة المحاولة
                </Button>
              </m.div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
