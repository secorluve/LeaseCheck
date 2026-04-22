import { cleanText } from "./helpers";

const DISTRICT_MAP: Record<string, string> = {
  esil: "Есильский район",
  esilyskiy: "Есильский район",
  esiliyskiy: "Есильский район",
  almatinskiy: "Алматинский район",
  almaly: "Алмалинский район",
  nauryzbay: "Наурызбайский район",
  nauryzbai: "Наурызбайский район",
  bostandyk: "Бостандыкский район",
  medeu: "Медеуский район",
  turksib: "Турксибский район",
  zhetysu: "Жетысуский район",
  sarayshyk: "Сарайшык район",
  saraishyk: "Сарайшык район",
  nuras: "Нура район",
  nura: "Нура район",
  saryarka: "Сарыарка район",
};

export function normalizeDistrict(value: unknown): string | undefined {
  const input = cleanText(value);
  if (!input) return undefined;
  const rawIsCyrillic = /[а-яё]/i.test(input);

  const normalized = input
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/\bр\s*[-.]?\s*н\b/gi, " ")
    .replace(/\br\s*[-.]?\s*n\b/gi, " ")
    .replace(/\b(rn|r-n|raion|rayon|rajon|district|район)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const key = normalized.replace(/\s+/g, "").replace(/[^a-zа-яё]/gi, "");

  const direct = DISTRICT_MAP[key];
  if (direct) return direct;

  for (const [slug, label] of Object.entries(DISTRICT_MAP)) {
    if (key.includes(slug)) return label;
  }

  const cyrillicCandidate = rawIsCyrillic ? normalized : translitToCyrillic(normalized);
  const prettyBase = cyrillicCandidate || capitalizeWords(normalized);
  const pretty = prettyBase.replace(/\s+/g, " ").trim();

  const cleanPretty = pretty.replace(/\b(р|н)\b/gi, "").replace(/\s+/g, " ").trim();
  const formatted = /район/i.test(cleanPretty) ? prettifyDistrictCase(cleanPretty) : `${prettifyDistrictCase(cleanPretty)} район`;
  if (rawIsCyrillic) {
    const rawFormatted = /район/i.test(input) ? prettifyDistrictCase(input) : `${prettifyDistrictCase(input)} район`;
    return isLikelyCorruptedDistrict(formatted) ? rawFormatted : formatted;
  }
  return formatted;
}

export type RentalType = "посуточно" | "помесячно" | "долгосрочно" | "по часам" | "на ночь";

export function detectRentalType(input: {
  explicit?: unknown;
  title?: unknown;
  description?: unknown;
  category?: unknown;
  priceText?: unknown;
}): { value?: RentalType; inferred: boolean } {
  const explicit = cleanText(input.explicit)?.toLowerCase();
  const title = cleanText(input.title)?.toLowerCase() ?? "";
  const description = cleanText(input.description)?.toLowerCase() ?? "";
  const category = cleanText(input.category)?.toLowerCase() ?? "";
  const priceText = cleanText(input.priceText)?.toLowerCase() ?? "";
  const text = `${explicit ?? ""} ${title} ${description} ${category} ${priceText}`;

  if (/(за\s*сутки|за\s*день|посуточ|сутк)/i.test(text)) return { value: "посуточно", inferred: explicit === undefined };
  if (/(за\s*месяц|в\s*месяц|помесяч|ежемесяч)/i.test(text)) return { value: "помесячно", inferred: explicit === undefined };
  if (/(долгосроч|на длительный срок|длительно)/i.test(text)) return { value: "долгосрочно", inferred: explicit === undefined };
  if (/(по часам|почасов|часов)/i.test(text)) return { value: "по часам", inferred: explicit === undefined };
  if (/(на ночь|ночн)/i.test(text)) return { value: "на ночь", inferred: explicit === undefined };

  return { value: undefined, inferred: false };
}

export function extractPricePeriodText(candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    const cleaned = cleanText(candidate);
    if (!cleaned) continue;
    if (/(₸|\bkzt\b|\bтенге\b).{0,40}(за\s*сутки|за\s*день|за\s*месяц|в\s*месяц|по\s*часам|на\s*ночь)/i.test(cleaned)) {
      return cleaned;
    }
    if (/(за\s*сутки|за\s*день|за\s*месяц|в\s*месяц|долгосрочно|по\s*часам|на\s*ночь)/i.test(cleaned)) {
      return cleaned;
    }
  }
  return undefined;
}

function capitalizeWords(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function prettifyDistrictCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function translitToCyrillic(value: string): string {
  let out = value.toLowerCase();
  const replacements: Array<[RegExp, string]> = [
    [/ya/g, "я"],
    [/yu/g, "ю"],
    [/yo/g, "ё"],
    [/zh/g, "ж"],
    [/ch/g, "ч"],
    [/shch/g, "щ"],
    [/sh/g, "ш"],
    [/kh/g, "х"],
    [/ts/g, "ц"],
    [/iy/g, "ий"],
    [/yi/g, "ый"],
    [/ye/g, "е"],
    [/a/g, "а"],
    [/b/g, "б"],
    [/v/g, "в"],
    [/g/g, "г"],
    [/d/g, "д"],
    [/e/g, "е"],
    [/z/g, "з"],
    [/i/g, "и"],
    [/j/g, "й"],
    [/k/g, "к"],
    [/l/g, "л"],
    [/m/g, "м"],
    [/n/g, "н"],
    [/o/g, "о"],
    [/p/g, "п"],
    [/r/g, "р"],
    [/s/g, "с"],
    [/t/g, "т"],
    [/u/g, "у"],
    [/f/g, "ф"],
    [/h/g, "х"],
    [/y/g, "ы"],
    [/q/g, "к"],
    [/w/g, "в"],
    [/x/g, "кс"],
    [/c/g, "к"],
  ];
  for (const [regex, replacement] of replacements) {
    out = out.replace(regex, replacement);
  }
  return out.replace(/\s+/g, " ").trim();
}

function isLikelyCorruptedDistrict(value: string): boolean {
  return /[a-z]/i.test(value) || /\b(Р Н|Rn|R N)\b/i.test(value) || value.length < 4;
}
