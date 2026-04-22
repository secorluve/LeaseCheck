export function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

export function firstDefined<T>(...values: Array<T | undefined>): T | undefined {
  return values.find((value) => value !== undefined);
}

export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;

  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toIntegerInRange(value: unknown, min: number, max: number): number | undefined {
  const parsed = toNumber(value);
  if (parsed === undefined) return undefined;
  const intVal = Math.trunc(parsed);
  if (!Number.isFinite(intVal)) return undefined;
  if (intVal < min || intVal > max) return undefined;
  return intVal;
}

export function extractNumberByLabel(text: string, label: string): number | undefined {
  const regex = new RegExp(`${label}[^\\d]*(\\d+(?:[.,]\\d+)?)`, "i");
  const match = text.match(regex);
  return match ? toNumber(match[1]) : undefined;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return cleanText(item);
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        return cleanText(obj.url) ?? cleanText(obj.contentUrl) ?? cleanText(obj.src);
      }
      return undefined;
    })
    .filter((item): item is string => Boolean(item));
}

export function parseJsonSafe<T = unknown>(value: string): T | undefined {
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function pickCurrency(text?: string): string | undefined {
  if (!text) return undefined;
  if (/₸|kzt|тенге/i.test(text)) return "KZT";
  if (/\$/i.test(text)) return "USD";
  if (/€|eur/i.test(text)) return "EUR";
  return undefined;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&");
}

export function extractLabeledNumber(text: string, labels: string[]): number | undefined {
  for (const label of labels) {
    const regex = new RegExp(`(?:^|\\b)${label}[^\\d]{0,12}(\\d{1,4}(?:[.,]\\d+)?)`, "i");
    const match = text.match(regex);
    if (match) return toNumber(match[1]);
  }
  return undefined;
}

export function extractLabeledText(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const regex = new RegExp(`${label}\\s*[:\\-]?\\s*([^\\n\\r,|]{2,60})`, "i");
    const match = text.match(regex);
    const cleaned = cleanText(match?.[1]);
    if (cleaned) return cleaned;
  }
  return undefined;
}

export function filterListingImages(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const normalized = cleanText(url);
    if (!normalized) continue;
    if (!/^https?:\/\//i.test(normalized)) continue;
    if (/\b(icon|logo|avatar|sprite|placeholder|banner)\b/i.test(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}
