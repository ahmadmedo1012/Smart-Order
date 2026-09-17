// Slug generation for public storefront URLs (/store/{slug}).

const ARABIC_TO_SLUG: Record<string, string> = {
  ا: "a", ب: "b", ت: "t", ث: "th", ج: "j", ح: "h", خ: "kh", د: "d", ذ: "dh",
  ر: "r", ز: "z", س: "s", ش: "sh", ص: "s", ض: "d", ط: "t", ظ: "z", ع: "a",
  غ: "gh", ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n", ه: "h", و: "w", ي: "y",
  ء: "", ة: "a", ى: "a", آ: "a", أ: "a", إ: "i",
};

const RESERVED = new Set([
  "api", "dashboard", "login", "register", "store", "track", "admin", "settings",
  "public", "assets", "fonts", "uploads", "vercel-admin", "terms", "privacy", "about",
]);

export function slugifyArabic(input: string): string {
  const transliterated = String(input || "")
    .split("")
    .map((ch) => (ARABIC_TO_SLUG[ch] !== undefined ? ARABIC_TO_SLUG[ch] : ch))
    .join("");
  let slug = transliterated
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (!slug || RESERVED.has(slug)) slug = `store-${slug || "ly"}`;
  return slug;
}

/** Ensure uniqueness against DB with suffix -2, -3… */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>
): Promise<string> {
  const root = slugifyArabic(base);
  let candidate = root;
  let i = 2;
  while (await exists(candidate)) {
    candidate = `${root}-${i}`;
    i += 1;
    if (i > 200) {
      candidate = `${root}-${Date.now().toString(36)}`;
      break;
    }
  }
  return candidate;
}
