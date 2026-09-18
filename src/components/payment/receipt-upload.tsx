"use client";

import { useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { compressImage } from "@/lib/compress";
import { toast } from "sonner";

/**
 * ReceiptUpload — family twin (Smart Menu payment/ReceiptUpload.tsx):
 * optional bank-receipt image, compressed client-side, uploaded to the
 * public receipt endpoint, previewed as an 80px thumbnail.
 */
export function ReceiptUpload({
  receiptImageUrl,
  onReceiptChange,
}: {
  receiptImageUrl: string;
  onReceiptChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  return (
    <div>
      <span className="block text-sm font-medium leading-none">صورة التحويل (اختياري)</span>
      <div className="mt-1.5 flex items-center gap-2">
        <label
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border/30 px-4 text-sm text-muted-foreground transition-colors hover:bg-accent"
          style={{
            opacity: uploading ? 0.5 : 1,
            pointerEvents: uploading ? "none" : "auto",
          }}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              toast.info("جاري رفع الصورة...");
              try {
                const compressed = await compressImage(file);
                const res = await fetch("/api/subscriptions/receipt", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ data: compressed.dataUrl }),
                });
                const d = await res.json();
                if (!res.ok) {
                  toast.error(d?.error || "فشل رفع الصورة");
                  return;
                }
                if (d.data?.url) onReceiptChange(d.data.url);
                else toast.error("فشل رفع الصورة");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "فشل رفع الصورة");
              } finally {
                setUploading(false);
              }
            }}
          />
          {uploading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
          ) : (
            <Upload className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
          {uploading ? "جاري الرفع..." : "اختر صورة"}
        </label>
        {receiptImageUrl && (
          <button
            type="button"
            onClick={() => onReceiptChange("")}
            className="shrink-0 text-xs text-destructive transition-colors hover:underline"
          >
            حذف الصورة
          </button>
        )}
      </div>
      {receiptImageUrl && (
        /* Family preview — 80px box */
        <div className="mt-2 size-20 overflow-hidden rounded-md border border-border/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={receiptImageUrl} alt="صورة التحويل" className="size-full rounded-none object-cover" />
        </div>
      )}
    </div>
  );
}
