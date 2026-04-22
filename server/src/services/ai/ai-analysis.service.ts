import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { env } from '../../config/env'
import { logger } from '../../config/logger'
import type { AiAnalysisAttempt, ExtractedListingData, HeuristicAnalysisResult } from '../../types/api'
import { safeJsonParse } from '../../utils/safe-json'

const aiResponseSchema = z.object({
  verdict: z.enum(['Safe', 'Suspicious', 'Needs Manual Review']),
  score: z.number().int().min(0).max(100),
  summary: z.string().min(10).max(600),
  recommendation: z.string().min(10).max(400),
  risks: z
    .array(
      z.object({
        title: z.string().min(3).max(120),
        description: z.string().min(10).max(400),
        severity: z.enum(['low', 'medium', 'high']),
      }),
    )
    .max(8),
})

const outputFormat = zodTextFormat(aiResponseSchema, 'rental_listing_risk_report')

const systemPrompt = `
Ты анализируешь объявления об аренде жилья на риск мошенничества.
Работай только по фактам из переданных данных и не придумывай детали.
Если данных недостаточно, повышай осторожность и используй вердикт "Needs Manual Review".
Пиши summary, recommendation и описания risks на русском языке.
`
  .trim()

export class AiAnalysisService {
  private client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null

  async analyze(listing: ExtractedListingData, heuristic: HeuristicAnalysisResult): Promise<AiAnalysisAttempt | null> {
    if (!this.client) {
      return null
    }

    try {
      const response = await this.client.responses.create({
        model: env.OPENAI_MODEL,
        store: false,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: systemPrompt }],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: JSON.stringify(
                  {
                    listing,
                    heuristic,
                  },
                  null,
                  2,
                ),
              },
            ],
          },
        ],
        text: {
          format: outputFormat,
        },
      })

      const rawText = response.output_text ?? null

      if (!rawText) {
        return {
          provider: 'openai',
          model: env.OPENAI_MODEL,
          mode: 'ai_fallback',
          rawText: null,
          parsed: null,
        }
      }

      try {
        const parsed = outputFormat.$parseRaw(rawText)
        return {
          provider: 'openai',
          model: env.OPENAI_MODEL,
          mode: 'ai_primary',
          rawText,
          parsed,
        }
      } catch (parseError) {
        logger.warn('AI response could not be parsed with strict schema', {
          error: parseError instanceof Error ? parseError.message : 'unknown_error',
        })

        const fallbackJson = safeJsonParse(rawText)
        const parsed = aiResponseSchema.safeParse(fallbackJson)

        return {
          provider: 'openai',
          model: env.OPENAI_MODEL,
          mode: 'ai_fallback',
          rawText,
          parsed: parsed.success ? parsed.data : null,
        }
      }
    } catch (error) {
      logger.error('AI analysis request failed', {
        error: error instanceof Error ? error.message : 'unknown_error',
      })
      return null
    }
  }
}
