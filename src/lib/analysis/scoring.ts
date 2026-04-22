import type { NormalizedListing } from "../parsers";
import type { PriceAnalytics, RiskSignal, ScoreBreakdown, ScoreSignal } from "./types";
import { fetchKrishaAnalytics } from "../parsers/krisha/fetchKrishaAnalytics";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function cityBasePricePerSqm(city?: string): number | undefined {
  if (!city) return undefined;
  const normalized = city.toLowerCase();
  if (normalized.includes("алматы")) return 5000;
  if (normalized.includes("астана")) return 4500;
  if (normalized.includes("шымкент")) return 3500;
  return 3000;
}

export async function buildPriceAnalytics(listing: NormalizedListing): Promise<PriceAnalytics> {
  // Try to fetch real analytics for Krisha listings
  if (listing.source === "krisha" && listing.metadata?.analysisUrl) {
    try {
      console.log("Attempting to fetch real Krisha analytics for listing:", listing.url);
      const realAnalytics = await fetchKrishaAnalytics(listing.metadata.analysisUrl);
      if (realAnalytics) {
        console.log("Successfully fetched real Krisha analytics:", realAnalytics);
        return {
          listingPrice: realAnalytics.listingPrice ?? listing.price,
          marketPositionLabel: realAnalytics.comparisonText ?? "Цена сравнена с рыночными данными",
          disclaimer: realAnalytics.isEstimated
            ? "Оценка цены основана на ограниченных данных объявления."
            : "Оценка цены основана на реальных рыночных данных Krisha.kz.",
          districtAveragePrice: realAnalytics.districtAveragePrice,
          cityAveragePrice: realAnalytics.cityAveragePrice,
          comparisonPercent: realAnalytics.comparisonPercent,
          periodLabel: realAnalytics.periodLabel,
          trend: realAnalytics.trend,
        };
      }
    } catch (error) {
      console.log("Failed to fetch real Krisha analytics:", error);
    }
  }

  // Fallback to estimated analytics
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
    if (ratio < 0.75) marketPositionLabel = "Цена выглядит ниже рынка";
    else if (ratio > 1.25) marketPositionLabel = "Цена выглядит выше среднего";
    else marketPositionLabel = "Цена выглядит в пределах нормы";
  }

  return {
    listingPrice,
    marketPositionLabel,
    disclaimer:
      "Оценка цены ориентировочная и основана на ограниченных данных объявления, без реальной рыночной выборки.",
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
    positives.push("Большинство ключевых полей объявления заполнены");
    confirmed.push("Ключевые параметры объявления заполнены");
  } else if (filledFields <= 4) {
    signals.push({ code: "listing_completeness_low", weight: -14, reason: "Several critical listing fields are missing.", category: "negative" });
    risks.push({
      code: "incomplete_listing",
      severity: "high",
      reason: "В объявлении отсутствуют несколько важных полей (цена/адрес/параметры).",
    });
  }

  const descriptionLength = listing.description?.trim().length ?? 0;
  if (descriptionLength === 0 && !warnings.has("description_not_found")) {
    signals.push({ code: "description_missing", weight: -12, reason: "Description is missing.", category: "negative" });
    risks.push({ code: "low_description_quality", severity: "high", reason: "Описание отсутствует." });
  } else if (descriptionLength === 0 && warnings.has("description_not_found")) {
    signals.push({ code: "description_uncertain", weight: -2, reason: "Description extraction is uncertain.", category: "uncertainty" });
    uncertainty.push("Описание не удалось надежно извлечь автоматически");
    risks.push({
      code: "extraction_uncertain",
      severity: "low",
      reason: "Описание не извлечено парсером, но это может быть техническое ограничение страницы.",
    });
  } else if (descriptionLength < 60) {
    signals.push({ code: "description_short", weight: -7, reason: "Description is too short.", category: "negative" });
    risks.push({ code: "low_description_quality", severity: "medium", reason: "Описание слишком краткое и малоинформативное." });
  } else {
    signals.push({ code: "description_good", weight: 5, reason: "Description contains enough detail.", category: "positive" });
    positives.push("Описание достаточно подробное");
    confirmed.push("Описание содержит полезные детали");
  }

  if (!listing.address) {
    signals.push({ code: "address_missing", weight: -10, reason: "Address is missing.", category: "negative" });
    risks.push({ code: "missing_address", severity: "high", reason: "Точный адрес не указан." });
  } else if (listing.address.length < 10) {
    signals.push({ code: "address_vague", weight: -5, reason: "Address appears vague.", category: "negative" });
    risks.push({ code: "vague_address", severity: "medium", reason: "Адрес выглядит слишком общим." });
  } else {
    signals.push({ code: "address_present", weight: 4, reason: "Address is present.", category: "positive" });
    positives.push("Адрес указан");
    confirmed.push("Адрес указан в объявлении");
  }

  if (listing.coordinates) {
    signals.push({ code: "coordinates_present", weight: 6, reason: "Coordinates are available.", category: "positive" });
    positives.push("Есть координаты для проверки на карте");
    confirmed.push("Координаты доступны для проверки");
  } else {
    signals.push({ code: "coordinates_missing", weight: -2, reason: "Coordinates are unavailable.", category: "uncertainty" });
    uncertainty.push("Координаты не подтверждены");
  }

  const imageCount = listing.images.length;
  if (imageCount === 0 && !warnings.has("images_not_found")) {
    signals.push({ code: "images_missing", weight: -12, reason: "No images found.", category: "negative" });
    risks.push({ code: "no_images", severity: "high", reason: "В объявлении нет фотографий." });
  } else if (imageCount === 0 && warnings.has("images_not_found")) {
    signals.push({ code: "images_uncertain", weight: -2, reason: "Image extraction is uncertain.", category: "uncertainty" });
    uncertainty.push("Фотографии могли не загрузиться в ходе автоматической проверки");
    risks.push({
      code: "extraction_uncertain",
      severity: "low",
      reason: "Фотографии не извлечены парсером, проверьте объявление вручную.",
    });
  } else if (imageCount >= 5) {
    signals.push({ code: "images_many", weight: 6, reason: "Multiple images are available.", category: "positive" });
    positives.push("Присутствует достаточное количество фото");
    confirmed.push("Есть достаточное количество фото");
  } else {
    signals.push({ code: "images_few", weight: 2, reason: "Some images are available.", category: "positive" });
  }

  if (!listing.sellerType && !warnings.has("seller_not_found")) {
    signals.push({ code: "seller_info_missing", weight: -4, reason: "Seller details are not available.", category: "negative" });
    risks.push({ code: "missing_seller_info", severity: "low", reason: "Информация о продавце ограничена." });
  } else if (!listing.sellerType && warnings.has("seller_not_found")) {
    signals.push({ code: "seller_info_uncertain", weight: -2, reason: "Seller block extraction is uncertain.", category: "uncertainty" });
    uncertainty.push("Данные о продавце извлечены не полностью");
    risks.push({
      code: "extraction_uncertain",
      severity: "low",
      reason: "Блок продавца мог быть недоступен для парсинга на этой версии страницы.",
    });
  } else {
    signals.push({ code: "seller_info_present", weight: 3, reason: "Seller details are present.", category: "positive" });
    positives.push("Доступна информация о продавце");
    confirmed.push("Есть информация о продавце/профиле");
  }

  if (listing.rentalType) {
    signals.push({ code: "rental_type_present", weight: 3, reason: "Rental type is detected.", category: "positive" });
    confirmed.push(`Тип аренды определен: ${listing.rentalType}`);
    if (listing.rentalTypeInferred) {
      signals.push({ code: "rental_type_inferred", weight: -2, reason: "Rental type inferred from text.", category: "uncertainty" });
      uncertainty.push("Тип аренды определен по тексту, но не указан явно");
    }
  } else {
    signals.push({ code: "rental_type_missing", weight: -4, reason: "Rental type is unknown.", category: "negative" });
    uncertainty.push("Тип аренды не удалось определить");
  }

  if (listing.rooms && listing.areaSqm && listing.areaSqm / listing.rooms < 10) {
    signals.push({ code: "rooms_area_inconsistent", weight: -9, reason: "Rooms and area look inconsistent.", category: "negative" });
    risks.push({ code: "inconsistent_data", severity: "high", reason: "Несоответствие между количеством комнат и площадью." });
  }

  if (
    (listing.floor !== undefined && listing.totalFloors !== undefined && listing.floor > listing.totalFloors) ||
    warnings.has("floor_above_total_floors")
  ) {
    risks.push({
      code: "suspicious_floor_data",
      severity: "medium",
      reason: "Значения этажа и этажности выглядят противоречиво.",
    });
  }

  if (listing.price && listing.areaSqm && cityBasePricePerSqm(listing.city)) {
    const reference = listing.areaSqm * (cityBasePricePerSqm(listing.city) as number);
    const ratio = listing.price / reference;
    if (ratio < 0.6) {
      signals.push({ code: "price_too_low", weight: -18, reason: "Price is far below expected range.", category: "negative" });
      risks.push({ code: "price_too_low", severity: "high", reason: "Цена значительно ниже ожидаемого диапазона по рынку." });
    } else if (ratio < 0.85) {
      signals.push({ code: "price_slightly_low", weight: -8, reason: "Price is moderately below expected range.", category: "negative" });
      risks.push({ code: "price_slightly_low", severity: "medium", reason: "Цена заметно ниже средней по рынку." });
    } else if (ratio <= 1.2) {
      signals.push({ code: "price_normal", weight: 4, reason: "Price is within normal range.", category: "positive" });
      positives.push("Цена близка к ожидаемому диапазону");
      confirmed.push("Цена выглядит рыночно обоснованной");
    }
  }

  if (!listing.district) {
    signals.push({ code: "district_missing", weight: -2, reason: "District is missing.", category: "uncertainty" });
    uncertainty.push("Район не определен однозначно");
  }

  if (risks.length === 0) {
    positives.push("Явных признаков мошенничества не найдено");
  }

  manualChecks.push("Проверьте документы на собственность и право сдачи");
  if (!listing.coordinates) manualChecks.push("Сверьте адрес и локацию перед внесением предоплаты");
  if (listing.rentalTypeInferred) manualChecks.push("Уточните у арендодателя точный формат аренды и сроки");

  const baseScore = 55;
  const trustScore = clampScore(baseScore + signals.reduce((sum, item) => sum + item.weight, 0));

  const confidence =
    filledFields >= 7 && descriptionLength > 60 ? "Высокая" : filledFields >= 5 ? "Средняя" : "Низкая";

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
