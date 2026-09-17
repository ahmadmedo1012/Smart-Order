// Media storage — validated, size-capped, DB-backed (survives redeploys, no external creds needed).
// Validation: magic-byte sniffing (never trust MIME), 500 KB cap, image/* only.
// Future drivers (Vercel Blob / S3) can slot behind the same interface via env flags.

import { db } from "@/lib/db";

const ALLOWED: Array<[string, number[]]> = [
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47]],
  ["image/webp", [0x52, 0x49, 0x46, 0x46]], // RIFF….WEBP
  ["image/gif", [0x47, 0x49, 0x46, 0x38]],
];

export const MAX_MEDIA_BYTES = 500 * 1024;

export interface StoredMedia {
  id: string;
  url: string;
}

/** Validate + persist a base64 image. Returns public URL (/api/media/{id}). */
export async function storeImage(
  base64Data: string,
  opts: { businessId?: string | null; claimedMime?: string } = {}
): Promise<StoredMedia> {
  const b64 = String(base64Data || "").replace(/^data:[^,]+,/, "");
  if (!b64) throw new Error("لم يتم إرسال أي صورة");
  let buf: Buffer;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    throw new Error("صيغة الصورة غير صالحة");
  }
  if (buf.length === 0) throw new Error("الصورة فارغة");
  if (buf.length > MAX_MEDIA_BYTES) throw new Error("حجم الصورة كبير جداً (الحد الأقصى 500 كيلوبايت)");

  let mime = "";
  for (const [m, magic] of ALLOWED) {
    if (magic.every((byte, i) => buf[i] === byte)) {
      // WEBP: RIFF header + WEBP at offset 8
      if (m === "image/webp" && buf.toString("ascii", 8, 12) !== "WEBP") continue;
      mime = m;
      break;
    }
  }
  if (!mime) throw new Error("نوع الملف غير مدعوم — استخدم صورة JPG أو PNG أو WEBP");

  const media = await db.media.create({
    data: {
      businessId: opts.businessId ?? null,
      mimeType: mime,
      size: buf.length,
      data: buf.toString("base64"),
    },
  });
  return { id: media.id, url: `/api/media/${media.id}` };
}

export async function getMedia(id: string) {
  return db.media.findUnique({ where: { id } });
}

export async function deleteMedia(id: string) {
  await db.media.deleteMany({ where: { id } });
}
