import type { NormalizedListing } from '../../../src/lib/parsers/types'

export type PlatformSlug = 'krisha' | 'olx' | 'airbnb' | 'booking' | 'other'
export type HumanVerdict = 'Safe' | 'Suspicious' | 'Needs Manual Review'
export type RiskSeverityValue = 'low' | 'medium' | 'high'
export type AnalysisModeValue = 'ai_primary' | 'ai_fallback' | 'heuristic_only'

export interface CreateAnalysisInput {
  url?: string
  manualText?: string
  title?: string
  location?: string
  price?: number
  saveReport?: boolean
}

export interface PriceAnalyticsDto {
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
  comparisonSource: 'krisha_live' | 'heuristic' | 'unavailable'
}

export interface RiskItemDto {
  code?: string | null
  title: string
  description: string
  severity: RiskSeverityValue
}

export interface ExtractedListingData {
  sourceUrl: string | null
  platform: PlatformSlug
  sourceMode: 'structured' | 'generic' | 'manual' | 'mixed'
  title?: string
  description?: string
  rawText: string
  price?: number
  currency?: string
  city?: string
  district?: string
  address?: string
  locationText?: string
  rooms?: number
  areaSqm?: number
  floor?: number
  totalFloors?: number
  housingType?: string
  condition?: string
  sellerType?: string
  rentalType?: string
  phoneAvailable?: boolean
  images: string[]
  coordinates?: { lat: number; lng: number }
  metadata: Record<string, unknown>
  extractionWarnings: string[]
  normalizedListing?: NormalizedListing
}

export interface HeuristicSignal extends RiskItemDto {
  scoreImpact: number
}

export interface HeuristicAnalysisResult {
  verdict: HumanVerdict
  score: number
  confidence: string
  summary: string
  recommendation: string
  risks: HeuristicSignal[]
  positiveSignals: string[]
  negativeSignals: string[]
  uncertaintySignals: string[]
  manualCheckRecommendations: string[]
  priceAnalytics: PriceAnalyticsDto
}

export interface AiStructuredAnalysis {
  verdict: HumanVerdict
  score: number
  summary: string
  recommendation: string
  risks: RiskItemDto[]
}

export interface AiAnalysisAttempt {
  provider: string
  model: string
  mode: AnalysisModeValue
  rawText: string | null
  parsed: AiStructuredAnalysis | null
}

export interface PublicUserDto {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  subscriptionPlan: {
    code: string
    name: string
    description: string | null
  } | null
}

export interface AuthPayloadDto {
  user: PublicUserDto
  accessToken: string
}

export interface AnalysisDetailDto {
  id: string
  sourceUrl: string | null
  platform: PlatformSlug
  createdAt: string
  listing: {
    title: string | null
    description: string | null
    price: number | null
    currency: string | null
    city: string | null
    district: string | null
    address: string | null
    rooms: number | null
    areaSqm: number | null
    floor: number | null
    totalFloors: number | null
    housingType: string | null
    condition: string | null
    sellerType: string | null
    rentalType: string | null
    phoneAvailable: boolean | null
    images: string[]
    coordinates: { lat: number; lng: number } | null
    rawText: string
  }
  verdict: HumanVerdict
  score: number
  trustScore: number
  confidence: string
  summary: string
  recommendation: string
  risks: RiskItemDto[]
  positiveSignals: string[]
  negativeSignals: string[]
  uncertaintySignals: string[]
  recommendations: string[]
  manualCheckRecommendations: string[]
  priceAnalytics: PriceAnalyticsDto
  metadata: {
    analysisMode: AnalysisModeValue
    aiProvider: string | null
    aiModel: string | null
    sourceMode: string | null
    extractionWarnings: string[]
  }
}

export interface AnalysisHistoryItemDto {
  id: string
  sourceUrl: string | null
  platform: PlatformSlug
  verdict: HumanVerdict
  score: number
  summary: string
  createdAt: string
}
