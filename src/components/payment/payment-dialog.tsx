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
      toast.error("فشل النسخ");
      return false;
    }
  };

  const sentRef = useRef(false);
  const handleSent = async () => {
    if (sentRef.current) return; // block double-click double-payment
    const isBank = provider === "bank";
    // Validate BEFORE latching the guard — failure must leave the button usable
    if (!isBank && !phone.trim()) {
      toast.error("يرجى إدخال رقم هاتفك");
      return;
    }
    if (isBank) {
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
        phone: isBank ? undefined : phone.trim(),
        senderAccountName: isBank ? senderAccountName.trim() : undefined,
        senderAccountNumber: isBank ? senderAccountNumber.trim() : undefined,
        receiptImageUrl: receiptImageUrl || undefined,
        businessId,
      });
      setPaymentId(res.data?.id ?? null);
      setStep("waiting");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "فشل إرسال طلب الدفع");
      sentRef.current = false; // allow retry on failure
    } finally {
      setSubmitting(false);
    }
  };

  // Status poll — pauses when the tab is hidden, gives up after 15 minutes
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
          setResolutionMsg("تم الموافقة على اشتراكك بنجاح! سيتم تفعيل الخطة على متجرك الآن.");
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
      if (failures < 30) {
        timer = setTimeout(tick, 4000);
      }
    };
    let timer: ReturnType<typeof setTimeout> = setTimeout(tick, 2500);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, paymentId]);

  // Reset-on-open — clean form on every open or plan switch
  useEffect(() => {
    if (open) {
      sentRef.current = false;
      setStep("form");
      setBankAmount(price);
      setPhone("");
      setSenderAccountName("");
      setSenderAccountNumber("");
      setReceiptImageUrl("");
      setPaymentId(null);
      setResolutionMsg("");
      setSubmitting(false);
    }
  }, [open, planId, price]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      sentRef.current = false;
      setStep("form");
      setPhone("");
      setBankAmount(price);
      setSenderAccountName("");
      setSenderAccountNumber("");
      setReceiptImageUrl("");
      setPaymentId(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto rounded-2xl border-border/50 p-0 shadow-2xl sm:max-w-md">
        {/* Header — family flame gradient band */}
        <div className="bg-gradient-to-br from-orange to-orange/80 p-6 text-white">
          <div className="mb-2 flex items-center gap-2">
            <Smartphone className="size-5" aria-hidden="true" />
            <DialogTitle className="text-lg font-bold text-white">دفع الاشتراك</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-white/70">ادفع عبر المحفظة الإلكترونية</DialogDescription>
        </div>

        <div className="space-y-5 p-5">
          {/* Plan summary — family orange wash chip */}
          <div className="rounded-xl border border-orange/15 bg-orange/10 p-4 dark:bg-orange/10">
            <div className="flex items-center justify-between">
              <span className="font-bold">{planNameAr}</span>
              <span className="text-lg font-bold text-orange tabular nums" dir="ltr">
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
                        className="flex size-10 items-center justify-center rounded-lg border border-border/30 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
                        title="نسخ الرقم"
                      >
                        <AnimatedCopy className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick transfer code — USSD with copy + dial */}
                  <div className="rounded-xl border border-success/25 bg-success/10 p-3">
                    <p className="mb-1.5 text-xs font-medium text-success">رمز التحويل السريع</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-sm font-bold text-orange" dir="ltr">
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
                          className="flex h-9 items-center gap-1.5 rounded-lg bg-success px-3 text-xs font-medium text-white transition-colors hover:bg-success/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
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
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09XXXXXXXXX"
                      inputMode="numeric"
                      maxLength={10}
                      className="mt-1.5 h-11 rounded-xl text-start font-mono"
                      dir="ltr"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      ١٠ أرقام تبدأ بـ 09 — حتى نتمكن من التأكد من استلام التحويل
                    </p>
                  </div>
                </>
              )}

              {/* Bank transfer section */}
              {provider === "bank" && (
                <>
                  {/* Bank account info card — values from env-configurable constants */}
                  <div className="space-y-2.5 rounded-xl border border-border/20 bg-muted/30 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-medium">
                      <Landmark className="size-3.5 text-orange" aria-hidden="true" />
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
                          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/30 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60"
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
                      className="mt-1.5 h-11 rounded-xl"
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
                      className="mt-1.5 h-11 rounded-xl"
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
                      className="mt-1.5 h-11 rounded-xl text-start font-mono"
                      dir="ltr"
                    />
                  </div>

                  <ReceiptUpload receiptImageUrl={receiptImageUrl} onReceiptChange={setReceiptImageUrl} />
                </>
              )}

              {provider !== "bank" && (
                <div className="flex items-center justify-between rounded-xl border border-border/20 bg-muted/30 p-3">
                  <span className="text-sm text-muted-foreground">المبلغ المطلوب</span>
                  <span className="text-lg font-bold text-orange tabular nums" dir="ltr">
                    {price} د.ل
                  </span>
                </div>
              )}

              <Button
                className="h-12 w-full rounded-xl text-base font-semibold"
                onClick={handleSent}
                disabled={submitting || (provider !== "bank" && !phone.trim())}
              >
                {submitting ? "جاري الإرسال..." : "إرسال طلب الدفع"}
              </Button>
            </>
          )}

          {step === "waiting" && (
            <div className="flex flex-col items-center space-y-6 py-10">
              {/* Animated payment indicator — family pulse rings */}
              <div className="relative size-28">
                <div
                  className="absolute inset-0 animate-ping rounded-full border-2 border-orange/20 opacity-75"
                  style={{ animationDuration: "2s" }}
                />
                <div className="absolute inset-2 rounded-full border border-orange/30" />
                <div className="absolute inset-4 flex items-center justify-center rounded-full bg-gradient-to-br from-orange to-orange/80 shadow-lg shadow-orange/25">
                  <Smartphone className="size-8 text-white" aria-hidden="true" />
                </div>
              </div>

              <div className="space-y-1.5 text-center">
                <p className="text-base font-bold">في انتظار تأكيد الدفع</p>
                <p className="mx-auto max-w-[220px] text-xs leading-relaxed text-muted-foreground">
                  بعد التحويل، انتظر موافقة الإدارة
                </p>
              </div>

              {/* Live status indicator */}
              <div className="flex items-center gap-2 rounded-full border border-border/20 bg-muted/30 px-4 py-2">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-orange opacity-75" />
                  <span className="relative size-2 rounded-full bg-orange" />
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {provider === "libyana" ? "بانتظار تأكيد التحويل" : "بانتظار موافقة الإدارة"}
                </span>
              </div>
            </div>
          )}

          {step === "approved" && (
            <div className="flex flex-col items-center space-y-6 py-8">
              <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative size-20">
                <div
                  className="absolute inset-0 animate-ping rounded-full bg-success/20 opacity-75"
                  style={{ animationDuration: "1.5s" }}
                />
                <div className="relative flex size-full items-center justify-center rounded-full bg-gradient-to-br from-success to-success/80 shadow-lg shadow-success/30">
                  <CheckCircle2 className="size-10 text-white" aria-hidden="true" />
                </div>
              </m.div>
              <div className="space-y-2 text-center">
                <m.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-lg font-bold text-success">
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
                  className="h-11 w-full rounded-xl bg-success text-white hover:bg-success/90"
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
                <div
                  className="absolute inset-0 animate-ping rounded-full bg-destructive/20 opacity-75"
                  style={{ animationDuration: "1.5s" }}
                />
                <div className="relative flex size-full items-center justify-center rounded-full bg-gradient-to-br from-destructive to-destructive/80 shadow-lg shadow-destructive/30">
                  <XCircle className="size-10 text-white" aria-hidden="true" />
                </div>
              </m.div>
              <div className="space-y-2 text-center">
                <m.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-lg font-bold text-destructive">
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
                <Button variant="outline" className="h-11 flex-1 rounded-xl" onClick={() => handleOpenChange(false)}>
                  إغلاق
                </Button>
                <Button
                  className="h-11 flex-1 rounded-xl"
                  onClick={() => {
                    setStep("form");
                    setResolutionMsg("");
                    setPhone("");
                    setBankAmount(price);
                    setSenderAccountName("");
                    setSenderAccountNumber("");
                    setReceiptImageUrl("");
                    setPaymentId(null);
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
