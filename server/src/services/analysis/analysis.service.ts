import prismaClientPkg from '@prisma/client'
import type { Prisma, RiskSeverity as RiskSeverityType } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { ApiError } from '../../utils/api-error'
import { detectPlatformFromUrl, fromPrismaPlatform, normalizeAnalysisMode, normalizeSeverity, toHumanVerdict, toPrismaPlatform, toPrismaVerdict } from '../../utils/platform'
import type {
  AiAnalysisAttempt,
  AnalysisDetailDto,
  AnalysisHistoryItemDto,
  CreateAnalysisInput,
  ExtractedListingData,
  HeuristicAnalysisResult,
  PriceAnalyticsDto,
  RiskItemDto,
} from '../../types/api'
import { AiAnalysisService } from '../ai/ai-analysis.service'
import { HeuristicAnalysisService } from './heuristic-analysis.service'
import { ListingExtractorService } from './listing-extractor.service'

const { AnalysisMode, Prisma: PrismaRuntime, RequestStatus, RiskSeverity } = prismaClientPkg

const riskRecommendationMap: Record<string, string> = {
  prepayment_request: 'Запросите документы и не переводите деньги до реального просмотра квартиры.',
  messenger_redirect: 'Сохраните диалог и попросите подтверждения личности и права сдачи жилья.',
  urgency_pressure: 'Сделайте паузу и перепроверьте предложение на других площадках.',
  suspicious_price: 'Сравните цену минимум с 5 похожими объектами в том же районе.',
  no_address: 'Попросите адрес дома и проверьте его на карте и в кадастровых сервисах.',
  no_images: 'Запросите свежие фото или видеообзор и проверьте изображения обратным поиском.',
  unavailable_owner: 'Попросите созвон с владельцем, документы и подтверждение права сдачи квартиры.',
  low_details: 'Уточните площадь, этаж, район, условия договора и правила оплаты.',
}

type StoredAnalysisRecord = Prisma.AnalysisRequestGetPayload<{
  include: {
    result: {
      include: {
        risks: true
      }
    }
  }
}>

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function toJsonObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return null
  }

  return value as Record<string, unknown>
}

function toStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function toPriceAnalytics(value: Prisma.JsonValue | null | undefined): PriceAnalyticsDto {
  const data = toJsonObject(value)

  return {
    listingPrice: typeof data?.listingPrice === 'number' ? data.listingPrice : null,
    cityAveragePrice: typeof data?.cityAveragePrice === 'number' ? data.cityAveragePrice : null,
    districtAveragePrice: typeof data?.districtAveragePrice === 'number' ? data.districtAveragePrice : null,
    comparisonPercent: typeof data?.comparisonPercent === 'number' ? data.comparisonPercent : null,
    comparisonText: typeof data?.comparisonText === 'string' ? data.comparisonText : null,
    marketPositionLabel: typeof data?.marketPositionLabel === 'string' ? data.marketPositionLabel : null,
    disclaimer: typeof data?.disclaimer === 'string' ? data.disclaimer : null,
    periodLabel: typeof data?.periodLabel === 'string' ? data.periodLabel : null,
    trend: Array.isArray(data?.trend)
      ? data.trend.map((item) => {
          const trendItem = item as Record<string, unknown>
          return {
            label: typeof trendItem.label === 'string' ? trendItem.label : '',
            cityPrice: typeof trendItem.cityPrice === 'number' ? trendItem.cityPrice : null,
            districtPrice: typeof trendItem.districtPrice === 'number' ? trendItem.districtPrice : null,
            listingPrice: typeof trendItem.listingPrice === 'number' ? trendItem.listingPrice : null,
          }
        })
      : [],
    comparisonSource:
      data?.comparisonSource === 'krisha_live' || data?.comparisonSource === 'heuristic'
        ? data.comparisonSource
        : 'unavailable',
  }
}

