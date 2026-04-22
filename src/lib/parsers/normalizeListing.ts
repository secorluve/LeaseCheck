import { asStringArray, cleanText, toIntegerInRange, toNumber } from "./helpers";
import { normalizeDistrict } from "./normalization";
import type { NormalizedListing, SourceRawListing } from "./types";

export function normalizeListing(raw: SourceRawListing): NormalizedListing {
  const coordinates = toCoordinates(raw.coordinates);

  return {
    source: raw.source,
    url: raw.url,
    title: cleanText(raw.title),
    description: cleanText(raw.description),
    price: toNumber(raw.price),
    currency: cleanText(raw.currency),
    city: cleanText(raw.city),
    district: normalizeDistrict(raw.district),
    address: cleanText(raw.address),
    rooms: toIntegerInRange(raw.rooms, 1, 20),
    areaSqm: toNumber(raw.areaSqm),
    floor: toIntegerInRange(raw.floor, 1, 120),
    totalFloors: toIntegerInRange(raw.totalFloors, 1, 200),
    housingType: cleanText(raw.housingType),
    condition: cleanText(raw.condition),
    phoneAvailable: typeof raw.phoneAvailable === "boolean" ? raw.phoneAvailable : undefined,
    sellerType: cleanText(raw.sellerType),
    rentalType: cleanText(raw.rentalType),
    rentalTypeInferred: typeof raw.rentalTypeInferred === "boolean" ? raw.rentalTypeInferred : undefined,
    rawPriceText: cleanText(raw.rawPriceText),
    images: asStringArray(raw.images),
    coordinates,
    rawText: cleanText(raw.rawText),
    rawAddress: cleanText(raw.rawAddress),
    publishedAt: cleanText(raw.publishedAt),
    metadata: raw.metadata,
    extraFields: raw.extraFields,
    extractionWarnings: Array.isArray(raw.extractionWarnings)
      ? raw.extractionWarnings
          .map((item) => cleanText(item))
          .filter((item): item is string => Boolean(item))
      : undefined,
  };
}

function toCoordinates(value: unknown): { lat: number; lng: number } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const obj = value as Record<string, unknown>;
  const lat = toNumber(obj.lat);
  const lng = toNumber(obj.lng);
  return lat !== undefined && lng !== undefined ? { lat, lng } : undefined;
}
