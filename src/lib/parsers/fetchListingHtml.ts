import type { ListingSource, ListingFetchResult } from "./types";

const DEFAULT_TIMEOUT_MS = 12000;

function getHeaders(source: ListingSource): HeadersInit {
  return {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "cache-control": "no-cache",
    pragma: "no-cache",
    referer: source === "krisha" ? "https://krisha.kz/" : "https://www.olx.kz/",
  };
}

export async function fetchListingHtml(url: string, source: ListingSource): Promise<ListingFetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getHeaders(source),
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: "fetch_failed",
          message: `Source returned HTTP ${response.status}.`,
          source,
          recoverable: response.status >= 500 || response.status === 429,
          debug: { status: response.status, statusText: response.statusText },
        },
      };
    }

    const html = await response.text();

    if (!html || html.length < 600) {
      return {
        ok: false,
        error: {
          code: "blocked_or_incomplete_page",
          message: "Page content appears incomplete or blocked.",
          source,
          recoverable: true,
          debug: { htmlLength: html.length },
        },
      };
    }

    return { ok: true, html, status: response.status };
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      error: {
        code: "fetch_failed",
        message: isAbort ? "Request timed out while fetching listing page." : "Could not fetch listing page.",
        source,
        recoverable: true,
        debug: { error: error instanceof Error ? error.message : "unknown_error" },
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
