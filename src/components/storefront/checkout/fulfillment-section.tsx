import type { Dispatch, SetStateAction } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FULFILLMENT_AR } from "@/lib/constants";
import { Truck, Store } from "lucide-react";
import type { StoreData } from "./types";

/** 17-DEBT-SO: fulfillment section extracted verbatim from
 * checkout-client.tsx. Pure presentation — receives the state + setter. */
export function FulfillmentSection({
  data,
  loadError,
  fulfillment,
  setFulfillment,
}: {
  data: StoreData | null;
  loadError: boolean;
  fulfillment: "DELIVERY" | "PICKUP";
  setFulfillment: Dispatch<SetStateAction<"DELIVERY" | "PICKUP">>;
}) {
  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-4">
      <h2 className="font-semibold text-sm mb-3">طريقة الاستلام</h2>
      <div className="grid grid-cols-2 gap-2">
        {!data ? (
          loadError ? (
            <p className="col-span-2 text-xs text-muted-foreground">خيارات الاستلام تظهر بعد إعادة المحاولة.</p>
          ) : (
            <>
              <Skeleton className="h-[76px] rounded-sm" />
              <Skeleton className="h-[76px] rounded-sm" />
            </>
          )
        ) : (
          (data.deliveryZones.length ? ["DELIVERY", "PICKUP"] : ["PICKUP"]).map((t) => {
          const selected = fulfillment === t;
          const Icon = t === "DELIVERY" ? Truck : Store;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFulfillment(t as "DELIVERY" | "PICKUP")}
              aria-pressed={selected}
              /* P6-2-f3 (GROUP 1): stamp grammar — squared corners + 1px
                 family border; selected = delivery-orange border + soft
                 wash (aria-pressed/logic untouched). */
              className={`flex items-center gap-2.5 rounded-sm border p-3.5 text-start transition-colors ${
                selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
              }`}
            >
              <Icon className={`size-5 shrink-0 ${selected ? "text-accent-foreground" : "text-muted-foreground"}`} aria-hidden="true" />
              <div>
                <div className="text-sm font-semibold">{FULFILLMENT_AR[t as "DELIVERY" | "PICKUP"]}</div>
                {t === "DELIVERY" && <div className="text-[11px] text-muted-foreground mt-0.5">حسب منطقتك</div>}
              </div>
            </button>
          );
          })
        )}
      </div>
    </section>
  );
}
