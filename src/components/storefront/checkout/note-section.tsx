import type { Dispatch, SetStateAction } from "react";

/** 17-DEBT-SO: order note section extracted verbatim from
 * checkout-client.tsx. Pure presentation. */
export function NoteSection({
  customerNote,
  setCustomerNote,
}: {
  customerNote: string;
  setCustomerNote: Dispatch<SetStateAction<string>>;
}) {
  return (
    <section className="mt-3 rounded-xl border border-border bg-card p-4 space-y-1.5">
      <label htmlFor="c-note" className="font-semibold text-sm">ملاحظة للطلب</label>
      <textarea
        id="c-note"
        value={customerNote}
        onChange={(e) => setCustomerNote(e.target.value)}
        rows={2}
        maxLength={300}
        placeholder="أي تفاصيل إضافية تريد إخبار المتجر بها…"
        className="w-full min-h-11 rounded-md border border-input bg-transparent px-4 py-2.5 text-base transition-[color,box-shadow,border-color] duration-(--t-fast) outline-none placeholder:text-placeholder-text focus-visible:border-primary focus-visible:shadow-(--state-input-focus-halo)"
      />
    </section>
  );
}
