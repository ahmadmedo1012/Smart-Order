"use client";

import { Smartphone, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentProvider } from "@/lib/payment-constants";

/**
 * ProviderPicker — family twin (Smart Menu payment/ProviderPicker.tsx):
 * the payment-method tab group: 3-column grid, h-14 border-2 tiles,
 * selected tile carries the flame border + soft orange wash.
 */
export function ProviderPicker({
  provider,
  onSelect,
  requiresBank,
  extra,
}: {
  provider: PaymentProvider;
  onSelect: (p: PaymentProvider) => void;
  requiresBank: boolean;
  /** Extra provider rows (checkout cash methods, etc.) rendered in the same grid. */
  extra?: { id: string; label: string; icon: typeof Smartphone; disabled?: boolean }[];
}) {
  const options: { id: PaymentProvider; label: string; icon: typeof Smartphone; disabled: boolean }[] = [
    { id: "libyana", label: "ليبيانا", icon: Smartphone, disabled: requiresBank },
    { id: "madar", label: "مدار", icon: Smartphone, disabled: requiresBank },
    { id: "bank", label: "تحويل بنكي", icon: Landmark, disabled: false },
  ];

  return (
    <div>
      <span id="payment-method-label" className="block text-sm font-medium leading-none">
        طريقة الدفع
      </span>
      <div role="group" aria-labelledby="payment-method-label" className="mt-1.5 grid grid-cols-3 gap-2">
        {[...options, ...(extra ?? [])].map((opt) => {
          const Icon = opt.icon;
          const selected = provider === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id as PaymentProvider)}
              disabled={opt.disabled}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-1 rounded-xl border-2 text-[13px] font-medium transition-[border-color,box-shadow,color,background-color]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/50",
                opt.disabled && "cursor-not-allowed opacity-40",
                selected
                  ? "border-orange bg-orange/10 shadow-sm"
                  : "border-border/30 text-muted-foreground hover:border-orange/30",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {opt.label}
            </button>
          );
        })}
      </div>
      {requiresBank && (
        /* Family payment notice — accent-foreground (AA 5.42:1) */
        <p className="mt-2 text-xs text-accent-foreground">
          المبالغ فوق ٩٩ د.ل تتطلب تحويل بنكي — اختر &quot;تحويل بنكي&quot; لإتمام الدفع
        </p>
      )}
    </div>
  );
}
