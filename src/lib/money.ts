// Money handling — all amounts are integer millimes (1 LYD = 1000 millimes).
// Libyan dinar uses 3 decimal places (dirham), so millimes is the native minor unit.
// NEVER convert through floats: parse/format via string manipulation only.

/** Parse user-entered price string ("12.5" / "12,500" / "12.500" / "٣٫٥٠")
 * into millimes. Throws on invalid. r137: Arabic decimal separator ٫ (U+066B)
 * and Arabic comma ، (U+060C) map to "." like the Western comma — before, they
 * were STRIPPED by the [^\d.] cleanup, so «٣٫٥٠» parsed as 350 LYD instead of
 * 3.50 (100× overcharge on Arabic keyboards, where ٫ is the native decimal). */
export function parseLyd(input: string | number): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error("قيمة غير صالحة");
    return Math.round(input * 1000);
  }
  const cleaned = input.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[,،٫]/g, ".")
    .replace(/[^\d.]/g, "")
    .trim();
  if (!cleaned) throw new Error("أدخل قيمة صحيحة");
  const parts = cleaned.split(".");
  if (parts.length > 2) throw new Error("قيمة غير صالحة");
  const whole = parseInt(parts[0] || "0", 10);
  let frac = parts[1] ?? "";
  if (frac.length > 3) frac = frac.slice(0, 3);
  const fracNum = frac ? parseInt(frac.padEnd(3, "0"), 10) : 0;
  return whole * 1000 + fracNum;
}

/** Format millimes as "12.500" (Western digits, 3 decimals trimmed
 *  gracefully). RAW by design: the product/zone editor forms seed their
 *  inputs from this and round-trip through parseLyd, whose single-dot
 *  contract would reject a grouped "12.500.000". */
export function formatLydAmount(millimes: number): string {
  const sign = millimes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(millimes));
  const whole = Math.floor(abs / 1000);
  const frac = String(abs % 1000).padStart(3, "0");
  return `${sign}${whole}.${frac}`;
}

/** ar-LY dot grouping on integer strings ≥ 1,000 ("12500000" →
 * "12.500.000") — hand-rolled, not Intl, so the output is
 * byte-identical on server and client regardless of ICU build
 * (hydration-safe family policy; matches Intl ar-LY exactly). */
function groupDots(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Format millimes as Arabic-natural currency string: "12.500 د.ل".
 * r133 (A12 S2/R6): the DISPLAY seam now groups the whole part ≥ 1,000
 * ("12.500.000 د.ل") like SB/madarek — KPI/table money rendered
 * "12500000.000" ungrouped before. Forms keep raw formatLydAmount. */
export function formatLyd(millimes: number): string {
  const raw = formatLydAmount(millimes);
  const neg = raw.startsWith("-") ? "-" : "";
  const body = neg ? raw.slice(1) : raw;
  const [whole, frac] = body.split(".");
  return `${neg}${groupDots(whole)}.${frac} د.ل`;
}

/** Parse Lyd input → millimes, or null when invalid/empty (for forms). */
export function tryParseLyd(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined || input === "") return null;
  try {
    return parseLyd(input);
  } catch {
    return null;
  }
}
