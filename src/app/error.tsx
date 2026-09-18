"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/shared/states";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] render error:", error?.message, error?.digest);
  }, [error]);

  return (
    <main dir="rtl" className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center px-6">
        <ErrorState
          title="حدث خطأ غير متوقع"
          description="نعتذر — حدث خطأ أثناء معالجة الطلب. حاول مرة أخرى، وإذا استمرت المشكلة تواصل معنا لاحقاً."
          retry={reset}
        />
      </div>
    </main>
  );
}
