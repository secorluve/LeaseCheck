import { cleanText, toNumber } from "../helpers";

export interface KrishaAnalyticsData {
  listingPrice: number | null;
  districtAveragePrice: number | null;
  cityAveragePrice: number | null;
  comparisonPercent: number | null;
  comparisonText: string | null;
  periodLabel: string | null;
  trend: Array<{
    label: string;
    cityPrice: number | null;
    districtPrice: number | null;
    listingPrice: number | null;
  }>;
  isEstimated: boolean;
}

export async function fetchKrishaAnalytics(analysisUrl: string, baseUrl: string = "https://krisha.kz"): Promise<KrishaAnalyticsData | null> {
  if (!analysisUrl) return null;

  try {
    // Resolve relative URL
    const fullUrl = analysisUrl.startsWith("http") ? analysisUrl : `${baseUrl}${analysisUrl}`;
    console.log("Fetching Krisha analytics from:", fullUrl);

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": baseUrl,
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.log("Krisha analytics fetch failed:", response.status, response.statusText);
      return null;
    }

    const contentType = response.headers.get("content-type");
    console.log("Krisha analytics response content-type:", contentType);

    if (contentType?.includes("application/json")) {
      const jsonData = await response.json();
      console.log("Krisha analytics JSON response:", jsonData);
      return parseKrishaAnalyticsJson(jsonData);
    } else {
      const htmlData = await response.text();
      console.log("Krisha analytics HTML response length:", htmlData.length);
      return parseKrishaAnalyticsHtml(htmlData);
    }
  } catch (error) {
    console.log("Krisha analytics fetch error:", error);
    return null;
  }
}

function parseKrishaAnalyticsJson(data: unknown): KrishaAnalyticsData | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  // Try to extract common patterns from JSON response
  const listingPrice = toNumber(obj.price) ?? toNumber(obj.listingPrice) ?? toNumber(obj.advertPrice) ?? toNumber(obj.currentPrice);
  const districtAvg = toNumber(obj.districtAverage) ?? toNumber(obj.districtAvg) ?? toNumber(obj.avgDistrict) ?? toNumber(obj.districtPrice);
  const cityAvg = toNumber(obj.cityAverage) ?? toNumber(obj.cityAvg) ?? toNumber(obj.avgCity) ?? toNumber(obj.cityPrice);
  const comparisonPercent = toNumber(obj.comparisonPercent) ?? toNumber(obj.differencePercent) ?? toNumber(obj.percent);
  const comparisonText = cleanText(obj.comparisonText as string) ?? cleanText(obj.differenceText as string) ?? cleanText(obj.text as string);
  const periodLabel = cleanText(obj.periodLabel as string) ?? cleanText(obj.period as string) ?? cleanText(obj.timeRange as string);

  // Try to extract trend data - look for various possible structures
  const trend: KrishaAnalyticsData["trend"] = [];

  // Check for direct trend array
  const trendData = obj.trend as unknown[] | undefined;
  if (Array.isArray(trendData) && trendData.length > 0) {
    console.log("Found trend array with", trendData.length, "points");
    for (const item of trendData) {
      if (item && typeof item === "object") {
        const trendItem = item as Record<string, unknown>;
        trend.push({
          label: cleanText(trendItem.label as string) ?? cleanText(trendItem.date as string) ?? cleanText(trendItem.month as string) ?? "",
          cityPrice: toNumber(trendItem.cityPrice) ?? toNumber(trendItem.avgCity) ?? toNumber(trendItem.city),
          districtPrice: toNumber(trendItem.districtPrice) ?? toNumber(trendItem.avgDistrict) ?? toNumber(trendItem.district),
          listingPrice: toNumber(trendItem.listingPrice) ?? toNumber(trendItem.price) ?? toNumber(trendItem.advert),
        });
      }
    }
  }

  // Check for nested trend structures
  const chartData = obj.chart as unknown;
  if (chartData && typeof chartData === "object") {
    const chartObj = chartData as Record<string, unknown>;
    const series = chartObj.series as unknown[] | undefined;
    if (Array.isArray(series)) {
      console.log("Found chart series with", series.length, "points");
      for (const item of series) {
        if (item && typeof item === "object") {
          const seriesItem = item as Record<string, unknown>;
          trend.push({
            label: cleanText(seriesItem.label as string) ?? cleanText(seriesItem.x as string) ?? "",
            cityPrice: toNumber(seriesItem.city) ?? toNumber(seriesItem.y1),
            districtPrice: toNumber(seriesItem.district) ?? toNumber(seriesItem.y2),
            listingPrice: toNumber(seriesItem.listing) ?? toNumber(seriesItem.y3),
          });
        }
      }
    }
  }

  // Check for data points in other common structures
  const dataPoints = obj.data as unknown[] | undefined;
  if (Array.isArray(dataPoints) && trend.length === 0) {
    console.log("Found data points array with", dataPoints.length, "points");
    for (const item of dataPoints) {
      if (item && typeof item === "object") {
        const point = item as Record<string, unknown>;
        trend.push({
          label: cleanText(point.label as string) ?? cleanText(point.date as string) ?? "",
          cityPrice: toNumber(point.cityPrice) ?? toNumber(point.city),
          districtPrice: toNumber(point.districtPrice) ?? toNumber(point.district),
          listingPrice: toNumber(point.listingPrice) ?? toNumber(point.listing),
        });
      }
    }
  }

  console.log("Parsed analytics - listing:", listingPrice, "district:", districtAvg, "city:", cityAvg, "trend points:", trend.length);

  return {
    listingPrice,
    districtAveragePrice: districtAvg,
    cityAveragePrice: cityAvg,
    comparisonPercent,
    comparisonText,
    periodLabel,
    trend,
    isEstimated: false, // This is real data from Krisha
  };
}

