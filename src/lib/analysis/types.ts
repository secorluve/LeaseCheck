import type { NormalizedListing, ParseFailure } from "../parsers";

export type RiskSeverity = "low" | "medium" | "high";

export interface RiskSignal {
  code:
    | "price_too_low"
    | "price_slightly_low"
    | "missing_address"
    | "vague_address"
    | "low_description_quality"
    | "incomplete_listing"
    | "no_images"
    | "inconsistent_data"
    | "missing_seller_info"
    | "extraction_uncertain"
    | "suspicious_floor_data";
  severity: RiskSeverity;
  reason: string;
}

export interface ScoreSignal {
  code: string;
  weight: number;
  reason: string;
  category?: "positive" | "negative" | "uncertainty";
}

export interface ScoreBreakdown {
  baseScore: number;
  signals: ScoreSignal[];
  finalScore: number;
}

export interface PriceAnalytics {
  listingPrice: number;
  marketPositionLabel?: string;
  disclaimer?: string;
  districtAveragePrice?: number;
  cityAveragePrice?: number;
  comparisonPercent?: number;
  comparisonText?: string;
  periodLabel?: string;
  trend?: Array<{
    label: string;
    cityPrice?: number;
    districtPrice?: number;
    listingPrice?: number;
  }>;
}

export interface Recommendation {
  riskCode: RiskSignal["code"];
  text: string;
}

export interface AnalysisSuccess {
  ok: true;
  listing: NormalizedListing;
  trustScore: number;
  confidence: string;
  scoreBreakdown: ScoreBreakdown;
  risks: {
    positive: string[];
    negative: string[];
    uncertainty: string[];
    signals: RiskSignal[];
  };
  recommendations: Recommendation[];
  manualCheckRecommendations: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  uncertaintySignals: string[];
  scoreExplanation: {
    confirmed: string[];
    uncertain: string[];
  };
  priceAnalytics: PriceAnalytics;
  aiSummaryInput: {
    listing: NormalizedListing;
    signals: RiskSignal[];
    scoreBreakdown: ScoreBreakdown;
  };
}

export type AnalysisResult = AnalysisSuccess | ParseFailure;
