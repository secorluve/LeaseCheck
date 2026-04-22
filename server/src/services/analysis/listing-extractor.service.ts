import { load } from 'cheerio'
import { parseListingUrl } from '../../../../src/lib/parsers'
import { asStringArray, cleanText, filterListingImages, parseJsonSafe, pickCurrency, stripHtml, toNumber } from '../../../../src/lib/parsers/helpers'
import { normalizeDistrict } from '../../../../src/lib/parsers/normalization'
import { ApiError } from '../../utils/api-error'
import { detectPlatformFromUrl } from '../../utils/platform'
import type { CreateAnalysisInput, ExtractedListingData, PlatformSlug } from '../../types/api'

const REQUEST_TIMEOUT_MS = 12000

function resolveUrl(baseUrl: string, candidate?: string | null): string | undefined {
  const cleaned = cleanText(candidate)
  if (!cleaned) return undefined

  try {
    return new URL(cleaned, baseUrl).toString()
  } catch {
    return undefined
  }
}

function extractJsonLdBlocks(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = []
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = regex.exec(html))) {
    const parsed = parseJsonSafe<unknown>(match[1])
    const stack = Array.isArray(parsed) ? parsed : [parsed]

    for (const item of stack) {
      if (!item || typeof item !== 'object') continue
      const obj = item as Record<string, unknown>

      if (Array.isArray(obj['@graph'])) {
        for (const graphItem of obj['@graph']) {
          if (graphItem && typeof graphItem === 'object') {
            results.push(graphItem as Record<string, unknown>)
          }
        }
        continue
      }

      results.push(obj)
    }
  }

  return results
}

function extractFirstStringCandidate(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    const cleaned = cleanText(typeof value === 'string' ? value : undefined)
    if (cleaned) return cleaned
  }

  return undefined
}

function detectRentalType(text: string): string | undefined {
  const normalized = text.toLowerCase()

  if (/(monthly|per month|ежемесяч|помесяч|за месяц)/i.test(normalized)) return 'monthly'
  if (/(daily|per day|per night|daily rent|посуточ|за сутки|на ночь)/i.test(normalized)) return 'daily'
  if (/(hourly|per hour|почас|по часам)/i.test(normalized)) return 'hourly'
  if (/(long term|долгосроч)/i.test(normalized)) return 'long-term'

  return undefined
}

function inferSellerType(text: string): string | undefined {
  const normalized = text.toLowerCase()

  if (/(agency|агентств|риелтор|broker)/i.test(normalized)) return 'agency'
  if (/(owner|собственник|хозяин|landlord)/i.test(normalized)) return 'owner'

  return undefined
}

function splitLocation(location?: string): { city?: string; district?: string; address?: string } {
  const cleaned = cleanText(location)
  if (!cleaned) return {}

  const parts = cleaned.split(',').map((item) => item.trim()).filter(Boolean)
  return {
    city: parts[0],
    district: parts[1] ? normalizeDistrict(parts[1]) ?? parts[1] : undefined,
    address: cleaned,
  }
}

function buildRawText(fields: Array<string | undefined>): string {
  return fields
    .map((item) => cleanText(item))
    .filter((item): item is string => Boolean(item))
    .join('\n\n')
    .slice(0, 9000)
}

export class ListingExtractorService {
  async extract(input: CreateAnalysisInput): Promise<ExtractedListingData> {
    if (input.url) {
      const structured = await this.tryStructuredExtraction(input.url)
      if (structured) {
        return this.applyManualOverlay(structured, input)
      }

      const generic = await this.tryGenericExtraction(input.url)
      if (generic) {
        return this.applyManualOverlay(generic, input)
      }
    }

    if (input.manualText) {
      return this.fromManualInput(input)
    }

    throw new ApiError(
      400,
      'Unable to extract listing data automatically. Paste the listing text manually and try again.',
    )
  }

