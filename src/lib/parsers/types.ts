export type ListingSource = "krisha" | "olx";

export type ParseErrorCode =
  | "invalid_url"
  | "unsupported_source"
  | "fetch_failed"
  | "parse_failed"
  | "blocked_or_incomplete_page";

export interface ParseFailure {
  ok: false;
  error: {
    code: ParseErrorCode;
    message: string;
    source?: ListingSource;
    recoverable: boolean;
    debug?: Record<string, unknown>;
  };
}

export interface NormalizedListing {
  source: ListingSource;
  url: string;
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  city?: string;
  district?: string;
  address?: string;
  rooms?: number;
  areaSqm?: number;
  floor?: number;
  totalFloors?: number;
  housingType?: string;
  condition?: string;
  phoneAvailable?: boolean;
  sellerType?: string;
  rentalType?: string;
  rentalTypeInferred?: boolean;
  rawPriceText?: string;
  images: string[];
  coordinates?: { lat: number; lng: number };
  rawText?: string;
  rawAddress?: string;
  publishedAt?: string;
  metadata?: Record<string, unknown>;
  extraFields?: Record<string, unknown>;
  extractionWarnings?: string[];
}

export interface ParseSuccess {
  ok: true;
  data: NormalizedListing;
}

export type ParseListingResult = ParseSuccess | ParseFailure;

export interface SourceDetection {
  ok: true;
  source: ListingSource;
}

export type SourceDetectionResult = SourceDetection | ParseFailure;

export interface ListingFetchSuccess {
  ok: true;
  html: string;
  status: number;
}

export type ListingFetchResult = ListingFetchSuccess | ParseFailure;

export interface SourceRawListing {
  source: ListingSource;
  url: string;
  title?: unknown;
  description?: unknown;
  price?: unknown;
  currency?: unknown;
  city?: unknown;
  district?: unknown;
  address?: unknown;
  rooms?: unknown;
  areaSqm?: unknown;
  floor?: unknown;
  totalFloors?: unknown;
  housingType?: unknown;
  condition?: unknown;
  phoneAvailable?: unknown;
  sellerType?: unknown;
  rentalType?: unknown;
  rentalTypeInferred?: unknown;
  rawPriceText?: unknown;
  images?: unknown;
  coordinates?: unknown;
  rawText?: unknown;
  rawAddress?: unknown;
  publishedAt?: unknown;
  metadata?: Record<string, unknown>;
  extraFields?: Record<string, unknown>;
  extractionWarnings?: unknown;
}
