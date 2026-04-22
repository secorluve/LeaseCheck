import { fetchKrishaAnalytics } from '../../../../src/lib/parsers/krisha/fetchKrishaAnalytics'
import type { ExtractedListingData, HeuristicAnalysisResult, HeuristicSignal, HumanVerdict, PriceAnalyticsDto } from '../../types/api'

const recommendationMap: Record<string, string> = {
  prepayment_request: 'Не переводите деньги до личного осмотра квартиры и проверки документов на собственность.',
  messenger_redirect: 'Сохраните переписку и настаивайте на общении и оформлении сделки на площадке либо в официальном договоре.',
  urgency_pressure: 'Не принимайте решение под давлением. Сверьте цену и попросите больше подтверждающих деталей по объекту.',
  low_details: 'Запросите точный адрес, фото, условия аренды и сведения о владельце до любых договорённостей.',
  no_images: 'Попросите актуальные фото или видеообзор, а затем сделайте обратный поиск изображений.',
  suspicious_price: 'Сравните цену с похожими объявлениями и уточните, почему она заметно ниже обычной.',
  no_address: 'Попросите точный адрес и проверьте его на карте до внесения предоплаты.',
  unavailable_owner: 'Попросите удостоверение личности, документы на жильё и правовое основание сдачи квартиры.',
}

