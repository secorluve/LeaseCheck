import { fetchKrishaAnalytics } from "../parsers/krisha/fetchKrishaAnalytics";
import type { NormalizedListing } from "../parsers";
import type { PriceAnalytics, RiskSignal, ScoreBreakdown, ScoreSignal } from "./types";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function cityBasePricePerSqm(city?: string): number | undefined {
  if (!city) return undefined;
  const normalized = city.toLowerCase();
  if (normalized.includes("Р°Р»РјР°С‚С‹")) return 5000;
  if (normalized.includes("Р°СЃС‚Р°РЅР°")) return 4500;
  if (normalized.includes("С€С‹РјРєРµРЅС‚")) return 3500;
  return 3000;
}

export async function buildPriceAnalytics(listing: NormalizedListing): Promise<PriceAnalytics> {
  if (listing.source === "krisha" && listing.metadata?.analysisUrl) {
    try {
      console.log("Attempting to fetch real Krisha analytics for listing:", listing.url);
      const realAnalytics = await fetchKrishaAnalytics(String(listing.metadata.analysisUrl));
      if (realAnalytics) {
        console.log("Successfully fetched real Krisha analytics:", realAnalytics);
        return {
          listingPrice: realAnalytics.listingPrice ?? listing.price ?? null,
          cityAveragePrice: realAnalytics.cityAveragePrice ?? null,
          districtAveragePrice: realAnalytics.districtAveragePrice ?? null,
          comparisonPercent: realAnalytics.comparisonPercent ?? null,
          comparisonText: realAnalytics.comparisonText ?? null,
          marketPositionLabel: realAnalytics.comparisonText ?? "Р¦РµРЅР° СЃСЂР°РІРЅРµРЅР° СЃ СЂС‹РЅРѕС‡РЅС‹РјРё РґР°РЅРЅС‹РјРё",
          disclaimer: realAnalytics.isEstimated
            ? "РћС†РµРЅРєР° С†РµРЅС‹ РѕСЃРЅРѕРІР°РЅР° РЅР° РѕРіСЂР°РЅРёС‡РµРЅРЅС‹С… РґР°РЅРЅС‹С… РѕР±СЉСЏРІР»РµРЅРёСЏ."
            : "РћС†РµРЅРєР° С†РµРЅС‹ РѕСЃРЅРѕРІР°РЅР° РЅР° СЂРµР°Р»СЊРЅС‹С… СЂС‹РЅРѕС‡РЅС‹С… РґР°РЅРЅС‹С… Krisha.kz.",
          periodLabel: realAnalytics.periodLabel ?? null,
          trend: realAnalytics.trend ?? [],
          comparisonSource: "krisha_live",
        };
      }
    } catch (error) {
      console.log("Failed to fetch real Krisha analytics:", error);
    }
  }

  return buildEstimatedPriceAnalytics(listing);
}

function buildEstimatedPriceAnalytics(listing: NormalizedListing): PriceAnalytics {
  const listingPrice = listing.price ?? 0;
  const basePerSqm = cityBasePricePerSqm(listing.city);
  const estimatedReference =
    listing.areaSqm && listing.areaSqm > 0 && basePerSqm ? Math.round(listing.areaSqm * basePerSqm) : undefined;
  let marketPositionLabel: string | undefined;

  if (listingPrice > 0 && estimatedReference) {
    const ratio = listingPrice / estimatedReference;
    if (ratio < 0.75) marketPositionLabel = "Р¦РµРЅР° РІС‹РіР»СЏРґРёС‚ РЅРёР¶Рµ СЂС‹РЅРєР°";
    else if (ratio > 1.25) marketPositionLabel = "Р¦РµРЅР° РІС‹РіР»СЏРґРёС‚ РІС‹С€Рµ СЃСЂРµРґРЅРµРіРѕ";
    else marketPositionLabel = "Р¦РµРЅР° РІС‹РіР»СЏРґРёС‚ РІ РїСЂРµРґРµР»Р°С… РЅРѕСЂРјС‹";
  }

  return {
    listingPrice,
    cityAveragePrice: estimatedReference ?? null,
    districtAveragePrice: null,
    comparisonPercent:
      listingPrice > 0 && estimatedReference
        ? Number((((listingPrice - estimatedReference) / estimatedReference) * 100).toFixed(1))
        : null,
    comparisonText: null,
    marketPositionLabel: marketPositionLabel ?? null,
    disclaimer:
      "РћС†РµРЅРєР° С†РµРЅС‹ РѕСЂРёРµРЅС‚РёСЂРѕРІРѕС‡РЅР°СЏ Рё РѕСЃРЅРѕРІР°РЅР° РЅР° РѕРіСЂР°РЅРёС‡РµРЅРЅС‹С… РґР°РЅРЅС‹С… РѕР±СЉСЏРІР»РµРЅРёСЏ, Р±РµР· СЂРµР°Р»СЊРЅРѕР№ СЂС‹РЅРѕС‡РЅРѕР№ РІС‹Р±РѕСЂРєРё.",
    periodLabel: null,
    trend: [],
    comparisonSource: "heuristic",
  };
}