function normalizeRiskCode(value?: string | null): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function mergeRisks(heuristic: HeuristicAnalysisResult, aiAttempt: AiAnalysisAttempt | null): RiskItemDto[] {
  const map = new Map<string, RiskItemDto>()

  for (const risk of heuristic.risks) {
    const key = `${risk.code ?? 'heuristic'}:${risk.title.toLowerCase()}`
    map.set(key, {
      code: normalizeRiskCode(risk.code),
      title: risk.title,
      description: risk.description,
      severity: risk.severity,
    })
  }

  for (const risk of aiAttempt?.parsed?.risks ?? []) {
    const key = `${risk.title.toLowerCase()}:${risk.description.toLowerCase()}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        code: null,
        title: risk.title,
        description: risk.description,
        severity: normalizeSeverity(risk.severity),
      })
      continue
    }

    if (existing.severity === 'medium' && risk.severity === 'high') {
      existing.severity = 'high'
    }
  }

  return Array.from(map.values())
}

function mergeVerdict(heuristic: HeuristicAnalysisResult, aiAttempt: AiAnalysisAttempt | null, mergedRisks: RiskItemDto[]) {
  const aiVerdict = aiAttempt?.parsed?.verdict
  const aiScore = aiAttempt?.parsed?.score
  const score = aiScore == null ? heuristic.score : clampScore((heuristic.score * 0.55) + (aiScore * 0.45))
  const highRiskCount = mergedRisks.filter((risk) => risk.severity === 'high').length

  let verdict = heuristic.verdict

  if (aiVerdict === 'Suspicious' || heuristic.verdict === 'Suspicious') {
    verdict = score < 70 || highRiskCount > 0 ? 'Suspicious' : 'Needs Manual Review'
  } else if (aiVerdict === 'Safe' && heuristic.verdict === 'Safe' && score >= 75 && highRiskCount === 0) {
    verdict = 'Safe'
  } else if (aiVerdict === 'Needs Manual Review') {
    verdict = 'Needs Manual Review'
  }

  if (score < 45 || highRiskCount >= 2) {
    verdict = 'Suspicious'
  }

  return { verdict, score }
}

function buildRecommendations(finalRecommendation: string, risks: RiskItemDto[]): string[] {
  return uniqueStrings([
    finalRecommendation,
    ...risks
      .map((risk) => (risk.code ? riskRecommendationMap[risk.code] : undefined))
      .filter((item): item is string => Boolean(item)),
  ])
}

function mapSeverityForStorage(value: string): RiskSeverityType {
  if (value === 'high') return RiskSeverity.HIGH
  if (value === 'medium') return RiskSeverity.MEDIUM
  return RiskSeverity.LOW
}

function toListingPayload(listing: ExtractedListingData) {
  return {
    title: listing.title ?? null,
    description: listing.description ?? null,
    price: listing.price ?? null,
    currency: listing.currency ?? null,
    city: listing.city ?? null,
    district: listing.district ?? null,
    address: listing.address ?? null,
    rooms: listing.rooms ?? null,
    areaSqm: listing.areaSqm ?? null,
    floor: listing.floor ?? null,
    totalFloors: listing.totalFloors ?? null,
    housingType: listing.housingType ?? null,
    condition: listing.condition ?? null,
    sellerType: listing.sellerType ?? null,
    rentalType: listing.rentalType ?? null,
    phoneAvailable: listing.phoneAvailable ?? null,
    images: listing.images,
    coordinates: listing.coordinates ?? null,
    rawText: listing.rawText,
  }
}

function getExtractionWarnings(record: StoredAnalysisRecord): string[] {
  const extractionMeta = toJsonObject(record.extractionMeta)
  const warnings = extractionMeta?.extractionWarnings
  return Array.isArray(warnings) ? warnings.filter((item): item is string => typeof item === 'string') : []
}

function mapRecordToDetail(record: StoredAnalysisRecord): AnalysisDetailDto {
  if (!record.result) {
    throw new ApiError(404, 'Analysis result not found')
  }

  const listingSnapshot = toJsonObject(record.result.listingSnapshot)
  const listingCoordinates =
    listingSnapshot?.coordinates && typeof listingSnapshot.coordinates === 'object'
      ? (listingSnapshot.coordinates as { lat: number; lng: number })
      : null

  const risks: RiskItemDto[] = record.result.risks.map((risk) => ({
    code: risk.code,
    title: risk.title,
    description: risk.description,
    severity: normalizeSeverity(risk.severity),
  }))

  const recommendations = buildRecommendations(record.result.recommendation, risks)
  const priceAnalytics = toPriceAnalytics(record.result.priceAnalytics)

  return {
    id: record.id,
    sourceUrl: record.sourceUrl,
    platform: fromPrismaPlatform(record.platform),
    createdAt: record.createdAt.toISOString(),
    listing: {
      title: typeof listingSnapshot?.title === 'string' ? listingSnapshot.title : null,
      description: typeof listingSnapshot?.description === 'string' ? listingSnapshot.description : null,
      price: typeof listingSnapshot?.price === 'number' ? listingSnapshot.price : null,
      currency: typeof listingSnapshot?.currency === 'string' ? listingSnapshot.currency : null,
      city: typeof listingSnapshot?.city === 'string' ? listingSnapshot.city : null,
      district: typeof listingSnapshot?.district === 'string' ? listingSnapshot.district : null,
      address: typeof listingSnapshot?.address === 'string' ? listingSnapshot.address : null,
      rooms: typeof listingSnapshot?.rooms === 'number' ? listingSnapshot.rooms : null,
      areaSqm: typeof listingSnapshot?.areaSqm === 'number' ? listingSnapshot.areaSqm : null,
      floor: typeof listingSnapshot?.floor === 'number' ? listingSnapshot.floor : null,
      totalFloors: typeof listingSnapshot?.totalFloors === 'number' ? listingSnapshot.totalFloors : null,
      housingType: typeof listingSnapshot?.housingType === 'string' ? listingSnapshot.housingType : null,
      condition: typeof listingSnapshot?.condition === 'string' ? listingSnapshot.condition : null,
      sellerType: typeof listingSnapshot?.sellerType === 'string' ? listingSnapshot.sellerType : null,
      rentalType: typeof listingSnapshot?.rentalType === 'string' ? listingSnapshot.rentalType : null,
      phoneAvailable: typeof listingSnapshot?.phoneAvailable === 'boolean' ? listingSnapshot.phoneAvailable : null,
      images: Array.isArray(listingSnapshot?.images)
        ? listingSnapshot.images.filter((item): item is string => typeof item === 'string')
        : [],
      coordinates: listingCoordinates,
      rawText: typeof listingSnapshot?.rawText === 'string' ? listingSnapshot.rawText : '',
    },
    verdict: toHumanVerdict(record.result.verdict),
    score: record.result.score,
    trustScore: record.result.score,
    confidence: record.result.confidence ?? 'medium',
    summary: record.result.summary,
    recommendation: record.result.recommendation,
    risks,
    positiveSignals: toStringArray(record.result.positiveSignals),
    negativeSignals: risks.map((risk) => risk.description),
    uncertaintySignals: toStringArray(record.result.uncertaintySignals),
    recommendations,
    manualCheckRecommendations: toStringArray(record.result.manualChecks),
    priceAnalytics,
    metadata: {
      analysisMode: normalizeAnalysisMode(record.result.analysisMode),
      aiProvider: record.result.aiProvider,
      aiModel: record.result.aiModel,
      sourceMode: record.sourceMode,
      extractionWarnings: getExtractionWarnings(record),
    },
  }
}

function mapRecordToHistory(record: StoredAnalysisRecord): AnalysisHistoryItemDto {
  if (!record.result) {
    throw new ApiError(404, 'Analysis result not found')
  }

  return {
    id: record.id,
    sourceUrl: record.sourceUrl,
    platform: fromPrismaPlatform(record.platform),
    verdict: toHumanVerdict(record.result.verdict),
    score: record.result.score,
    summary: record.result.summary,
    createdAt: record.createdAt.toISOString(),
  }
}

export class AnalysisService {
  private extractor = new ListingExtractorService()
  private heuristicAnalyzer = new HeuristicAnalysisService()
  private aiAnalyzer = new AiAnalysisService()

  async create(input: CreateAnalysisInput, userId?: string): Promise<AnalysisDetailDto> {
    const sourceUrl = input.url ?? null
    const sourceHost = sourceUrl ? new URL(sourceUrl).hostname : null
    const initialPlatform = sourceUrl ? detectPlatformFromUrl(sourceUrl) : 'other'

    const request = await prisma.analysisRequest.create({
      data: {
        userId,
        sourceUrl,
        sourceHost,
        manualText: input.manualText,
        platform: toPrismaPlatform(initialPlatform),
        status: RequestStatus.PENDING,
      },
    })

    try {
      const extracted = await this.extractor.extract(input)
      const heuristic = await this.heuristicAnalyzer.analyze(extracted)
      const aiAttempt = await this.aiAnalyzer.analyze(extracted, heuristic)
      const mergedRisks = mergeRisks(heuristic, aiAttempt)
      const mergedVerdict = mergeVerdict(heuristic, aiAttempt, mergedRisks)
      const summary = aiAttempt?.parsed?.summary ?? heuristic.summary
      const recommendation = aiAttempt?.parsed?.recommendation ?? heuristic.recommendation
      const recommendations = buildRecommendations(recommendation, mergedRisks)

      await prisma.$transaction(async (tx) => {
        await tx.analysisRequest.update({
          where: { id: request.id },
          data: {
            rawText: extracted.rawText,
            sourceHost,
            platform: toPrismaPlatform(extracted.platform),
            sourceMode: extracted.sourceMode,
            status: RequestStatus.COMPLETED,
            parsedListing: extracted.normalizedListing
              ? (extracted.normalizedListing as unknown as Prisma.InputJsonValue)
              : (toListingPayload(extracted) as unknown as Prisma.InputJsonValue),
            extractionMeta: {
              metadata: extracted.metadata,
              extractionWarnings: extracted.extractionWarnings,
            } as Prisma.InputJsonValue,
          },
        })

        const result = await tx.analysisResult.create({
          data: {
            requestId: request.id,
            verdict: toPrismaVerdict(mergedVerdict.verdict),
            score: mergedVerdict.score,
            summary,
            recommendation,
            confidence: heuristic.confidence,
            analysisMode: aiAttempt
              ? aiAttempt.parsed
                ? aiAttempt.mode === 'ai_primary'
                  ? AnalysisMode.AI_PRIMARY
                  : AnalysisMode.AI_FALLBACK
                : AnalysisMode.AI_FALLBACK
              : AnalysisMode.HEURISTIC_ONLY,
            aiProvider: aiAttempt?.provider ?? null,
            aiModel: aiAttempt?.model ?? null,
            aiRawResponse: aiAttempt?.rawText ? ({ rawText: aiAttempt.rawText } as Prisma.InputJsonValue) : PrismaRuntime.JsonNull,
            heuristicSignals: heuristic.risks as unknown as Prisma.InputJsonValue,
            positiveSignals: heuristic.positiveSignals as unknown as Prisma.InputJsonValue,
            uncertaintySignals: heuristic.uncertaintySignals as unknown as Prisma.InputJsonValue,
            manualChecks: uniqueStrings([...heuristic.manualCheckRecommendations, ...recommendations]) as unknown as Prisma.InputJsonValue,
            listingSnapshot: toListingPayload(extracted) as unknown as Prisma.InputJsonValue,
            priceAnalytics: heuristic.priceAnalytics as unknown as Prisma.InputJsonValue,
            risks: {
              create: mergedRisks.map((risk) => ({
                code: risk.code,
                title: risk.title,
                description: risk.description,
                severity: mapSeverityForStorage(risk.severity),
              })),
            },
          },
        })

        if (userId && input.saveReport) {
          await tx.savedReport.upsert({
            where: {
              userId_analysisResultId: {
                userId,
                analysisResultId: result.id,
              },
            },
            update: {},
            create: {
              userId,
              analysisResultId: result.id,
            },
          })
        }
      })

      const stored = await this.findByIdInternal(request.id)
      return mapRecordToDetail(stored)
    } catch (error) {
      await prisma.analysisRequest.update({
        where: { id: request.id },
        data: {
          status: RequestStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown analysis error',
        },
      })

      throw error
    }
  }

  async history(userId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      prisma.analysisRequest.findMany({
        where: {
          userId,
          result: {
            isNot: null,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          result: {
            include: {
              risks: true,
            },
          },
        },
      }),
      prisma.analysisRequest.count({
        where: {
          userId,
          result: {
            isNot: null,
          },
        },
      }),
    ])

    return {
      items: items.map(mapRecordToHistory),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async getById(userId: string, analysisId: string): Promise<AnalysisDetailDto> {
    const record = await this.findByIdInternal(analysisId)

    if (record.userId !== userId) {
      throw new ApiError(404, 'Analysis not found')
    }

    return mapRecordToDetail(record)
  }

  async delete(userId: string, analysisId: string) {
    const record = await this.findByIdInternal(analysisId)

    if (record.userId !== userId) {
      throw new ApiError(404, 'Analysis not found')
    }

    await prisma.analysisRequest.delete({
      where: { id: analysisId },
    })
  }

  private async findByIdInternal(analysisId: string): Promise<StoredAnalysisRecord> {
    const record = await prisma.analysisRequest.findUnique({
      where: { id: analysisId },
      include: {
        result: {
          include: {
            risks: true,
          },
        },
      },
    })

    if (!record || !record.result) {
      throw new ApiError(404, 'Analysis not found')
    }

    return record
  }
}
