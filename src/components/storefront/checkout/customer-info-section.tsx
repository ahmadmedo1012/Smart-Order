import type { Dispatch, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/dashboard/form-field";
import { User, Phone } from "lucide-react";
import type { FieldErrors } from "./types";

/** 17-DEBT-SO: customer info section extracted verbatim from
 * checkout-client.tsx. Each field clears its own error on change —
 * the r132-F1a recipe, handler bodies unchanged. */
export function CustomerInfoSection({
  name,
  setName,
  phone,
  setPhone,
  errors,
  setErrors,
}: {
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  phone: string;
  setPhone: Dispatch<SetStateAction<string>>;
  errors: FieldErrors;
  setErrors: Dispatch<SetStateAction<FieldErrors>>;
}) {
  return (
    <section className="mt-3 rounded-xl border border-border bg-card p-4 space-y-3.5">
      <h2 className="font-semibold text-sm">بياناتك</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="c-name" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <User className="size-3" aria-hidden="true" />
            الاسم الكامل *
          </label>
          <Input
            id="c-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
            }}
            autoComplete="name"
            maxLength={80}
            placeholder="اسمك"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "c-name-error" : undefined}
          />
          {errors.name && <FieldError id="c-name-error">{errors.name}</FieldError>}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="c-phone" className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Phone className="size-3" aria-hidden="true" />
            رقم الهاتف *
          </label>
          <Input
            id="c-phone"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (errors.phone) setErrors((x) => ({ ...x, phone: undefined }));
            }}
            autoComplete="tel"
            inputMode="tel"
            dir="ltr"
            maxLength={20}
            placeholder="0912345678"
            className="text-start tabular-nums"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "c-phone-error" : undefined}
          />
          {errors.phone && <FieldError id="c-phone-error">{errors.phone}</FieldError>}
        </div>
      </div>
    </section>
  );
}
