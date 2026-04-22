import {
  asStringArray,
  cleanText,
  filterListingImages,
  parseJsonSafe,
  pickCurrency,
  toIntegerInRange,
  toNumber,
} from "./helpers";
import { deepCollectByKey, deepFindFirst, extractScriptJsonObjects, type FieldTrace } from "./debug";
import { detectRentalType, extractPricePeriodText } from "./normalization";
import type { ParseFailure, SourceRawListing } from "./types";

function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const parsed = parseJsonSafe(match[1]);
    if (parsed) blocks.push(parsed);
  }
  return blocks;
}

function extractInlineState(html: string): Record<string, unknown> | undefined {
  const match =
    html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/i) ??
    html.match(/window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/i);
  if (!match) return undefined;
  return parseJsonSafe<Record<string, unknown>>(match[1]);
}

export function parseOlx(html: string, url: string): SourceRawListing | ParseFailure {
  const traces: Record<string, FieldTrace> = {};
  const warnings: string[] = [];
  const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const descriptionMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const jsonLdItems = extractJsonLdBlocks(html);
  const firstJsonLd = jsonLdItems.find((item) => item && typeof item === "object") as Record<string, unknown> | undefined;
  const inlineState = extractInlineState(html);
  const scriptObjects = extractScriptJsonObjects(html);
  const scriptRoots = [inlineState, ...scriptObjects.map((item) => item.data)].filter(Boolean);

  const offer = firstJsonLd?.offers as Record<string, unknown> | undefined;
  const location = firstJsonLd?.address as Record<string, unknown> | undefined;
  const geo = firstJsonLd?.geo as Record<string, unknown> | undefined;
  const imageCandidates = filterListingImages([
    ...asStringArray(firstJsonLd?.image),
    ...Array.from(html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)).map((m) => m[1]),
    ...scriptRoots.flatMap((root) =>
      deepCollectByKey(root, ["images", "image", "photos", "photo", "gallery"]).flatMap((item) => asStringArray(item.value)),
    ),
  ]);
  const scriptDescription = firstScriptValue(scriptRoots, ["description", "descriptionText", "text", "body"]);
  const descriptionDom =
    cleanText(html.match(/<div[^>]*data-cy=["']ad_description["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]?.replace(/<[^>]+>/g, " ")) ??
    cleanText(html.match(/<div[^>]*class=["'][^"']*descriptioncontent[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]?.replace(/<[^>]+>/g, " "));
  const descriptionValue = cleanText(firstJsonLd?.description) ?? cleanText(scriptDescription) ?? descriptionDom ?? cleanText(descriptionMatch?.[1]);
  const rentalTypeDetected = detectRentalType({
    explicit: firstScriptValue(scriptRoots, ["rentPeriod", "leaseType", "rentalType"]),
    title: cleanText(firstJsonLd?.name) ?? cleanText(titleMatch?.[1]),
    description: descriptionValue,
    category: firstScriptValue(scriptRoots, ["categoryName", "category", "parentCategory"]),
    priceText: extractPricePeriodText([
      firstScriptValue(scriptRoots, ["priceText", "priceLabel", "formattedPrice", "priceWithPeriod"]),
      cleanText(html.match(/(\d[\d\s]*\s*(?:₸|тенге|kzt)[^<]{0,40})/i)?.[1]),
      cleanText(descriptionMatch?.[1]),
      cleanText(titleMatch?.[1]),
    ]),
  });
  const rawPriceText = extractPricePeriodText([
    firstScriptValue(scriptRoots, ["priceText", "priceLabel", "formattedPrice", "priceWithPeriod"]),
    cleanText(html.match(/(\d[\d\s]*\s*(?:₸|тенге|kzt)[^<]{0,40})/i)?.[1]),
    cleanText(descriptionMatch?.[1]),
    cleanText(titleMatch?.[1]),
  ]);

  const scriptRooms = firstScriptValue(scriptRoots, ["rooms", "roomCount", "rooms_count"]);
  const scriptArea = firstScriptValue(scriptRoots, ["area", "square", "size"]);
  const scriptFloor = firstScriptValue(scriptRoots, ["floor"]);
  const scriptTotalFloors = firstScriptValue(scriptRoots, ["floors", "totalFloors", "floorCount", "storeys"]);
  const floorPair = html.match(/(\d{1,3})\s*\/\s*(\d{1,3})/i);
  const parsedRooms = toIntegerInRange(scriptRooms, 1, 20);
  const parsedArea = toNumber(scriptArea);
  const parsedFloor = toIntegerInRange(scriptFloor, 1, 120) ?? toIntegerInRange(floorPair?.[1], 1, 120);
  const parsedTotalFloors = toIntegerInRange(scriptTotalFloors, 1, 200) ?? toIntegerInRange(floorPair?.[2], 1, 200);
  const sellerName =
    firstScriptValue(scriptRoots, ["sellerName", "name", "userName"]) ??
    cleanText(html.match(/<h4[^>]*data-testid=["']user_profile_name["'][^>]*>([\s\S]*?)<\/h4>/i)?.[1]?.replace(/<[^>]+>/g, " "));
  const sellerType =
    cleanText(firstScriptValue(scriptRoots, ["sellerType", "accountType", "userType", "businessType"])) ??
    cleanText(html.match(/(частное лицо|бизнес|компания|агентство)/i)?.[1]);
  const addressFromScript = firstScriptValue(scriptRoots, ["streetAddress", "address", "locationName"]);
  const cityFromScript = firstScriptValue(scriptRoots, ["cityName", "city", "addressLocality"]);
  const districtFromScript = firstScriptValue(scriptRoots, ["district", "districtName", "regionName"]);

  if (!descriptionValue) warnings.push("description_not_found");
  if (imageCandidates.length === 0) warnings.push("images_not_found");
  if (!sellerType && !sellerName) warnings.push("seller_not_found");
  if (parsedFloor && parsedTotalFloors && parsedFloor > parsedTotalFloors) warnings.push("floor_above_total_floors");

  traces.description = firstJsonLd?.description
    ? { source: "json_ld", path: "$.description" }
    : scriptDescription
      ? { source: "script_json" }
      : descriptionDom
        ? { source: "dom", path: "[data-cy=ad_description]" }
        : descriptionMatch
          ? { source: "meta", path: "og:description" }
          : { source: "none" };
  traces.images = imageCandidates.length > 0 ? { source: "script_json", note: `${imageCandidates.length} urls` } : { source: "none" };
  traces.rooms = parsedRooms !== undefined ? { source: "script_json", note: "validated integer 1..20" } : { source: "none" };
  traces.floor = parsedFloor !== undefined ? { source: scriptFloor ? "script_json" : "regex" } : { source: "none" };
  traces.totalFloors = parsedTotalFloors !== undefined ? { source: scriptTotalFloors ? "script_json" : "regex" } : { source: "none" };
  traces.seller = sellerType || sellerName ? { source: sellerType ? "script_json" : "dom" } : { source: "none" };
  traces.rentalType = rentalTypeDetected.value
    ? { source: rentalTypeDetected.inferred ? "fallback" : "script_json", note: rentalTypeDetected.inferred ? "inferred from text" : "explicit field" }
    : { source: "none" };

  const result: SourceRawListing = {
    source: "olx",
    url,
    title: cleanText(firstJsonLd?.name) ?? cleanText(titleMatch?.[1]),
    description: descriptionValue,
    price: toNumber(offer?.price) ?? toNumber(html.match(/"price"\s*:\s*"?(.*?)"?(,|\})/i)?.[1]),
    currency: cleanText(offer?.priceCurrency) ?? pickCurrency(cleanText(descriptionMatch?.[1])),
    city: cleanText(location?.addressLocality) ?? cleanText(cityFromScript) ?? cleanText(html.match(/"cityName"\s*:\s*"([^"]+)"/i)?.[1]),
    district: cleanText(html.match(/"district"\s*:\s*"([^"]+)"/i)?.[1]) ?? cleanText(districtFromScript),
    address: cleanText(location?.streetAddress) ?? cleanText(addressFromScript),
    rooms: parsedRooms,
    areaSqm: parsedArea,
    floor: parsedFloor,
    totalFloors: parsedTotalFloors,
    housingType: cleanText(firstScriptValue(scriptRoots, ["propertyType", "housingType", "categoryName"])),
    condition: cleanText(firstScriptValue(scriptRoots, ["condition", "repair", "state"])),
    phoneAvailable: /показать телефон|phone|call/i.test(html),
    sellerType: cleanText(sellerType ?? sellerName),
    rentalType: rentalTypeDetected.value,
    rentalTypeInferred: rentalTypeDetected.inferred,
    rawPriceText,
    images: imageCandidates,
    coordinates:
      toNumber(geo?.latitude) !== undefined && toNumber(geo?.longitude) !== undefined
        ? { lat: toNumber(geo?.latitude) as number, lng: toNumber(geo?.longitude) as number }
        : undefined,
    rawText: descriptionValue,
    rawAddress: cleanText(location?.streetAddress),
    publishedAt: cleanText(firstJsonLd?.datePosted as string | undefined),
    metadata: {
      jsonLdCount: jsonLdItems.length,
      hasInlineState: Boolean(inlineState),
      parserDebug: traces,
      scriptObjectCount: scriptObjects.length,
    },
    extraFields: inlineState ? { inlineState, sellerName } : { sellerName },
    extractionWarnings: warnings,
  };

  if (!result.title && !result.price && imageCandidates.length === 0) {
    return {
      ok: false,
      error: {
        code: "parse_failed",
        message: "Unable to parse OLX listing fields from page content.",
        source: "olx",
        recoverable: true,
      },
    };
  }

  return result;
}

function firstScriptValue(roots: unknown[], keys: string[]): string | undefined {
  for (const root of roots) {
    const found = deepFindFirst(root, keys);
    const cleaned = cleanText(found?.value);
    if (cleaned) return cleaned;
    if (typeof found?.value === "number") return String(found.value);
  }
  return undefined;
}
