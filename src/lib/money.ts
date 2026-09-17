// Money handling — all amounts are integer millimes (1 LYD = 1000 millimes).
// Libyan dinar uses 3 decimal places (dirham), so millimes is the native minor unit.
// NEVER convert through floats: parse/format via string manipulation only.

/** Parse user-entered price string ("12.5" / "12,500" / "12.500") into millimes. Throws on invalid. */
export function parseLyd(input: string | number): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error("قيمة غير صالحة");
    return Math.round(input * 1000);
  }
  const cleaned = input.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/,/g, ".")
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

/** Format millimes as "12.500" (Western digits, 3 decimals trimmed gracefully). */
export function formatLydAmount(millimes: number): string {
  const sign = millimes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(millimes));
  const whole = Math.floor(abs / 1000);
  const frac = String(abs % 1000).padStart(3, "0");
  return `${sign}${whole}.${frac}`;
}

/** Format millimes as Arabic-natural currency string: "12.500 د.ل" */
export function formatLyd(millimes: number): string {
  return `${formatLydAmount(millimes)} د.ل`;
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

/** Convert millimes → float LYD ONLY for display charts (never for math). */
export function toLydFloat(millimes: number): number {
  return Math.round(millimes) / 1000;
}

export function sumMillimes(values: number[]): number {
  let total = 0;
  for (const v of values) total += Math.round(v);
  return total;
}