const cityReferencePerSqm: Record<string, number> = {
  алматы: 5500,
  almaty: 5500,
  астана: 5000,
  astana: 5000,
  шымкент: 3500,
  shymkent: 3500,
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizeCityKey(value?: string): string | undefined {
  return value?.trim().toLowerCase()
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function buildFallbackPriceAnalytics(listing: ExtractedListingData): PriceAnalyticsDto {
  const listingPrice = listing.price ?? null
  const areaSqm = listing.areaSqm ?? null
  const perSqm = normalizeCityKey(listing.city) ? cityReferencePerSqm[normalizeCityKey(listing.city) as string] : undefined

  if (!listingPrice || !areaSqm || !perSqm) {
    return {
      listingPrice,
      cityAveragePrice: null,
      districtAveragePrice: null,
      comparisonPercent: null,
      comparisonText: null,
      marketPositionLabel: null,
      disclaimer: 'Автоматически получить рыночный бенчмарк по этому объявлению не удалось.',
      periodLabel: null,
      trend: [],
      comparisonSource: 'unavailable',
    }
  }

  const cityAveragePrice = Math.round(areaSqm * perSqm)
  const comparisonPercent = Number((((listingPrice - cityAveragePrice) / cityAveragePrice) * 100).toFixed(1))
  const marketPositionLabel =
    comparisonPercent <= -25
      ? 'Цена заметно ниже типичного уровня'
      : comparisonPercent >= 20
        ? 'Цена заметно выше типичного уровня'
        : 'Цена находится рядом с типичным диапазоном'

  return {
    listingPrice,
    cityAveragePrice,
    districtAveragePrice: null,
    comparisonPercent,
    comparisonText:
      comparisonPercent < 0
        ? `Цена ниже ориентировочного уровня по городу примерно на ${Math.abs(comparisonPercent)}%.`
        : `Цена выше ориентировочного уровня по городу примерно на ${comparisonPercent}%.`,
    marketPositionLabel,
    disclaimer:
      'Сравнение рассчитано эвристически по городу и площади объекта, а не по полной рыночной выборке. Используйте как ориентир.',
    periodLabel: null,
    trend: [],
    comparisonSource: 'heuristic',
  }
}

async function buildPriceAnalytics(listing: ExtractedListingData): Promise<PriceAnalyticsDto> {
  const analysisUrl = typeof listing.metadata.analysisUrl === 'string' ? listing.metadata.analysisUrl : null

  if (listing.platform === 'krisha' && analysisUrl) {
    const analytics = await fetchKrishaAnalytics(analysisUrl)
    if (analytics) {
      return {
        listingPrice: analytics.listingPrice,
        cityAveragePrice: analytics.cityAveragePrice,
        districtAveragePrice: analytics.districtAveragePrice,
        comparisonPercent: analytics.comparisonPercent,
        comparisonText: analytics.comparisonText,
        marketPositionLabel: analytics.comparisonText,
        disclaimer: analytics.isEstimated
          ? 'Данные по цене частично восстановлены автоматически и требуют ручной проверки.'
          : 'Сравнение получено из доступных рыночных данных Krisha.',
        periodLabel: analytics.periodLabel,
        trend: analytics.trend,
        comparisonSource: 'krisha_live',
      }
    }
  }

  return buildFallbackPriceAnalytics(listing)
}

export class HeuristicAnalysisService {
  async analyze(listing: ExtractedListingData): Promise<HeuristicAnalysisResult> {
    const priceAnalytics = await buildPriceAnalytics(listing)
    const risks: HeuristicSignal[] = []
    const positiveSignals: string[] = []
    const uncertaintySignals: string[] = []
    const manualCheckRecommendations: string[] = [
      'Проверьте документы на собственность и право сдачи жилья.',
      'Не отправляйте предоплату до очного просмотра и подтверждения личности владельца.',
      'Фиксируйте условия аренды в письменном договоре.',
    ]

    let score = 68
    const text = `${listing.title ?? ''}\n${listing.description ?? ''}\n${listing.rawText}`.toLowerCase()

    const addRisk = (
      code: string,
      title: string,
      description: string,
      severity: HeuristicSignal['severity'],
      scoreImpact: number,
    ) => {
      if (risks.some((risk) => risk.code === code)) return
      risks.push({ code, title, description, severity, scoreImpact })
      score += scoreImpact
      const recommendation = recommendationMap[code]
      if (recommendation) {
        manualCheckRecommendations.push(recommendation)
      }
    }

    const addPositive = (textValue: string, scoreImpact: number) => {
      positiveSignals.push(textValue)
      score += scoreImpact
    }

    const addUncertainty = (textValue: string, scoreImpact: number) => {
      uncertaintySignals.push(textValue)
      score += scoreImpact
    }

    if (!listing.title) {
      addRisk('low_details', 'Нет понятного заголовка', 'У объявления нет чёткого заголовка, что снижает прозрачность.', 'medium', -6)
    }

    if (!listing.description || listing.description.length < 80) {
      addRisk(
        'low_details',
        'Слишком мало деталей',
        'Описание слишком короткое и не даёт полной картины по объекту и условиям аренды.',
        'high',
        -10,
      )
    } else if (listing.description.length > 220) {
      addPositive('Описание содержит достаточно деталей об объекте.', 6)
    }

    if (!listing.address && !listing.locationText) {
      addRisk('no_address', 'Нет точного адреса', 'Без точного адреса сложнее проверить реальность объекта и его местоположение.', 'high', -10)
    } else {
      addPositive('Указана локация или адрес объекта.', 4)
    }

    if (!listing.price) {
      addRisk('low_details', 'Не указана цена', 'Отсутствие цены мешает оценить реалистичность предложения.', 'medium', -6)
    }

    if (listing.images.length === 0) {
      addRisk('no_images', 'Нет фотографий', 'В объявлении нет фотографий либо площадка не дала их извлечь автоматически.', 'high', -9)
    } else if (listing.images.length >= 5) {
      addPositive('Объявление содержит несколько фотографий.', 5)
      manualCheckRecommendations.push('Сделайте обратный поиск фото, чтобы убедиться, что изображения не украдены из других объявлений.')
    }

    if (listing.sellerType) {
      addPositive('Есть хотя бы базовая информация о владельце или посреднике.', 4)
    } else {
      addRisk(
        'unavailable_owner',
        'Мало данных о владельце',
        'По извлечённым данным недостаточно информации о владельце или агенте.',
        'medium',
        -6,
      )
    }

    if (listing.coordinates) {
      addPositive('Локацию можно дополнительно проверить на карте.', 3)
    } else {
      addUncertainty('Координаты объекта автоматически не подтверждены.', -2)
    }

    if (listing.sourceMode === 'manual' || listing.sourceMode === 'mixed') {
      addUncertainty('Часть анализа опирается на текст, введённый вручную пользователем.', -3)
    }

    if (/предоплат|переведите.*(карту|qr|сч[её]т)|advance payment|pay before viewing|deposit first/i.test(text)) {
      addRisk(
        'prepayment_request',
        'Есть запрос на предоплату',
        'В тексте присутствуют признаки требования перевода денег до безопасной проверки объекта.',
        'high',
        -16,
      )
    }

    if (/whatsapp|telegram|только.*(whatsapp|telegram|ватсап|телеграм)|write only|message me/i.test(text)) {
      addRisk(
        'messenger_redirect',
        'Перевод общения в мессенджер',
        'Объявление подталкивает уйти в мессенджер вместо прозрачного общения в рамках площадки.',
        'medium',
        -8,
      )
    }

    if (/срочно|только сегодня|до вечера|urgent|hurry|act fast/i.test(text)) {
      addRisk(
        'urgency_pressure',
        'Есть давление по времени',
        'В объявлении заметны формулировки, подталкивающие принять решение слишком быстро.',
        'medium',
        -7,
      )
    }

    if (/я за границей|owner abroad|не могу показать|ключи у соседа|remote handover|без просмотра/i.test(text)) {
      addRisk(
        'unavailable_owner',
        'Собственник недоступен для нормального показа',
        'Текст содержит сценарии, которые часто встречаются в мошеннических схемах дистанционной аренды.',
        'high',
        -14,
      )
    }

    if (
      priceAnalytics.comparisonPercent != null &&
      priceAnalytics.comparisonPercent <= -25
    ) {
      addRisk(
        'suspicious_price',
        'Цена выглядит подозрительно низкой',
        'Стоимость заметно ниже ориентировочного рынка, что требует дополнительной проверки.',
        'high',
        -14,
      )
    } else if (
      priceAnalytics.comparisonPercent != null &&
      priceAnalytics.comparisonPercent >= -10 &&
      priceAnalytics.comparisonPercent <= 20
    ) {
      addPositive('Цена не выглядит явным выбросом относительно доступного бенчмарка.', 4)
    }

    if (listing.extractionWarnings.length > 0) {
      addUncertainty('Некоторые поля объявления извлечены не полностью и требуют ручной проверки.', -2)
    }

    if (listing.phoneAvailable) {
      addPositive('Похоже, у объявления есть контактный телефон.', 2)
    }

    score = clampScore(score)

    const highRiskCount = risks.filter((risk) => risk.severity === 'high').length
    const confidence =
      listing.sourceMode === 'structured' && listing.description && listing.images.length > 0
        ? 'high'
        : listing.description || listing.locationText
          ? 'medium'
          : 'low'

    let verdict: HumanVerdict = 'Needs Manual Review'
    if (score < 45 || highRiskCount >= 2) {
      verdict = 'Suspicious'
    } else if (score >= 75 && highRiskCount === 0) {
      verdict = 'Safe'
    }

    const topRiskTitles = risks.slice(0, 2).map((risk) => risk.title)
    const summary =
      risks.length > 0
        ? `Найдены факторы риска: ${topRiskTitles.join(', ')}. Перед контактом с арендодателем нужна дополнительная проверка.`
        : 'По доступным данным объявление выглядит относительно аккуратно, но стандартная проверка документов и условий аренды всё равно нужна.'

    const recommendation =
      verdict === 'Suspicious'
        ? 'Лучше не переводить деньги и не продолжать сделку, пока владелец не подтвердит личность, право сдачи и реальность объекта.'
        : verdict === 'Safe'
          ? 'Можно продолжать общение осторожно: проверьте документы, условия договора и осмотрите объект перед оплатой.'
          : 'Связаться можно только после ручной проверки адреса, документов, цены и условий оплаты.'

    return {
      verdict,
      score,
      confidence,
      summary,
      recommendation,
      risks,
      positiveSignals: unique(positiveSignals),
      negativeSignals: risks.map((risk) => risk.description),
      uncertaintySignals: unique(uncertaintySignals),
      manualCheckRecommendations: unique(manualCheckRecommendations),
      priceAnalytics,
    }
  }
}
