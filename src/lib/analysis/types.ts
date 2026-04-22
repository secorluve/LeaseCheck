import type { NormalizedListing, ParseFailure } from '../parsers'

export type RiskSeverity = 'low' | 'medium' | 'high'

export interface AnalysisInput {
  url?: string
  manualText?: string
  title?: string
  location?: string
  price?: number
}

export interface RiskSignal {
  code:
    | 'price_too_low'
    | 'price_slightly_low'
    | 'missing_address'
    | 'vague_address'
    | 'low_description_quality'
    | 'incomplete_listing'
    | 'no_images'
    | 'inconsistent_data'
    | 'missing_seller_info'
    | 'extraction_uncertain'
    | 'suspicious_floor_data'
  severity: RiskSeverity
  reason: string
}

export interface ScoreSignal {
  code: string
  weight: number
  reason: string
  category?: 'positive' | 'negative' | 'uncertainty'
}

export interface ScoreBreakdown {
  baseScore: number
  signals: ScoreSignal[]
  finalScore: number
}

export interface PriceAnalytics {
  listingPrice: number | null
  cityAveragePrice: number | null
  districtAveragePrice: number | null
  comparisonPercent: number | null
  comparisonText: string | null
  marketPositionLabel: string | null
  disclaimer: string | null
  periodLabel: string | null
  trend: Array<{
    label: string
    cityPrice: number | null
    districtPrice: number | null
    listingPrice: number | null
  }>
  comparisonSource?: 'krisha_live' | 'heuristic' | 'unavailable'
}

export interface RiskItem {
  code?: string | null
  title: string
  description: string
  severity: RiskSeverity
}

export interface Recommendation {
  riskCode?: string | null
  text: string
}

export interface AnalysisSuccess {
  ok: true
  id?: string
  verdict?: 'Safe' | 'Suspicious' | 'Needs Manual Review'
  trustScore: number
  confidence: string
  summary?: string
  recommendation?: string
  listing: NormalizedListing
  scoreBreakdown?: ScoreBreakdown
  risks: {
    positive: string[]
    negative: string[]
    uncertainty: string[]
    signals?: RiskSignal[]
    items?: RiskItem[]
  }
  recommendations: Recommendation[]
  manualCheckRecommendations: string[]
  positiveSignals?: string[]
  negativeSignals?: string[]
  uncertaintySignals?: string[]
  scoreExplanation?: {
    confirmed: string[]
    uncertain: string[]
  }
  priceAnalytics: PriceAnalytics
  aiSummaryInput?: {
    listing: NormalizedListing
    signals: RiskSignal[]
    scoreBreakdown: ScoreBreakdown
  }
}

export type AnalysisFailure = ParseFailure | {
  ok: false
  error: {
    code: string
    message: string
  }
}

export type AnalysisResult = AnalysisSuccess | AnalysisFailure
