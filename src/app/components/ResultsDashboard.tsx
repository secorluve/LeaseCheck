import { motion } from 'motion/react'
import type { AnalysisResult } from '@/lib/analysis/types'
import { ListingDetailsCard } from './ListingDetailsCard'
import { MapCard } from './MapCard'
import { PriceAnalyticsCard } from './PriceAnalyticsCard'
import { RecommendationsCard } from './RecommendationsCard'
import { RiskAnalysisCard } from './RiskAnalysisCard'
import { TrustScoreCard } from './TrustScoreCard'

interface ResultsDashboardProps {
  listingUrl: string
  analysisResult: AnalysisResult | null
}

function getErrorTitle(code: string): string {
  switch (code) {
    case 'invalid_url':
      return 'Некорректная ссылка'
    case 'unsupported_source':
      return 'Источник пока не поддерживается'
    case 'fetch_failed':
      return 'Не удалось загрузить страницу объявления'
    case 'blocked_or_incomplete_page':
      return 'Страница недоступна для автоматического разбора'
    case 'analysis_failed':
      return 'Не удалось выполнить анализ'
    default:
      return 'Ошибка анализа'
  }
}

function needsBackendHint(message: string): boolean {
  return (
    message.includes('VITE_API_BASE_URL') ||
    message.includes('HTML вместо JSON') ||
    message.includes('HTML instead of JSON') ||
    message.includes('Unexpected token')
  )
}

export function ResultsDashboard({ listingUrl, analysisResult }: ResultsDashboardProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  const successfulAnalysis = analysisResult?.ok ? analysisResult : null
  const analysisError = analysisResult?.ok === false ? analysisResult.error : null
  const parsedListing = successfulAnalysis?.listing ?? null

  const listingDetails = {
    price: parsedListing?.price ?? undefined,
    city: parsedListing?.city ?? 'Не указано',
    district: parsedListing?.district ?? 'Не указано',
    street: parsedListing?.address ?? 'Не указано',
    rooms: parsedListing?.rooms != null ? String(parsedListing.rooms) : 'Не указано',
    area: parsedListing?.areaSqm != null ? `${parsedListing.areaSqm} м²` : 'Не указано',
    floor: parsedListing?.floor != null ? String(parsedListing.floor) : 'Не указано',
    totalFloors: parsedListing?.totalFloors != null ? String(parsedListing.totalFloors) : 'Не указано',
    rentalType: parsedListing?.rentalType ?? 'Не указано',
  }

  const mapData = {
    verified: Boolean(parsedListing?.coordinates),
    coordinates: parsedListing?.coordinates ?? undefined,
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 py-8 pb-20"
    >
      <motion.div variants={item} className="rounded-lg border border-border/50 bg-card/50 px-4 py-3">
        <p className="truncate text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Анализ:</span> {listingUrl}
        </p>
      </motion.div>

      {analysisError ? (
        <motion.div variants={item} className="rounded-2xl border border-red-500/30 bg-red-500/5 px-5 py-4">
          <p className="text-sm font-semibold text-red-500">{getErrorTitle(analysisError.code)}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{analysisError.message}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">Код: {analysisError.code}</p>
          {needsBackendHint(analysisError.message) ? (
            <div className="mt-4 rounded-xl border border-border/50 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
              Проверьте, что во frontend задан `VITE_API_BASE_URL` и он указывает на backend `/api`.
            </div>
          ) : null}
        </motion.div>
      ) : null}

      {!successfulAnalysis ? null : (
        <>
          <motion.div variants={item}>
            <TrustScoreCard
              score={successfulAnalysis.trustScore}
              confidence={successfulAnalysis.confidence}
              verdict={successfulAnalysis.verdict ?? 'Needs Manual Review'}
              summary={
                successfulAnalysis.summary ??
                'Объявление проанализировано, но итоговое пояснение не было сформировано.'
              }
            />
          </motion.div>

          <motion.div variants={item} className="grid gap-8 lg:grid-cols-2">
            <ListingDetailsCard listing={listingDetails} />
            <PriceAnalyticsCard
              analysis={{
                listingPrice: successfulAnalysis.priceAnalytics.listingPrice ?? null,
                cityAveragePrice: successfulAnalysis.priceAnalytics.cityAveragePrice ?? null,
                districtAveragePrice: successfulAnalysis.priceAnalytics.districtAveragePrice ?? null,
                comparisonPercent: successfulAnalysis.priceAnalytics.comparisonPercent ?? null,
                comparisonText: successfulAnalysis.priceAnalytics.comparisonText ?? null,
                marketPositionLabel: successfulAnalysis.priceAnalytics.marketPositionLabel ?? null,
                disclaimer: successfulAnalysis.priceAnalytics.disclaimer ?? null,
                periodLabel: successfulAnalysis.priceAnalytics.periodLabel ?? 'Недоступно',
                chart: (successfulAnalysis.priceAnalytics.trend ?? []).map((trendItem) => ({
                  label: trendItem.label,
                  city: trendItem.cityPrice ?? null,
                  district: trendItem.districtPrice ?? null,
                  listing: trendItem.listingPrice ?? null,
                })),
                hasDistrictData:
                  successfulAnalysis.priceAnalytics.districtAveragePrice != null &&
                  (successfulAnalysis.priceAnalytics.trend ?? []).some((trendItem) => trendItem.districtPrice != null),
              }}
            />
          </motion.div>

          <motion.div variants={item}>
            <RiskAnalysisCard
              risks={{
                positive: successfulAnalysis.risks.positive ?? [],
                negative: successfulAnalysis.risks.negative ?? [],
                uncertainty: successfulAnalysis.risks.uncertainty ?? [],
                items: successfulAnalysis.risks.items ?? [],
              }}
            />
          </motion.div>

          <motion.div variants={item} className="grid gap-8 lg:grid-cols-2">
            <RecommendationsCard
              recommendations={[
                ...successfulAnalysis.recommendations.map((item) => item.text),
                ...successfulAnalysis.manualCheckRecommendations,
              ]}
            />
            <MapCard mapData={mapData} address={listingDetails.street} />
          </motion.div>
        </>
      )}
    </motion.div>
  )
}
