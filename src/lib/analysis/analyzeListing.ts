import type { AnalysisResult } from "./types";

export async function analyzeListing(url: string): Promise<AnalysisResult> {
  const response = await fetch("/api/analyze-listing", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });

  return (await response.json()) as AnalysisResult;
}
