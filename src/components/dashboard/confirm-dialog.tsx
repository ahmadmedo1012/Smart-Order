"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * ConfirmDialog — the ONE destructive-confirmation surface for the
 * dashboard (r131 F3). Replaces the 4 native window.confirm() calls
 * (categories/delivery/payments/staff) with the Radix AlertDialog:
 * Arabic text, solid destructive confirm, footer gap at every
 * breakpoint, focus returns to the trigger on close (Radix built-in),
 * Escape + scrim click cancel.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  destructive = true,
  busy = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive-solid" : "default"}
            disabled={busy}
            /* keep the dialog controlled by the parent: preventDefault
 stops Radix from force-closing before the mutation settles
 (parent closes on success, stays open + toasts on error). */
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * PromptDialog — the styled twin of window.prompt() (replaces the
 * admin subscription reject-note prompt): modal question + labelled
 * textarea + validate-on-submit field error (the shared form-field
 * grammar — aria-invalid halo + inline role=alert message).
 */
export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  fieldLabel,
  placeholder,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  maxLength = 300,
  busy = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  fieldLabel: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  maxLength?: number;
  busy?: boolean;
  onConfirm: (value: string) => void | Promise<void>;
}) {
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  // reset for the next invocation
  React.useEffect(() => {
    if (open) {
      setValue("");
      setError(null);
    }
  }, [open]);

  function submit() {
    if (!value.trim()) {
      setError("أدخل السبب أو اترك الإجراء");
      return;
    }
    onConfirm(value.trim());
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <div className="space-y-2">
          <label htmlFor="prompt-value" className="text-[13px] font-medium">
            {fieldLabel}
          </label>
          <Textarea
            id="prompt-value"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={3}
            aria-invalid={!!error}
            aria-describedby={error ? "prompt-value-error" : undefined}
            className={cn("bg-muted/50")}
          />
          {error && (
            <p
              id="prompt-value-error"
              role="alert"
              className="text-xs font-medium text-destructive-ink"
            >
              {error}
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              submit();
            }}
            disabled={busy}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
