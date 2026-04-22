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
import { detectRentalType, extractPricePeriodText, normalizeDistrict } from "./normalization";
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

function flattenJsonLdItem(item: unknown): Record<string, unknown>[] {
  if (!item || typeof item !== "object") return [];
  const obj = item as Record<string, unknown>;
  if (Array.isArray(obj["@graph"])) {
    return obj["@graph"].filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object");
  }
  return [obj];
}

function extractKrishaWindowData(html: string): Record<string, unknown> | null {
  const scriptMatch = html.match(/<script[^>]+id=["']jsdata["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!scriptMatch) return null;
  const scriptContent = scriptMatch[1];
  const dataMatch = scriptContent.match(/window\.data\s*=\s*({[\s\S]*?});/);
  if (!dataMatch) return null;
  return parseJsonSafe(dataMatch[1]);
}

function detectRentalTypeFromPricePeriod(text: string | null | undefined): "помесячно" | "посуточно" | "по часам" | null {
  if (!text) return null;
  const cleaned = cleanText(text).toLowerCase();
  if (/(за\s*месяц|в\s*месяц)/i.test(cleaned)) return "помесячно";
  if (/(за\s*сутки|за\s*день)/i.test(cleaned)) return "посуточно";
  if (/(за\s*час|по\s*часам)/i.test(cleaned)) return "по часам";
  return null;
}

export function parseKrisha(html: string, url: string): SourceRawListing | ParseFailure {
  const traces: Record<string, FieldTrace> = {};
  const warnings: string[] = [];

  // Extract structured data from window.data
  const windowData = extractKrishaWindowData(html);
  console.log("Krisha window.data extracted:", windowData ? "success" : "failed");

  const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const descriptionMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);

  const jsonLdItems = extractJsonLdBlocks(html).flatMap(flattenJsonLdItem);
  const listingItem =
    jsonLdItems.find((item) => item["@type"] === "Product") ??
    jsonLdItems.find((item) => item["@type"] === "Offer") ??
    jsonLdItems[0];
  const scriptObjects = extractScriptJsonObjects(html);
  const scriptRoots = scriptObjects.map((item) => item.data);

  const ldOffers = listingItem && typeof listingItem === "object" ? (listingItem as Record<string, unknown>).offers : undefined;
  const offerObj = Array.isArray(ldOffers) ? (ldOffers[0] as Record<string, unknown> | undefined) : (ldOffers as Record<string, unknown> | undefined);

  // Extract structured fields from window.data
  const advert = windowData?.advert as Record<string, unknown> | undefined;
  const adverts = windowData?.adverts as unknown[] | undefined;
  const firstAdvert = adverts?.[0] as Record<string, unknown> | undefined;
  const advertAddress = advert?.address as Record<string, unknown> | undefined;

  const structuredTitle = cleanText(advert?.title as string) ?? cleanText(firstAdvert?.title as string);
  const structuredDescription = cleanText(firstAdvert?.description as string);
  const structuredPrice = toNumber(advert?.price) ?? toNumber(firstAdvert?.price);
  const structuredRooms = toIntegerInRange(advert?.rooms, 1, 20);
  const structuredArea = toNumber(advert?.square);
  const structuredAddress = cleanText(advert?.addressTitle as string) ?? cleanText(firstAdvert?.address as string);
  const structuredCity = cleanText(advertAddress?.city as string);
  const structuredDistrict = cleanText(advertAddress?.district as string);
  const structuredImages = asStringArray(advert?.photos);
  const structuredOwnerName = cleanText(advert?.ownerName as string) ?? cleanText(firstAdvert?.owner as string);
  const structuredAnalysisUrl = cleanText(windowData?.analysisUrl as string);

  console.log("Krisha analysisUrl found:", structuredAnalysisUrl);

  // Rental type from structured data
  const priceM2Text = cleanText(firstAdvert?.priceM2Text as string);
  console.log("Krisha priceM2Text:", priceM2Text);
  const rentalTypeFromStructured = detectRentalTypeFromPricePeriod(priceM2Text);
  console.log("Krisha rentalType from structured:", rentalTypeFromStructured);

  const imageCandidates = filterListingImages([
    ...structuredImages,
    ...asStringArray((listingItem as Record<string, unknown> | undefined)?.image),
    ...Array.from(html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)).map((m) => m[1]),
    ...scriptRoots.flatMap((root) =>
      deepCollectByKey(root, ["images", "image", "photos", "photo", "gallery"]).flatMap((item) => asStringArray(item.value)),
    ),
  ]);

  const cityMatch = html.match(/"city"\s*:\s*"([^"]+)"/i) ?? html.match(/"addressLocality"\s*:\s*"([^"]+)"/i);
  const districtMatch = html.match(/"district"\s*:\s*"([^"]+)"/i);
  const addressMatch =
    html.match(/<meta[^>]+property=["']og:street-address["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/"address"\s*:\s*"([^"]+)"/i);
  const descriptionDom =
    cleanText(html.match(/<div[^>]*class=["'][^"']*a-description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]?.replace(/<[^>]+>/g, " ")) ??
    cleanText(html.match(/<div[^>]*itemprop=["']description["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]?.replace(/<[^>]+>/g, " "));

  const scriptDescription = firstScriptValue(scriptRoots, ["description", "text", "body"]);
  const scriptRooms = firstScriptValue(scriptRoots, ["roomCount", "rooms_count", "rooms"]);
  const scriptArea = firstScriptValue(scriptRoots, ["area", "square", "totalArea"]);
  const scriptFloor = firstScriptValue(scriptRoots, ["floor"]);
  const scriptTotalFloors = firstScriptValue(scriptRoots, ["maxFloor", "floors", "floorCount", "storeys"]);
  const floorPair = html.match(/(\d{1,3})\s*\/\s*(\d{1,3})\s*этаж/i);
  const sellerName =
    structuredOwnerName ??
    firstScriptValue(scriptRoots, ["sellerName", "ownerName", "username", "name"]) ??
    cleanText(html.match(/<div[^>]*class=["'][^"']*owner-name[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]?.replace(/<[^>]+>/g, " "));
  const sellerType =
    cleanText(html.match(/(частное лицо|агентство|застройщик|риелтор)/i)?.[1]) ??
    firstScriptValue(scriptRoots, ["sellerType", "ownerType", "accountType", "owner_type"]);
  const descriptionValue =
    structuredDescription ??
    cleanText((listingItem as Record<string, unknown> | undefined)?.description) ??
    cleanText(scriptDescription) ??
    descriptionDom ??
    cleanText(descriptionMatch?.[1]);
  const rawAddressCandidate =
    cleanText(addressMatch?.[1]) ?? cleanText(firstScriptValue(scriptRoots, ["streetAddress", "address", "locationName"]));
  const sanitizedAddress = sanitizeKrishaAddress(rawAddressCandidate);

  const rawPriceText = extractKrishaPriceText(html, scriptRoots, descriptionMatch?.[1], titleMatch?.[1]);
  const rentalTypeDetected = rentalTypeFromStructured
    ? { value: rentalTypeFromStructured, inferred: false }
    : detectRentalType({
        explicit: firstScriptValue(scriptRoots, ["rentPeriod", "leaseType", "rentalType"]),
        title: cleanText((listingItem as Record<string, unknown> | undefined)?.name) ?? cleanText(titleMatch?.[1]),
        description: descriptionValue,
        category: firstScriptValue(scriptRoots, ["categoryName", "category"]),
        priceText: rawPriceText,
      });

  const mapLat = toNumber(html.match(/"lat"\s*:\s*([0-9.]+)/i)?.[1]);
  const mapLng = toNumber(html.match(/"lon"\s*:\s*([0-9.]+)/i)?.[1] ?? html.match(/"lng"\s*:\s*([0-9.]+)/i)?.[1]);
  const parsedFloor = toIntegerInRange(scriptFloor, 1, 120) ?? toIntegerInRange(floorPair?.[1], 1, 120);
  const parsedTotalFloors = toIntegerInRange(scriptTotalFloors, 1, 200) ?? toIntegerInRange(floorPair?.[2], 1, 200);
  const parsedRooms = structuredRooms ?? toIntegerInRange(scriptRooms, 1, 20);
  const parsedArea = structuredArea ?? toNumber(scriptArea);

  if (!descriptionValue) warnings.push("description_not_found");
  if (imageCandidates.length === 0) warnings.push("images_not_found");
  if (!sellerType && !sellerName) warnings.push("seller_not_found");
  if (parsedFloor && parsedTotalFloors && parsedFloor > parsedTotalFloors) {
    warnings.push("floor_above_total_floors");
  }

  traces.title = structuredTitle
    ? { source: "script_json", path: "window.data.advert.title", note: "structured data" }
    : (listingItem as Record<string, unknown> | undefined)?.name
      ? { source: "json_ld", path: "$.name" }
      : titleMatch
        ? { source: "meta", path: "og:title" }
        : { source: "none" };
  traces.description = structuredDescription
    ? { source: "script_json", path: "window.data.adverts[0].description", note: "structured data" }
    : (listingItem as Record<string, unknown> | undefined)?.description
      ? { source: "json_ld", path: "$.description" }
      : scriptDescription
        ? { source: "script_json" }
        : descriptionDom
          ? { source: "dom", path: ".a-description" }
          : descriptionMatch
            ? { source: "meta", path: "og:description" }
            : { source: "none" };
  traces.rooms = parsedRooms !== undefined
    ? structuredRooms !== undefined
      ? { source: "script_json", path: "window.data.advert.rooms", note: "structured data" }
      : { source: scriptRooms ? "script_json" : "regex", note: "validated integer 1..20" }
    : { source: "none" };
  traces.floor = parsedFloor !== undefined ? { source: scriptFloor ? "script_json" : "regex", note: "from floor pair or script" } : { source: "none" };
  traces.totalFloors = parsedTotalFloors !== undefined ? { source: scriptTotalFloors ? "script_json" : "regex" } : { source: "none" };
  traces.images = imageCandidates.length > 0
    ? structuredImages.length > 0
      ? { source: "script_json", path: "window.data.advert.photos", note: `${imageCandidates.length} urls from structured data` }
      : { source: "json_ld", note: `${imageCandidates.length} urls` }
    : { source: "none" };
  traces.seller = sellerType || sellerName
    ? structuredOwnerName
      ? { source: "script_json", path: "window.data.advert.ownerName", note: "structured data" }
      : { source: sellerType ? "regex" : "script_json" }
    : { source: "none" };
  traces.rentalType = rentalTypeDetected.value
    ? rentalTypeFromStructured
      ? { source: "script_json", path: "window.data.adverts[0].priceM2Text", note: `mapped from "${priceM2Text}"` }
      : { source: rentalTypeDetected.inferred ? "fallback" : "script_json", note: rentalTypeDetected.inferred ? "inferred from text" : "explicit field" }
    : { source: "none" };

  const result: SourceRawListing = {
    source: "krisha",
    url,
    title: structuredTitle ?? cleanText((listingItem as Record<string, unknown> | undefined)?.name) ?? cleanText(titleMatch?.[1]),
    description: descriptionValue,
    price: structuredPrice ?? toNumber(firstOfferValue(offerObj, "price")) ?? toNumber(html.match(/"price"\s*:\s*"?(.*?)"?(,|\})/i)?.[1]),
    currency:
      cleanText(firstOfferValue(offerObj, "priceCurrency") as string | undefined) ??
      pickCurrency(cleanText(descriptionMatch?.[1])),
    city: structuredCity ?? cleanText(cityMatch?.[1]) ?? cleanText(firstScriptValue(scriptRoots, ["city", "cityName", "addressLocality"])),
    district: normalizeDistrict(structuredDistrict ?? districtMatch?.[1] ?? firstScriptValue(scriptRoots, ["district", "districtName"])),
    address: structuredAddress ?? sanitizedAddress,
    rooms: parsedRooms,
    areaSqm: parsedArea,
    floor: parsedFloor,
    totalFloors: parsedTotalFloors,
    housingType:
      cleanText(html.match(/"buildingType"\s*:\s*"([^"]+)"/i)?.[1]) ??
      cleanText(firstScriptValue(scriptRoots, ["buildingType", "houseType", "realtyType"])),
    condition:
      cleanText(html.match(/"condition"\s*:\s*"([^"]+)"/i)?.[1]) ??
      cleanText(firstScriptValue(scriptRoots, ["condition", "repair"])),
    phoneAvailable: /phone|телефон|показать номер/i.test(html),
    sellerType: cleanText(sellerType ?? sellerName),
    rentalType: rentalTypeDetected.value,
    rentalTypeInferred: rentalTypeDetected.inferred,
    rawPriceText,
    images: imageCandidates,
    coordinates: mapLat !== undefined && mapLng !== undefined ? { lat: mapLat, lng: mapLng } : undefined,
    rawText: descriptionValue,
    rawAddress: rawAddressCandidate,
    publishedAt: cleanText(html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1]),
    metadata: { jsonLdCount: jsonLdItems.length, parserDebug: traces, scriptObjectCount: scriptObjects.length, windowDataExtracted: !!windowData, analysisUrl: structuredAnalysisUrl },
    extraFields: { sellerName },
    extractionWarnings: warnings,
  };

  if (!result.title && !result.price && imageCandidates.length === 0) {
    return {
      ok: false,
      error: {
        code: "parse_failed",
        message: "Unable to parse Krisha listing fields from page content.",
        source: "krisha",
        recoverable: true,
      },
    };
  }

  return result;
}

function sanitizeKrishaAddress(value?: string): string | undefined {
  const input = cleanText(value);
  if (!input) return undefined;

  const cut = input.split(/\s[—:-]\s/)[0]?.trim() ?? input;
  const withoutJkTail = cut.replace(/\sжк\s.+$/i, "").trim();
  const polluted = /(сдается|квартира|в субаренду|евро-\d|посуточно|помесячно|premium|апартам)/i.test(withoutJkTail);
  if (polluted) {
    const safe = withoutJkTail.match(/^([А-ЯA-ZЁӘІҢҒҮҰҚӨҺа-яa-zёәіңғүұқөһ.\-\s]+\s\d+[А-ЯA-Zа-яa-z]?(?:\/\d+)*)/u)?.[1];
    return cleanText(safe);
  }
  return withoutJkTail;
}

function extractKrishaPriceText(
  html: string,
  scriptRoots: unknown[],
  descriptionMeta?: string,
  titleMeta?: string,
): string | undefined {
  const htmlPriceInline = cleanText(
    html
      .match(/(\d[\d\s]*\s*(?:₸|тенге|kzt)(?:\s|<[^>]+>){0,10}(?:за\s*сутки|за\s*день|за\s*месяц|в\s*месяц|по\s*часам|на\s*ночь))/iu)?.[1]
      ?.replace(/<[^>]+>/g, " "),
  );

  return extractPricePeriodText([
    firstScriptValue(scriptRoots, ["priceText", "priceLabel", "formattedPrice", "priceWithPeriod"]),
    htmlPriceInline,
    cleanText(descriptionMeta),
    cleanText(titleMeta),
  ]);
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

function firstOfferValue(offerObj: Record<string, unknown> | undefined, key: string): unknown {
  if (!offerObj) return undefined;
  return offerObj[key];
}
