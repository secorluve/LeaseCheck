import type { SourceDetectionResult } from "./types";

export function detectSource(inputUrl: string): SourceDetectionResult {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(inputUrl);
  } catch {
    return {
      ok: false,
      error: {
        code: "invalid_url",
        message: "The provided URL is invalid.",
        recoverable: true,
      },
    };
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

  if (hostname === "krisha.kz") {
    return { ok: true, source: "krisha" };
  }

  if (hostname === "olx.kz") {
    return { ok: true, source: "olx" };
  }

  return {
    ok: false,
    error: {
      code: "unsupported_source",
      message: "This listing source is not supported yet.",
      recoverable: true,
      debug: { hostname },
    },
  };
}
