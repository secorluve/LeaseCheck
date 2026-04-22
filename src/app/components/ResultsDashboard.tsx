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
  const parsedListing = successfulAnalysis?.listing ?? null
  const analysisError = analysisResult?.ok === false ? analysisResult.error : null

  const listingDetails = {
    price: parsedListing?.price ?? undefined,
    city: parsedListing?.city ?? 'РќРµ СѓРєР°Р·Р°РЅРѕ',
    district: parsedListing?.district ?? 'РќРµ СѓРєР°Р·Р°РЅРѕ',
    street: parsedListing?.address ?? 'РќРµ СѓРєР°Р·Р°РЅРѕ',
    rooms: parsedListing?.rooms != null ? String(parsedListing.rooms) : 'РќРµ СѓРєР°Р·Р°РЅРѕ',
    area: parsedListing?.areaSqm != null ? `${parsedListing.areaSqm} РјВІ` : 'РќРµ СѓРєР°Р·Р°РЅРѕ',
    floor: parsedListing?.floor != null ? String(parsedListing.floor) : 'РќРµ СѓРєР°Р·Р°РЅРѕ',
    totalFloors: parsedListing?.totalFloors != null ? String(parsedListing.totalFloors) : 'РќРµ СѓРєР°Р·Р°РЅРѕ',
    rentalType: parsedListing?.rentalType ?? 'РќРµ СѓРєР°Р·Р°РЅРѕ',
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
          <span className="font-medium text-foreground">РђРЅР°Р»РёР·:</span> {listingUrl}
        </p>
      </motion.div>

      {analysisError ? (
        <motion.div variants={item} className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
          <p className="text-sm font-medium text-red-500">РћС€РёР±РєР° Р°РЅР°Р»РёР·Р°: {analysisError.code}</p>
          <p className="mt-1 text-sm text-muted-foreground">{analysisError.message}</p>
        </motion.div>
      ) : null}

      <motion.div variants={item}>
        <TrustScoreCard
          score={successfulAnalysis?.trustScore ?? 0}
          confidence={successfulAnalysis?.confidence ?? 'low'}
          verdict={successfulAnalysis?.verdict ?? 'Needs Manual Review'}
          summary={
            successfulAnalysis
              ? successfulAnalysis.summary ??
                'РћР±СЉСЏРІР»РµРЅРёРµ РїСЂРѕР°РЅР°Р»РёР·РёСЂРѕРІР°РЅРѕ, РЅРѕ РёС‚РѕРіРѕРІРѕРµ РїРѕСЏСЃРЅРµРЅРёРµ РЅРµ Р±С‹Р»Рѕ СЃС„РѕСЂРјРёСЂРѕРІР°РЅРѕ.'
              : 'РЎРµСЂРІРёСЃ РЅРµ СЃРјРѕРі СЃРѕР±СЂР°С‚СЊ РґРѕСЃС‚Р°С‚РѕС‡РЅРѕРµ РєРѕР»РёС‡РµСЃС‚РІРѕ РґР°РЅРЅС‹С… РґР»СЏ РёС‚РѕРіРѕРІРѕРіРѕ РІРµСЂРґРёРєС‚Р°.'
          }
        />
      </motion.div>

      <motion.div variants={item} className="grid gap-8 lg:grid-cols-2">
        <ListingDetailsCard listing={listingDetails} />
        <PriceAnalyticsCard
          analysis={{
            listingPrice: successfulAnalysis?.priceAnalytics.listingPrice ?? null,
            cityAveragePrice: successfulAnalysis?.priceAnalytics.cityAveragePrice ?? null,
            districtAveragePrice: successfulAnalysis?.priceAnalytics.districtAveragePrice ?? null,
            comparisonPercent: successfulAnalysis?.priceAnalytics.comparisonPercent ?? null,
            comparisonText: successfulAnalysis?.priceAnalytics.comparisonText ?? null,
            marketPositionLabel: successfulAnalysis?.priceAnalytics.marketPositionLabel ?? null,
            disclaimer: successfulAnalysis?.priceAnalytics.disclaimer ?? null,
            periodLabel: successfulAnalysis?.priceAnalytics.periodLabel ?? 'РќРµРґРѕСЃС‚СѓРїРЅРѕ',
            chart: successfulAnalysis
              ? (successfulAnalysis.priceAnalytics.trend ?? []).map((trendItem) => ({
                  label: trendItem.label,
                  city: trendItem.cityPrice ?? null,
                  district: trendItem.districtPrice ?? null,
                  listing: trendItem.listingPrice ?? null,
                }))
              : [],
            hasDistrictData:
              successfulAnalysis?.priceAnalytics.districtAveragePrice != null &&
              (successfulAnalysis.priceAnalytics.trend ?? []).some((trendItem) => trendItem.districtPrice != null),
          }}
        />
      </motion.div>

      <motion.div variants={item}>
        <RiskAnalysisCard
          risks={{
            positive: successfulAnalysis?.risks.positive ?? [],
            negative: successfulAnalysis?.risks.negative ?? [],
            uncertainty: successfulAnalysis?.risks.uncertainty ?? [],
            items: successfulAnalysis?.risks.items ?? [],
          }}
        />
      </motion.div>

      <motion.div variants={item} className="grid gap-8 lg:grid-cols-2">
        <RecommendationsCard
          recommendations={
            successfulAnalysis
              ? [
                  ...successfulAnalysis.recommendations.map((item) => item.text),
                  ...successfulAnalysis.manualCheckRecommendations,
                ]
              : []
          }
        />
        <MapCard mapData={mapData} address={listingDetails.street} />
      </motion.div>
    </motion.div>
  )
}
