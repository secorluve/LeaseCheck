import type { Recommendation, RiskSignal } from "./types";

const recommendationMap: Record<RiskSignal["code"], string> = {
  price_too_low: "Сравните цену минимум с 5 похожими объявлениями и запросите подтверждающие документы на объект.",
  price_slightly_low: "Проверьте, чем объясняется цена ниже средней: состояние, срочность, ограничения по договору.",
  missing_address: "Уточните точный адрес и ориентиры до просмотра, затем проверьте локацию на карте.",
  vague_address: "Попросите более точный адрес (улица, дом) и подтвердите его перед внесением предоплаты.",
  low_description_quality: "Задайте владельцу дополнительные вопросы по состоянию, коммунальным платежам и условиям аренды.",
  incomplete_listing: "Запросите недостающие ключевые параметры: площадь, этаж, тип дома, условия договора.",
  no_images: "Попросите актуальные фото или видеообзор квартиры перед личным визитом.",
  inconsistent_data: "Перепроверьте параметры объекта: площадь, количество комнат и этажность должны совпадать с фактом.",
  missing_seller_info: "Попросите данные о владельце или агентстве и проверьте историю профиля.",
  extraction_uncertain: "Повторите проверку позже или вручную уточните ключевые параметры объявления у продавца.",
  suspicious_floor_data: "Уточните этаж и этажность дома: в объявлении есть несоответствие по этим параметрам.",
};

export function buildRecommendations(risks: RiskSignal[]): Recommendation[] {
  const uniqueRiskCodes = [...new Set(risks.map((risk) => risk.code))];
  const recommendations = uniqueRiskCodes.map((code) => ({
    riskCode: code,
    text: recommendationMap[code],
  }));

  if (recommendations.length === 0) {
    return [
      {
        riskCode: "incomplete_listing",
        text: "Сохраняйте переписку и фиксируйте условия аренды в письменном договоре.",
      },
    ];
  }

  return recommendations;
}
