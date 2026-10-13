import type { Dispatch, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldError } from "@/components/dashboard/form-field";
import { formatLyd } from "@/lib/money";
import { LIBYA_CITIES } from "@/lib/constants";
import { MapPin } from "lucide-react";
import type { FieldErrors, StoreData } from "./types";

/** 17-DEBT-SO: delivery details section extracted verbatim from
 * checkout-client.tsx. Zone tiles + address textarea keep their exact
 * handler bodies (per-field error clearing, min-order hint). */
export function DeliveryDetailsSection({
  data,
  loadError,
  city,
  setCity,
  area,
  setArea,
  zoneId,
  setZoneId,
  addressLine,
  setAddressLine,
  errors,
  setErrors,
  minOrderUnmet,
  zone,
  subtotal,
}: {
  data: StoreData | null;
  loadError: boolean;
  city: string;
  setCity: Dispatch<SetStateAction<string>>;
  area: string;
  setArea: Dispatch<SetStateAction<string>>;
  zoneId: string;
  setZoneId: Dispatch<SetStateAction<string>>;
  addressLine: string;
  setAddressLine: Dispatch<SetStateAction<string>>;
  errors: FieldErrors;
  setErrors: Dispatch<SetStateAction<FieldErrors>>;
  minOrderUnmet: boolean;
  zone: StoreData["deliveryZones"][number] | null;
  subtotal: number;
}) {
  return (
    <section className="mt-3 rounded-xl border border-border bg-card p-4 space-y-3.5">
      <h2 className="font-semibold text-sm flex items-center gap-2">
        <MapPin className="size-4 text-accent-foreground" aria-hidden="true" />
        عنوان التوصيل
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="c-city" className="text-xs font-medium text-muted-foreground">المدينة *</label>
          <select
            id="c-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full h-11 rounded-md border border-input bg-background px-4 text-base transition-[color,box-shadow,border-color] duration-(--t-fast) outline-none focus-visible:border-primary focus-visible:shadow-(--state-input-focus-halo)"
          >
            {LIBYA_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="c-area2" className="text-xs font-medium text-muted-foreground">المنطقة</label>
          <Input
            id="c-area2"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            maxLength={60}
            placeholder="مثال: تاجوراء"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">منطقة التوصيل *</label>
        <div
          id="c-zone-grid"
          role="group"
          aria-label="منطقة التوصيل"
          tabIndex={-1}
          aria-describedby={errors.zone ? "c-zone-error" : undefined}
          className="grid grid-cols-2 sm:grid-cols-3 gap-2 focus-visible:outline-none"
        >
          {!data ? (
            !loadError && (
              <>
                <Skeleton className="h-[76px] rounded-sm" />
                <Skeleton className="h-[76px] rounded-sm" />
                <Skeleton className="h-[76px] rounded-sm" />
              </>
            )
          ) : (
            data.deliveryZones.map((z) => {
            const selected = zoneId === z.id;
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => {
                  setZoneId(z.id);
                  if (errors.zone) setErrors((x) => ({ ...x, zone: undefined }));
                }}
                aria-pressed={selected}
                /* P6-2-f3 (GROUP 1): stamp grammar — squared zone tiles
                   (1px family border; selected = orange + soft wash);
                   the handler body below is untouched. */
                className={`rounded-sm border p-2.5 text-center transition-colors ${
                  selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="text-xs font-semibold truncate">{z.name}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-mono tabular-nums">
                  {z.fee === 0 ? "مجاناً" : formatLyd(z.fee)}
                </div>
                {z.minOrder > 0 && (
                  <div className="text-[11px] text-muted-foreground font-mono tabular-nums">حد أدنى {formatLyd(z.minOrder)}</div>
                )}
              </button>
            );
            })
          )}
        </div>
        {errors.zone && <FieldError id="c-zone-error">{errors.zone}</FieldError>}
        {minOrderUnmet && (
          <p className="text-xs text-destructive-ink rounded-sm bg-destructive/10 border border-destructive/25 px-3 py-2">
            الحد الأدنى للطلب في {zone?.name} هو {formatLyd(zone!.minOrder)} — أضف منتجات بقيمة{" "}
            <span className="font-mono font-bold tabular-nums">{formatLyd(zone!.minOrder - subtotal)}</span> أخرى
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <label htmlFor="c-address" className="text-xs font-medium text-muted-foreground">العنوان بالتفصيل *</label>
        <textarea
          id="c-address"
          value={addressLine}
          onChange={(e) => {
            setAddressLine(e.target.value);
            if (errors.address) setErrors((x) => ({ ...x, address: undefined }));
          }}
          rows={2}
          maxLength={200}
          placeholder="الشارع، أقرب معلم، رقم المنزل…"
          aria-invalid={!!errors.address}
          aria-describedby={errors.address ? "c-address-error" : undefined}
          className="w-full min-h-11 rounded-md border border-input bg-background px-4 py-2.5 text-base transition-[color,box-shadow,border-color] duration-(--t-fast) outline-none placeholder:text-placeholder-text focus-visible:border-primary focus-visible:shadow-(--state-input-focus-halo) aria-invalid:border-destructive aria-invalid:shadow-(--state-input-error-halo)"
        />
        {errors.address && <FieldError id="c-address-error">{errors.address}</FieldError>}
      </div>
    </section>
  );
}
