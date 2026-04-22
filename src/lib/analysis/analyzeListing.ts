import { apiRequest } from '@/lib/api/client'
import type { AnalysisInput, AnalysisResult, AnalysisSuccess, Recommendation } from './types'

interface BackendAnalysisResponse {
  success: true
  data: {
    id: string
    verdict: 'Safe' | 'Suspicious' | 'Needs Manual Review'
    score: number
    trustScore: number
    confidence: string
    summary: string
    recommendation: string
    listing: AnalysisSuccess['listing']
    risks: Array<{
      code?: string | null
      title: string
      description: string
      severity: 'low' | 'medium' | 'high'
    }>
    positiveSignals: string[]
    negativeSignals: string[]
    uncertaintySignals: string[]
    recommendations: string[]
    manualCheckRecommendations: string[]
    priceAnalytics: AnalysisSuccess['priceAnalytics']
  }
}

function mapRecommendations(items: string[]): Recommendation[] {
  return items.map((text, index) => ({
    riskCode: `rec-${index + 1}`,
    text,
  }))
}

function mapSuccessResponse(response: BackendAnalysisResponse): AnalysisSuccess {
  return {
    ok: true,
    id: response.data.id,
    verdict: response.data.verdict,
    trustScore: response.data.trustScore ?? response.data.score,
    confidence: response.data.confidence,
    summary: response.data.summary,
    recommendation: response.data.recommendation,
    listing: {
      ...response.data.listing,
      images: response.data.listing.images ?? [],
      rawText: response.data.listing.rawText ?? '',
    },
    risks: {
      positive: response.data.positiveSignals ?? [],
      negative: response.data.negativeSignals ?? [],
      uncertainty: response.data.uncertaintySignals ?? [],
      items: response.data.risks ?? [],
    },
    recommendations: mapRecommendations(response.data.recommendations ?? []),
    manualCheckRecommendations: response.data.manualCheckRecommendations ?? [],
    priceAnalytics: response.data.priceAnalytics,
  }
}

export async function analyzeListing(input: AnalysisInput): Promise<AnalysisResult> {
  try {
    const response = await apiRequest<BackendAnalysisResponse>('/analysis', {
      method: 'POST',
      body: JSON.stringify(input),
    })

    return mapSuccessResponse(response)
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'analysis_failed',
        message: error instanceof Error ? error.message : 'Не удалось выполнить анализ объявления',
      },
    }
  }
}
