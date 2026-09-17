"use client";

// Image compression before upload — canvas resize + JPEG/WebP encode, keeps payload small.

export interface CompressResult {
  dataUrl: string;
  size: number;
}

export async function compressImage(
  file: File,
  opts: { maxDimension?: number; quality?: number; maxSizeBytes?: number } = {}
): Promise<CompressResult> {
  const { maxDimension = 1200, quality = 0.82, maxSizeBytes = 480 * 1024 } = opts;

  if (!file.type.startsWith("image/")) throw new Error("الملف ليس صورة");

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("تعذر قراءة الصورة — قد تكون تالفة");
  });

  let { width, height } = bitmap;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذر معالجة الصورة");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let q = quality;
  let dataUrl = canvas.toDataURL("image/jpeg", q);
  let size = Math.round((dataUrl.length - 23) * 0.75); // approx bytes

  // quality ladder until under cap
  while (size > maxSizeBytes && q > 0.4) {
    q -= 0.12;
    dataUrl = canvas.toDataURL("image/jpeg", q);
    size = Math.round((dataUrl.length - 23) * 0.75);
  }
  if (size > maxSizeBytes) {
    // downscale further
    const s = Math.sqrt(maxSizeBytes / size);
    canvas.width = Math.round(canvas.width * s);
    canvas.height = Math.round(canvas.height * s);
    const ctx2 = canvas.getContext("2d")!;
    ctx2.drawImage(canvas, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    size = Math.round((dataUrl.length - 23) * 0.75);
  }

  return { dataUrl, size };
}
