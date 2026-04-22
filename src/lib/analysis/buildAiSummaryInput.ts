import type { NormalizedListing } from "../parsers";
import type { RiskSignal, ScoreBreakdown } from "./types";

export interface AiSummaryInput {
  listing: NormalizedListing;
  signals: RiskSignal[];
  scoreBreakdown: ScoreBreakdown;
}

export function buildAiSummaryInput(
  listing: NormalizedListing,
  signals: RiskSignal[],
  scoreBreakdown: ScoreBreakdown,
): AiSummaryInput {
  return {
    listing,
    signals,
    scoreBreakdown,
  };
}
