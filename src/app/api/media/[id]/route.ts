// Public media serving with immutable caching (content-addressed by id).

import { NextRequest } from "next/server";
import { getMedia } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[a-z0-9]{20,30}$/i.test(id)) return new Response("Not found", { status: 404 });
  const media = await getMedia(id);
  if (!media) return new Response("Not found", { status: 404 });
  const buf = Buffer.from(media.data, "base64");
  const body = new Uint8Array(buf);
  return new Response(body, {
    headers: {
      "Content-Type": media.mimeType,
      "Content-Length": String(buf.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
