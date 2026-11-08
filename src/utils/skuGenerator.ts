// src/utils/skuGenerator.ts

/**
 * 2 words ("Lux Cozi") -> "LUC" (2 chars from 1st + 1 char from 2nd)
 * 1 word  ("Rupa")     -> "RUP" (first 3 chars)
 */
export function smartCode(input?: string, fallback: string = 'GEN'): string {
  if (!input || !input.trim()) return fallback;
  const words = input.trim().toUpperCase().split(/\s+/);

  if (words.length >= 2) {
    const w1 = words[0].replace(/[^A-Z0-9]/g, '');
    const w2 = words[1].replace(/[^A-Z0-9]/g, '');
    if (w1.length >= 2 && w2.length >= 1) {
      return w1.substring(0, 2) + w2.substring(0, 1);
    }
  }

  const cleaned = input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!cleaned) return fallback;
  return cleaned.length >= 3 ? cleaned.substring(0, 3) : cleaned;
}

/**
 * Normalizes garment sizes: "85cm", "85 CM", "85-cm" -> "85"
 */
export function normalizeSize(size?: string): string {
  if (!size || !size.trim()) return 'FS';
  const s = size
    .toUpperCase()
    .trim()
    .replace(/CM|CMS|INCH|INCHES|\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');
  return s || 'FS';
}

/**
 * Generates Product Code: e.g., "LUC-MEV-VEN"
 */
export function generateSmartProductCode(
  brand?: string,
  category?: string,
  productName?: string
): string {
  const b = smartCode(brand, 'GEN');
  const c = smartCode(category, 'APP');
  const p = smartCode(productName, 'ITM');
  return `${b}-${c}-${p}`;
}

/**
 * Generates Variant SKU: e.g., "LUC-MEV-VEN-WHI-85"
 */
export function generateSmartVariantSku(
  brand?: string,
  category?: string,
  productName?: string,
  color?: string,
  size?: string
): string {
  const b = smartCode(brand, 'GEN');
  const c = smartCode(category, 'APP');
  const p = smartCode(productName, 'ITM');
  const col = smartCode(color, 'STD');
  const s = normalizeSize(size);
  return `${b}-${c}-${p}-${col}-${s}`;
}