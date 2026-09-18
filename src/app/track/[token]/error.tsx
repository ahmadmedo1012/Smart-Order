"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/states";

export default function TrackError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[track] render error:", error?.message, error?.digest);
  }, [error]);

  return (
    <main dir="rtl" className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center px-6">
        <ErrorState
          title="تعذر تحميل الطلب"
          description="حدث خطأ أثناء تحميل بيانات الطلب. تحقق من الرابط وحاول مرة أخرى."
          retry={reset}
        />
      </div>
    </main>
  );
}
