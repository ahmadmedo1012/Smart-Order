"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/states";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // surfaced in server logs — never shown to the customer
    console.error("[store] render error:", error?.message, error?.digest);
  }, [error]);

  return (
    <main dir="rtl" className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center px-6">
        <ErrorState
          title="تعذر تحميل المتجر"
          description="حدث خطأ أثناء تحميل بيانات المتجر. تحقق من اتصالك وحاول مرة أخرى."
          retry={reset}
        />
      </div>
    </main>
  );
}