function parseKrishaAnalyticsHtml(html: string): KrishaAnalyticsData | null {
  console.log("Parsing analytics HTML response, length:", html.length);

  // Try to extract data from HTML response
  // Look for script tags with analytics data or embedded JSON

  const scriptMatches = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scriptMatches) {
    const scriptContent = match[1];
    if (scriptContent.includes("analytics") || scriptContent.includes("price") || scriptContent.includes("average") || scriptContent.includes("chart")) {
      console.log("Found analytics script content");
      try {
        // Try to parse as JSON
        const jsonData = JSON.parse(scriptContent.trim());
        const parsed = parseKrishaAnalyticsJson(jsonData);
        if (parsed) return parsed;
      } catch {
        // Not JSON, continue
      }

      // Look for variable assignments
      const dataMatch = scriptContent.match(/window\.analyticsData\s*=\s*({[\s\S]*?});/);
      if (dataMatch) {
        try {
          const jsonData = JSON.parse(dataMatch[1]);
          const parsed = parseKrishaAnalyticsJson(jsonData);
          if (parsed) return parsed;
        } catch {
          // Continue
        }
      }
    }
  }

  // Look for embedded data attributes or specific HTML structures
  const priceMatch = html.match(/data-price=["']([^"']+)["']/i) ?? html.match(/data-listing-price=["']([^"']+)["']/i);
  const districtAvgMatch = html.match(/data-district-avg=["']([^"']+)["']/i) ?? html.match(/data-district-average=["']([^"']+)["']/i);
  const cityAvgMatch = html.match(/data-city-avg=["']([^"']+)["']/i) ?? html.match(/data-city-average=["']([^"']+)["']/i);
  const percentMatch = html.match(/data-comparison-percent=["']([^"']+)["']/i);
  const textMatch = html.match(/data-comparison-text=["']([^"']+)["']/i);

  if (priceMatch || districtAvgMatch || cityAvgMatch) {
    console.log("Found analytics data in HTML attributes");
    return {
      listingPrice: toNumber(priceMatch?.[1]),
      districtAveragePrice: toNumber(districtAvgMatch?.[1]),
      cityAveragePrice: toNumber(cityAvgMatch?.[1]),
      comparisonPercent: toNumber(percentMatch?.[1]),
      comparisonText: cleanText(textMatch?.[1]),
      periodLabel: null,
      trend: [],
      isEstimated: false,
    };
  }

  // Look for JSON embedded in HTML comments or data attributes
  const jsonCommentMatch = html.match(/<!--\s*analytics:\s*({[\s\S]*?})\s*-->/);
  if (jsonCommentMatch) {
    try {
      const jsonData = JSON.parse(jsonCommentMatch[1]);
      return parseKrishaAnalyticsJson(jsonData);
    } catch {
      // Continue
    }
  }

  console.log("No analytics data found in HTML response");
  return null;
}