export async function scoreListing(listing: NormalizedListing): Promise<{
  trustScore: number;
  confidence: string;
  scoreBreakdown: ScoreBreakdown;
  risks: RiskSignal[];
  positives: string[];
  uncertainty: string[];
  manualChecks: string[];
  confirmed: string[];
  priceAnalytics: PriceAnalytics;
}> {
  const signals: ScoreSignal[] = [];
  const risks: RiskSignal[] = [];
  const positives: string[] = [];
  const uncertainty: string[] = [];
  const manualChecks: string[] = [];
  const confirmed: string[] = [];
  const priceAnalytics = await buildPriceAnalytics(listing);
  const warnings = new Set(listing.extractionWarnings ?? []);

  const filledFields = [
    listing.title,
    listing.description,
    listing.price,
    listing.city,
    listing.address,
    listing.rooms,
    listing.areaSqm,
    listing.floor,
    listing.totalFloors,
    listing.sellerType,
  ].filter((v) => v !== undefined && v !== null).length;

  if (filledFields >= 7) {
    signals.push({ code: "listing_completeness_high", weight: 10, reason: "Most core listing fields are present.", category: "positive" });
    positives.push("Р‘РѕР»СЊС€РёРЅСЃС‚РІРѕ РєР»СЋС‡РµРІС‹С… РїРѕР»РµР№ РѕР±СЉСЏРІР»РµРЅРёСЏ Р·Р°РїРѕР»РЅРµРЅС‹");
    confirmed.push("РљР»СЋС‡РµРІС‹Рµ РїР°СЂР°РјРµС‚СЂС‹ РѕР±СЉСЏРІР»РµРЅРёСЏ Р·Р°РїРѕР»РЅРµРЅС‹");
  } else if (filledFields <= 4) {
    signals.push({ code: "listing_completeness_low", weight: -14, reason: "Several critical listing fields are missing.", category: "negative" });
    risks.push({
      code: "incomplete_listing",
      severity: "high",
      reason: "Р’ РѕР±СЉСЏРІР»РµРЅРёРё РѕС‚СЃСѓС‚СЃС‚РІСѓСЋС‚ РЅРµСЃРєРѕР»СЊРєРѕ РІР°Р¶РЅС‹С… РїРѕР»РµР№ (С†РµРЅР°/Р°РґСЂРµСЃ/РїР°СЂР°РјРµС‚СЂС‹).",
    });
  }

  const descriptionLength = listing.description?.trim().length ?? 0;
  if (descriptionLength === 0 && !warnings.has("description_not_found")) {
    signals.push({ code: "description_missing", weight: -12, reason: "Description is missing.", category: "negative" });
    risks.push({ code: "low_description_quality", severity: "high", reason: "РћРїРёСЃР°РЅРёРµ РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚." });
  } else if (descriptionLength === 0 && warnings.has("description_not_found")) {
    signals.push({ code: "description_uncertain", weight: -2, reason: "Description extraction is uncertain.", category: "uncertainty" });
    uncertainty.push("РћРїРёСЃР°РЅРёРµ РЅРµ СѓРґР°Р»РѕСЃСЊ РЅР°РґРµР¶РЅРѕ РёР·РІР»РµС‡СЊ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё");
    risks.push({
      code: "extraction_uncertain",
      severity: "low",
      reason: "РћРїРёСЃР°РЅРёРµ РЅРµ РёР·РІР»РµС‡РµРЅРѕ РїР°СЂСЃРµСЂРѕРј, РЅРѕ СЌС‚Рѕ РјРѕР¶РµС‚ Р±С‹С‚СЊ С‚РµС…РЅРёС‡РµСЃРєРѕРµ РѕРіСЂР°РЅРёС‡РµРЅРёРµ СЃС‚СЂР°РЅРёС†С‹.",
    });
  } else if (descriptionLength < 60) {
    signals.push({ code: "description_short", weight: -7, reason: "Description is too short.", category: "negative" });
    risks.push({ code: "low_description_quality", severity: "medium", reason: "РћРїРёСЃР°РЅРёРµ СЃР»РёС€РєРѕРј РєСЂР°С‚РєРѕРµ Рё РјР°Р»РѕРёРЅС„РѕСЂРјР°С‚РёРІРЅРѕРµ." });
  } else {
    signals.push({ code: "description_good", weight: 5, reason: "Description contains enough detail.", category: "positive" });
    positives.push("РћРїРёСЃР°РЅРёРµ РґРѕСЃС‚Р°С‚РѕС‡РЅРѕ РїРѕРґСЂРѕР±РЅРѕРµ");
    confirmed.push("РћРїРёСЃР°РЅРёРµ СЃРѕРґРµСЂР¶РёС‚ РїРѕР»РµР·РЅС‹Рµ РґРµС‚Р°Р»Рё");
  }

  if (!listing.address) {
    signals.push({ code: "address_missing", weight: -10, reason: "Address is missing.", category: "negative" });
    risks.push({ code: "missing_address", severity: "high", reason: "РўРѕС‡РЅС‹Р№ Р°РґСЂРµСЃ РЅРµ СѓРєР°Р·Р°РЅ." });
  } else if (listing.address.length < 10) {
    signals.push({ code: "address_vague", weight: -5, reason: "Address appears vague.", category: "negative" });
    risks.push({ code: "vague_address", severity: "medium", reason: "РђРґСЂРµСЃ РІС‹РіР»СЏРґРёС‚ СЃР»РёС€РєРѕРј РѕР±С‰РёРј." });
  } else {
    signals.push({ code: "address_present", weight: 4, reason: "Address is present.", category: "positive" });
    positives.push("РђРґСЂРµСЃ СѓРєР°Р·Р°РЅ");
    confirmed.push("РђРґСЂРµСЃ СѓРєР°Р·Р°РЅ РІ РѕР±СЉСЏРІР»РµРЅРёРё");
  }

  if (listing.coordinates) {
    signals.push({ code: "coordinates_present", weight: 6, reason: "Coordinates are available.", category: "positive" });
    positives.push("Р•СЃС‚СЊ РєРѕРѕСЂРґРёРЅР°С‚С‹ РґР»СЏ РїСЂРѕРІРµСЂРєРё РЅР° РєР°СЂС‚Рµ");
    confirmed.push("РљРѕРѕСЂРґРёРЅР°С‚С‹ РґРѕСЃС‚СѓРїРЅС‹ РґР»СЏ РїСЂРѕРІРµСЂРєРё");
  } else {
    signals.push({ code: "coordinates_missing", weight: -2, reason: "Coordinates are unavailable.", category: "uncertainty" });
    uncertainty.push("РљРѕРѕСЂРґРёРЅР°С‚С‹ РЅРµ РїРѕРґС‚РІРµСЂР¶РґРµРЅС‹");
  }

  const imageCount = listing.images.length;
  if (imageCount === 0 && !warnings.has("images_not_found")) {
    signals.push({ code: "images_missing", weight: -12, reason: "No images found.", category: "negative" });
    risks.push({ code: "no_images", severity: "high", reason: "Р’ РѕР±СЉСЏРІР»РµРЅРёРё РЅРµС‚ С„РѕС‚РѕРіСЂР°С„РёР№." });
  } else if (imageCount === 0 && warnings.has("images_not_found")) {
    signals.push({ code: "images_uncertain", weight: -2, reason: "Image extraction is uncertain.", category: "uncertainty" });
    uncertainty.push("Р¤РѕС‚РѕРіСЂР°С„РёРё РјРѕРіР»Рё РЅРµ Р·Р°РіСЂСѓР·РёС‚СЊСЃСЏ РІ С…РѕРґРµ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРѕР№ РїСЂРѕРІРµСЂРєРё");
    risks.push({
      code: "extraction_uncertain",
      severity: "low",
      reason: "Р¤РѕС‚РѕРіСЂР°С„РёРё РЅРµ РёР·РІР»РµС‡РµРЅС‹ РїР°СЂСЃРµСЂРѕРј, РїСЂРѕРІРµСЂСЊС‚Рµ РѕР±СЉСЏРІР»РµРЅРёРµ РІСЂСѓС‡РЅСѓСЋ.",
    });
  } else if (imageCount >= 5) {
    signals.push({ code: "images_many", weight: 6, reason: "Multiple images are available.", category: "positive" });
    positives.push("РџСЂРёСЃСѓС‚СЃС‚РІСѓРµС‚ РґРѕСЃС‚Р°С‚РѕС‡РЅРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ С„РѕС‚Рѕ");
    confirmed.push("Р•СЃС‚СЊ РґРѕСЃС‚Р°С‚РѕС‡РЅРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ С„РѕС‚Рѕ");
  } else {
    signals.push({ code: "images_few", weight: 2, reason: "Some images are available.", category: "positive" });
  }

  if (!listing.sellerType && !warnings.has("seller_not_found")) {
    signals.push({ code: "seller_info_missing", weight: -4, reason: "Seller details are not available.", category: "negative" });
    risks.push({ code: "missing_seller_info", severity: "low", reason: "РРЅС„РѕСЂРјР°С†РёСЏ Рѕ РїСЂРѕРґР°РІС†Рµ РѕРіСЂР°РЅРёС‡РµРЅР°." });
  } else if (!listing.sellerType && warnings.has("seller_not_found")) {
    signals.push({ code: "seller_info_uncertain", weight: -2, reason: "Seller block extraction is uncertain.", category: "uncertainty" });
    uncertainty.push("Р”Р°РЅРЅС‹Рµ Рѕ РїСЂРѕРґР°РІС†Рµ РёР·РІР»РµС‡РµРЅС‹ РЅРµ РїРѕР»РЅРѕСЃС‚СЊСЋ");
    risks.push({
      code: "extraction_uncertain",
      severity: "low",
      reason: "Р‘Р»РѕРє РїСЂРѕРґР°РІС†Р° РјРѕРі Р±С‹С‚СЊ РЅРµРґРѕСЃС‚СѓРїРµРЅ РґР»СЏ РїР°СЂСЃРёРЅРіР° РЅР° СЌС‚РѕР№ РІРµСЂСЃРёРё СЃС‚СЂР°РЅРёС†С‹.",
    });
  } else {
    signals.push({ code: "seller_info_present", weight: 3, reason: "Seller details are present.", category: "positive" });
    positives.push("Р”РѕСЃС‚СѓРїРЅР° РёРЅС„РѕСЂРјР°С†РёСЏ Рѕ РїСЂРѕРґР°РІС†Рµ");
    confirmed.push("Р•СЃС‚СЊ РёРЅС„РѕСЂРјР°С†РёСЏ Рѕ РїСЂРѕРґР°РІС†Рµ/РїСЂРѕС„РёР»Рµ");
  }

  if (listing.rentalType) {
    signals.push({ code: "rental_type_present", weight: 3, reason: "Rental type is detected.", category: "positive" });
    confirmed.push(`РўРёРї Р°СЂРµРЅРґС‹ РѕРїСЂРµРґРµР»РµРЅ: ${listing.rentalType}`);
    if (listing.rentalTypeInferred) {
      signals.push({ code: "rental_type_inferred", weight: -2, reason: "Rental type inferred from text.", category: "uncertainty" });
      uncertainty.push("РўРёРї Р°СЂРµРЅРґС‹ РѕРїСЂРµРґРµР»РµРЅ РїРѕ С‚РµРєСЃС‚Сѓ, РЅРѕ РЅРµ СѓРєР°Р·Р°РЅ СЏРІРЅРѕ");
    }
  } else {
    signals.push({ code: "rental_type_missing", weight: -4, reason: "Rental type is unknown.", category: "negative" });
    uncertainty.push("РўРёРї Р°СЂРµРЅРґС‹ РЅРµ СѓРґР°Р»РѕСЃСЊ РѕРїСЂРµРґРµР»РёС‚СЊ");
  }

  if (listing.rooms && listing.areaSqm && listing.areaSqm / listing.rooms < 10) {
    signals.push({ code: "rooms_area_inconsistent", weight: -9, reason: "Rooms and area look inconsistent.", category: "negative" });
    risks.push({ code: "inconsistent_data", severity: "high", reason: "РќРµСЃРѕРѕС‚РІРµС‚СЃС‚РІРёРµ РјРµР¶РґСѓ РєРѕР»РёС‡РµСЃС‚РІРѕРј РєРѕРјРЅР°С‚ Рё РїР»РѕС‰Р°РґСЊСЋ." });
  }

  if (
    (listing.floor !== undefined && listing.totalFloors !== undefined && listing.floor > listing.totalFloors) ||
    warnings.has("floor_above_total_floors")
  ) {
    risks.push({
      code: "suspicious_floor_data",
      severity: "medium",
      reason: "Р—РЅР°С‡РµРЅРёСЏ СЌС‚Р°Р¶Р° Рё СЌС‚Р°Р¶РЅРѕСЃС‚Рё РІС‹РіР»СЏРґСЏС‚ РїСЂРѕС‚РёРІРѕСЂРµС‡РёРІРѕ.",
    });
  }

  if (listing.price && listing.areaSqm && cityBasePricePerSqm(listing.city)) {
    const reference = listing.areaSqm * (cityBasePricePerSqm(listing.city) as number);
    const ratio = listing.price / reference;
    if (ratio < 0.6) {
      signals.push({ code: "price_too_low", weight: -18, reason: "Price is far below expected range.", category: "negative" });
      risks.push({ code: "price_too_low", severity: "high", reason: "Р¦РµРЅР° Р·РЅР°С‡РёС‚РµР»СЊРЅРѕ РЅРёР¶Рµ РѕР¶РёРґР°РµРјРѕРіРѕ РґРёР°РїР°Р·РѕРЅР° РїРѕ СЂС‹РЅРєСѓ." });
    } else if (ratio < 0.85) {
      signals.push({ code: "price_slightly_low", weight: -8, reason: "Price is moderately below expected range.", category: "negative" });
      risks.push({ code: "price_slightly_low", severity: "medium", reason: "Р¦РµРЅР° Р·Р°РјРµС‚РЅРѕ РЅРёР¶Рµ СЃСЂРµРґРЅРµР№ РїРѕ СЂС‹РЅРєСѓ." });
    } else if (ratio <= 1.2) {
      signals.push({ code: "price_normal", weight: 4, reason: "Price is within normal range.", category: "positive" });
      positives.push("Р¦РµРЅР° Р±Р»РёР·РєР° Рє РѕР¶РёРґР°РµРјРѕРјСѓ РґРёР°РїР°Р·РѕРЅСѓ");
      confirmed.push("Р¦РµРЅР° РІС‹РіР»СЏРґРёС‚ СЂС‹РЅРѕС‡РЅРѕ РѕР±РѕСЃРЅРѕРІР°РЅРЅРѕР№");
    }
  }

  if (!listing.district) {
    signals.push({ code: "district_missing", weight: -2, reason: "District is missing.", category: "uncertainty" });
    uncertainty.push("Р Р°Р№РѕРЅ РЅРµ РѕРїСЂРµРґРµР»РµРЅ РѕРґРЅРѕР·РЅР°С‡РЅРѕ");
  }

  if (risks.length === 0) {
    positives.push("РЇРІРЅС‹С… РїСЂРёР·РЅР°РєРѕРІ РјРѕС€РµРЅРЅРёС‡РµСЃС‚РІР° РЅРµ РЅР°Р№РґРµРЅРѕ");
  }

  manualChecks.push("РџСЂРѕРІРµСЂСЊС‚Рµ РґРѕРєСѓРјРµРЅС‚С‹ РЅР° СЃРѕР±СЃС‚РІРµРЅРЅРѕСЃС‚СЊ Рё РїСЂР°РІРѕ СЃРґР°С‡Рё");
  if (!listing.coordinates) manualChecks.push("РЎРІРµСЂСЊС‚Рµ Р°РґСЂРµСЃ Рё Р»РѕРєР°С†РёСЋ РїРµСЂРµРґ РІРЅРµСЃРµРЅРёРµРј РїСЂРµРґРѕРїР»Р°С‚С‹");
  if (listing.rentalTypeInferred) manualChecks.push("РЈС‚РѕС‡РЅРёС‚Рµ Сѓ Р°СЂРµРЅРґРѕРґР°С‚РµР»СЏ С‚РѕС‡РЅС‹Р№ С„РѕСЂРјР°С‚ Р°СЂРµРЅРґС‹ Рё СЃСЂРѕРєРё");

  const baseScore = 55;
  const trustScore = clampScore(baseScore + signals.reduce((sum, item) => sum + item.weight, 0));

  const confidence =
    filledFields >= 7 && descriptionLength > 60 ? "Р’С‹СЃРѕРєР°СЏ" : filledFields >= 5 ? "РЎСЂРµРґРЅСЏСЏ" : "РќРёР·РєР°СЏ";

  return {
    trustScore,
    confidence,
    scoreBreakdown: { baseScore, signals, finalScore: trustScore },
    risks,
    positives,
    uncertainty,
    manualChecks,
    confirmed,
    priceAnalytics,
  };
}
