import { ListingPlatform } from '@prisma/client'
import type { AnalysisModeValue, HumanVerdict, PlatformSlug, RiskSeverityValue } from '../types/api'

const hostMatchers: Array<{ match: RegExp; platform: PlatformSlug }> = [
  { match: /(^|\.)krisha\.kz$/i, platform: 'krisha' },
  { match: /(^|\.)olx\./i, platform: 'olx' },
  { match: /(^|\.)airbnb\./i, platform: 'airbnb' },
  { match: /(^|\.)booking\.com$/i, platform: 'booking' },
]

export function detectPlatformFromUrl(url: string): PlatformSlug {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    return hostMatchers.find((item) => item.match.test(hostname))?.platform ?? 'other'
  } catch {
    return 'other'
  }
}

export function toPrismaPlatform(platform: PlatformSlug): ListingPlatform {
  switch (platform) {
    case 'krisha':
      return ListingPlatform.KRISHA
    case 'olx':
      return ListingPlatform.OLX
    case 'airbnb':
      return ListingPlatform.AIRBNB
    case 'booking':
      return ListingPlatform.BOOKING
    default:
      return ListingPlatform.OTHER
  }
}

export function fromPrismaPlatform(platform: ListingPlatform): PlatformSlug {
  switch (platform) {
    case ListingPlatform.KRISHA:
      return 'krisha'
    case ListingPlatform.OLX:
      return 'olx'
    case ListingPlatform.AIRBNB:
      return 'airbnb'
    case ListingPlatform.BOOKING:
      return 'booking'
    default:
      return 'other'
  }
}

export function toHumanVerdict(value: string): HumanVerdict {
  if (value === 'SAFE') return 'Safe'
  if (value === 'SUSPICIOUS') return 'Suspicious'
  return 'Needs Manual Review'
}

export function toPrismaVerdict(value: HumanVerdict): 'SAFE' | 'SUSPICIOUS' | 'NEEDS_MANUAL_REVIEW' {
  if (value === 'Safe') return 'SAFE'
  if (value === 'Suspicious') return 'SUSPICIOUS'
  return 'NEEDS_MANUAL_REVIEW'
}

export function normalizeSeverity(value: string): RiskSeverityValue {
  if (value.toLowerCase() === 'high') return 'high'
  if (value.toLowerCase() === 'medium') return 'medium'
  return 'low'
}

export function normalizeAnalysisMode(value: string): AnalysisModeValue {
  if (value === 'AI_PRIMARY') return 'ai_primary'
  if (value === 'AI_FALLBACK') return 'ai_fallback'
  return 'heuristic_only'
}
