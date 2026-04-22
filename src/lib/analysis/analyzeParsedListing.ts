import type { NormalizedListing } from "../parsers";
import { buildAiSummaryInput } from "./buildAiSummaryInput";
import { buildRecommendations } from "./recommendations";
import { scoreListing } from "./scoring";
import type { AnalysisSuccess } from "./types";

export async function analyzeParsedListing(listing: NormalizedListing): Promise<AnalysisSuccess> {
  const scored = await scoreListing(listing);
  const recommendations = buildRecommendations(scored.risks);

  return {
    ok: true,
    listing,
    trustScore: scored.trustScore,
    confidence: scored.confidence,
    scoreBreakdown: scored.scoreBreakdown,
    risks: {
      positive: scored.positives,
      negative: scored.risks.map((risk) => risk.reason),
      uncertainty: scored.uncertainty,
      signals: scored.risks,
    },
    recommendations,
    manualCheckRecommendations: scored.manualChecks,
    positiveSignals: scored.positives,
    negativeSignals: scored.risks.map((risk) => risk.reason),
    uncertaintySignals: scored.uncertainty,
    scoreExplanation: {
      confirmed: scored.confirmed,
      uncertain: scored.uncertainty,
    },
    priceAnalytics: scored.priceAnalytics,
    aiSummaryInput: buildAiSummaryInput(listing, scored.risks, scored.scoreBreakdown),
  };
}