  private async tryStructuredExtraction(url: string): Promise<ExtractedListingData | null> {
    const platform = detectPlatformFromUrl(url)
    if (platform !== 'krisha' && platform !== 'olx') {
      return null
    }

    const parsed = await parseListingUrl(url)
    if (!parsed.ok) {
      return null
    }

    const listing = parsed.data

    return {
      sourceUrl: url,
      platform,
      sourceMode: 'structured',
      title: listing.title,
      description: listing.description,
      rawText: buildRawText([listing.title, listing.description, listing.rawText, listing.rawAddress]),
      price: listing.price,
      currency: listing.currency,
      city: listing.city,
      district: listing.district,
      address: listing.address ?? listing.rawAddress,
      locationText: listing.address ?? listing.rawAddress ?? listing.city,
      rooms: listing.rooms,
      areaSqm: listing.areaSqm,
      floor: listing.floor,
      totalFloors: listing.totalFloors,
      housingType: listing.housingType,
      condition: listing.condition,
      sellerType: listing.sellerType,
      rentalType: listing.rentalType,
      phoneAvailable: listing.phoneAvailable,
      images: listing.images,
      coordinates: listing.coordinates,
      metadata: {
        ...(listing.metadata ?? {}),
        parser: 'structured',
      },
      extractionWarnings: listing.extractionWarnings ?? [],
      normalizedListing: listing,
    }
  }

