import { TrustScoreCard } from './TrustScoreCard';
import { ListingDetailsCard } from './ListingDetailsCard';
import { PriceAnalyticsCard } from './PriceAnalyticsCard';
import { PriceAnalyticsDemo } from './PriceAnalyticsDemo';
import { RiskAnalysisCard } from './RiskAnalysisCard';
import { RecommendationsCard } from './RecommendationsCard';
import { MapCard } from './MapCard';
import { motion } from 'motion/react';
import type { AnalysisResult } from '@/lib/analysis/types';
import { generateMockPriceAnalytics } from '@/lib/analysis/mockPriceAnalytics';

// Demo mode flag - set to true for presentation, false for production
const useMockAnalytics = true;

interface ResultsDashboardProps {
  listingUrl: string;
  analysisResult: AnalysisResult | null;
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
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const parsedListing = analysisResult?.ok ? analysisResult.listing : null;
  const listingDetails = {
    price: parsedListing?.price,
    city: parsedListing?.city ?? 'Не указано',
    district: parsedListing?.district ?? 'Не указано',
    street: parsedListing?.address ?? parsedListing?.rawAddress ?? 'Не указано',
    rooms: parsedListing?.rooms !== undefined ? String(parsedListing.rooms) : 'Не указано',
    area: parsedListing?.areaSqm !== undefined ? `${parsedListing.areaSqm} м²` : 'Не указано',
    floor: parsedListing?.floor !== undefined ? String(parsedListing.floor) : 'Не указано',
    totalFloors: parsedListing?.totalFloors !== undefined ? String(parsedListing.totalFloors) : 'Не указано',
    rentalType: parsedListing?.rentalType ?? 'Не указано',
  };

  const mapData = {
    verified: Boolean(parsedListing?.coordinates),
    coordinates: parsedListing?.coordinates,
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 py-8 pb-20"
    >
      {/* URL Display */}
      <motion.div variants={item} className="rounded-lg border border-border/50 bg-card/50 px-4 py-3">
        <p className="truncate text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Анализ:</span> {listingUrl}
        </p>
      </motion.div>

      {!analysisResult?.ok && analysisResult ? (
        <motion.div variants={item} className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
          <p className="text-sm font-medium text-red-500">Ошибка парсинга: {analysisResult.error.code}</p>
          <p className="mt-1 text-sm text-muted-foreground">{analysisResult.error.message}</p>
        </motion.div>
      ) : null}

      {/* Trust Score - Full Width */}
      <motion.div variants={item}>
        <TrustScoreCard
          score={analysisResult?.ok ? analysisResult.trustScore : 0}
          confidence={analysisResult?.ok ? analysisResult.confidence : 'Низкая'}
        />
      </motion.div>

      {/* Two Column Layout */}
      <motion.div variants={item} className="grid gap-8 lg:grid-cols-2">
        <ListingDetailsCard listing={listingDetails} />
        {useMockAnalytics ? (
          <PriceAnalyticsDemo data={generateMockPriceAnalytics(parsedListing?.price || 150000)} />
        ) : (
          <PriceAnalyticsCard
            analysis={{
              listingPrice: analysisResult?.ok ? analysisResult.priceAnalytics.listingPrice : null,
              cityAveragePrice: analysisResult?.ok ? analysisResult.priceAnalytics.cityAveragePrice ?? null : null,
              districtAveragePrice: analysisResult?.ok ? analysisResult.priceAnalytics.districtAveragePrice ?? null : null,
              comparisonPercent: analysisResult?.ok ? analysisResult.priceAnalytics.comparisonPercent ?? null : null,
              comparisonText: analysisResult?.ok ? analysisResult.priceAnalytics.comparisonText ?? null : null,
              periodLabel: analysisResult?.ok ? analysisResult.priceAnalytics.periodLabel ?? '6 месяцев' : '6 месяцев',
              chart: analysisResult?.ok
                ? (analysisResult.priceAnalytics.trend ?? []).map((item) => ({
                    label: item.label,
                    city: item.cityPrice ?? null,
                    district: item.districtPrice ?? null,
                    listing: item.listingPrice ?? null,
                  }))
                : [],
              hasDistrictData:
                analysisResult?.ok &&
                analysisResult.priceAnalytics.districtAveragePrice != null &&
                (analysisResult.priceAnalytics.trend ?? []).some(
                  (item) => item.districtPrice != null,
                ),
            }}
          />
        )}
      </motion.div>

      {/* Risk Analysis - Full Width */}
      <motion.div variants={item}>
        <RiskAnalysisCard
          risks={{
            positive: analysisResult?.ok ? analysisResult.risks.positive : [],
            negative: analysisResult?.ok ? analysisResult.risks.negative : [],
            uncertainty: analysisResult?.ok ? analysisResult.risks.uncertainty : [],
          }}
        />
      </motion.div>

      {/* Two Column Layout */}
      <motion.div variants={item} className="grid gap-8 lg:grid-cols-2">
        <RecommendationsCard
          recommendations={
            analysisResult?.ok
              ? [
                  ...analysisResult.recommendations.map((item) => item.text),
                  ...analysisResult.manualCheckRecommendations,
                ]
              : []
          }
        />
        <MapCard mapData={mapData} address={listingDetails.street} />
      </motion.div>
    </motion.div>
  );
}