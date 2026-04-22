import { detectSource } from "./detectSource";
import { fetchListingHtml } from "./fetchListingHtml";
import { normalizeListing } from "./normalizeListing";
import { parseKrisha } from "./parseKrisha";
import { parseOlx } from "./parseOlx";
import type { ParseListingResult } from "./types";

export async function parseListingUrl(url: string): Promise<ParseListingResult> {
  const detected = detectSource(url);
  if ("error" in detected) {
    return {
      ok: false,
      error: detected.error,
    };
  }

  const fetched = await fetchListingHtml(url, detected.source);
  if ("error" in fetched) {
    return {
      ok: false,
      error: fetched.error,
    };
  }

  const parsed = detected.source === "krisha" ? parseKrisha(fetched.html, url) : parseOlx(fetched.html, url);
  if (!("source" in parsed)) return parsed;

  const normalized = normalizeListing(parsed);

  if (!normalized.title && normalized.price === undefined && normalized.images.length === 0) {
    return {
      ok: false,
      error: {
        code: "blocked_or_incomplete_page",
        message: "Page fetched, but listing fields were too incomplete to analyze reliably.",
        source: detected.source,
        recoverable: true,
      },
    };
  }

  return { ok: true, data: normalized };
}

export * from "./types";