  private async tryGenericExtraction(url: string): Promise<ExtractedListingData | null> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        redirect: 'follow',
        signal: controller.signal,
      })

      if (!response.ok) {
        return null
      }

      const html = await response.text()
      if (!html || html.length < 400) {
        return null
      }

      return this.parseGenericHtml(url, html, detectPlatformFromUrl(url))
    } catch {
      return null
    } finally {
      clearTimeout(timeout)
    }
  }

  private parseGenericHtml(url: string, html: string, platform: PlatformSlug): ExtractedListingData {
    const $ = load(html)
    const jsonLdBlocks = extractJsonLdBlocks(html)
    const primaryJsonLd = jsonLdBlocks.find((item) => item.offers || item.address || item.name) ?? jsonLdBlocks[0]
    const addressObject =
      primaryJsonLd && typeof primaryJsonLd.address === 'object' ? (primaryJsonLd.address as Record<string, unknown>) : undefined
    const offerObject =
      primaryJsonLd && typeof primaryJsonLd.offers === 'object' ? (primaryJsonLd.offers as Record<string, unknown>) : undefined
    const geoObject =
      primaryJsonLd && typeof primaryJsonLd.geo === 'object' ? (primaryJsonLd.geo as Record<string, unknown>) : undefined

    const title = extractFirstStringCandidate(
      $('meta[property="og:title"]').attr('content'),
      $('meta[name="twitter:title"]').attr('content'),
      primaryJsonLd?.name,
      $('h1').first().text(),
      $('title').first().text(),
    )

    const description = extractFirstStringCandidate(
      $('meta[property="og:description"]').attr('content'),
      $('meta[name="description"]').attr('content'),
      primaryJsonLd?.description,
      $('[itemprop="description"]').first().text(),
      $('[data-testid*="description"]').first().text(),
    )

    const bodyText = cleanText(
      stripHtml(($('main').html() ?? $('body').html() ?? html).slice(0, 50000)),
    )?.slice(0, 9000)

    const imageCandidates = filterListingImages([
      ...Array.from($('meta[property="og:image"]'))
        .map((item) => $(item).attr('content'))
        .filter((item): item is string => Boolean(item)),
      ...asStringArray(primaryJsonLd?.image),
      ...Array.from($('img'))
        .map((item) => resolveUrl(url, $(item).attr('src')))
        .filter((item): item is string => Boolean(item)),
    ])

    const rawPriceText = extractFirstStringCandidate(
      offerObject?.price,
      $('meta[property="product:price:amount"]').attr('content'),
      $('meta[property="product:price"]').attr('content'),
      bodyText?.match(/(\d[\d\s.,]{2,})(?:\s?(?:₸|тенге|kzt|\$|usd|eur|€))/i)?.[0],
      title,
      description,
    )

    const inferredPrice = rawPriceText ? toNumber(rawPriceText) : undefined
    const locationText = extractFirstStringCandidate(
      addressObject?.streetAddress,
      addressObject?.addressLocality,
      $('meta[property="og:street-address"]').attr('content'),
      $('meta[property="place:location:address"]').attr('content'),
    )

    const city = extractFirstStringCandidate(addressObject?.addressLocality)
    const district = normalizeDistrict(extractFirstStringCandidate(addressObject?.addressRegion))
    const address = extractFirstStringCandidate(addressObject?.streetAddress, locationText)
    const rawText = buildRawText([title, description, bodyText, locationText])

    const extractionWarnings: string[] = []
    if (!title) extractionWarnings.push('title_missing')
    if (!description) extractionWarnings.push('description_missing')
    if (imageCandidates.length === 0) extractionWarnings.push('images_missing')

    return {
      sourceUrl: url,
      platform,
      sourceMode: 'generic',
      title,
      description: description ?? bodyText?.slice(0, 1000),
      rawText,
      price: inferredPrice,
      currency: pickCurrency(rawPriceText) ?? 'KZT',
      city,
      district,
      address,
      locationText,
      sellerType: inferSellerType(rawText),
      rentalType: detectRentalType(rawText),
      phoneAvailable: $('a[href^="tel:"]').length > 0 || /phone|call|телефон|звон/i.test(rawText),
      images: imageCandidates.slice(0, 12),
      coordinates:
        toNumber(geoObject?.latitude) !== undefined && toNumber(geoObject?.longitude) !== undefined
          ? {
              lat: toNumber(geoObject?.latitude) as number,
              lng: toNumber(geoObject?.longitude) as number,
            }
          : undefined,
      metadata: {
        parser: 'generic',
        jsonLdBlocks: jsonLdBlocks.length,
      },
      extractionWarnings,
    }
  }

  private fromManualInput(input: CreateAnalysisInput): ExtractedListingData {
    const locationParts = splitLocation(input.location)
    const rawText = buildRawText([input.title, input.location, input.manualText])

    return {
      sourceUrl: input.url ?? null,
      platform: input.url ? detectPlatformFromUrl(input.url) : 'other',
      sourceMode: input.url ? 'mixed' : 'manual',
      title: input.title,
      description: input.manualText,
      rawText,
      price: input.price,
      currency: input.price ? 'KZT' : undefined,
      city: locationParts.city,
      district: locationParts.district,
      address: locationParts.address,
      locationText: input.location,
      sellerType: inferSellerType(rawText),
      rentalType: detectRentalType(rawText),
      phoneAvailable: /phone|call|телефон|звон|whatsapp|telegram/i.test(rawText),
      images: [],
      metadata: {
        parser: 'manual',
      },
      extractionWarnings: ['manual_input'],
    }
  }

  private applyManualOverlay(base: ExtractedListingData, input: CreateAnalysisInput): ExtractedListingData {
    if (!input.manualText && !input.location && !input.title && input.price == null) {
      return base
    }

    const locationParts = splitLocation(input.location)
    const overlayText = buildRawText([base.rawText, input.title, input.location, input.manualText])

    return {
      ...base,
      sourceMode: 'mixed',
      title: base.title ?? input.title,
      description: base.description ?? input.manualText,
      rawText: overlayText,
      price: base.price ?? input.price,
      city: base.city ?? locationParts.city,
      district: base.district ?? locationParts.district,
      address: base.address ?? locationParts.address,
      locationText: base.locationText ?? input.location,
      sellerType: base.sellerType ?? inferSellerType(overlayText),
      rentalType: base.rentalType ?? detectRentalType(overlayText),
      extractionWarnings: Array.from(new Set([...base.extractionWarnings, 'manual_overlay'])),
    }
  }
}
