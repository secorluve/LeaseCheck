// Mock data for demo analytics - clearly isolated from real business logic
// This is temporary presentation data, not real market calculations

export interface MockPriceAnalyticsData {
  listingPrice: number;
  cityAveragePrice: number;
  districtAveragePrice: number;
  comparisonPercent: number;
  comparisonText: string;
  periodLabel: string;
  chart: Array<{
    label: string;
    city: number;
    district: number;
    listing: number;
  }>;
  hasDistrictData: boolean;
}

// Mock analytics presets for different market scenarios
const mockPresets = {
  belowMarket: {
    cityAveragePrice: 180000,
    districtAveragePrice: 175000,
    chartBase: 170000,
    scenario: 'below-market'
  },
  nearMarket: {
    cityAveragePrice: 150000,
    districtAveragePrice: 148000,
    chartBase: 145000,
    scenario: 'near-market'
  },
  aboveMarket: {
    cityAveragePrice: 120000,
    districtAveragePrice: 115000,
    chartBase: 110000,
    scenario: 'above-market'
  },
  premiumDistrict: {
    cityAveragePrice: 140000,
    districtAveragePrice: 160000,
    chartBase: 135000,
    scenario: 'premium-district'
  }
};

// Generate mock analytics based on real listing price
export function generateMockPriceAnalytics(listingPrice: number): MockPriceAnalyticsData {
  // Deterministically select preset based on listing price ranges
  let preset;
  if (listingPrice < 100000) {
    preset = mockPresets.belowMarket;
  } else if (listingPrice < 200000) {
    preset = mockPresets.nearMarket;
  } else if (listingPrice < 300000) {
    preset = mockPresets.aboveMarket;
  } else {
    preset = mockPresets.premiumDistrict;
  }

  // Calculate comparison based on real listing price vs mock averages
  const cityDiff = ((listingPrice - preset.cityAveragePrice) / preset.cityAveragePrice) * 100;
  const districtDiff = ((listingPrice - preset.districtAveragePrice) / preset.districtAveragePrice) * 100;

  let comparisonPercent: number;
  let comparisonText: string;
  let target: 'city' | 'district';

  // Choose comparison target (prefer district if available and difference is significant)
  if (Math.abs(districtDiff) > Math.abs(cityDiff) * 0.8) {
    comparisonPercent = districtDiff;
    target = 'district';
  } else {
    comparisonPercent = cityDiff;
    target = 'city';
  }

  // Generate comparison text
  const absPercent = Math.abs(comparisonPercent);
  const location = target === 'district' ? 'районе' : 'городе';

  if (comparisonPercent > 5) {
    comparisonText = `На ${absPercent.toFixed(1)}% дороже, чем в похожих предложениях в этом ${location}`;
  } else if (comparisonPercent < -5) {
    comparisonText = `На ${absPercent.toFixed(1)}% дешевле, чем в похожих предложениях в этом ${location}`;
  } else {
    comparisonText = `Цена близка к похожим предложениям в этом ${location}`;
  }

  // Generate chart data with some variation
  const chart = [
    { label: "Окт", city: preset.chartBase - 5000, district: preset.chartBase - 8000, listing: listingPrice },
    { label: "Ноя", city: preset.chartBase - 2000, district: preset.chartBase - 6000, listing: listingPrice },
    { label: "Дек", city: preset.chartBase + 2000, district: preset.chartBase - 3000, listing: listingPrice },
    { label: "Янв", city: preset.chartBase, district: preset.chartBase - 1000, listing: listingPrice },
    { label: "Фев", city: preset.chartBase + 3000, district: preset.chartBase + 1000, listing: listingPrice },
    { label: "Мар", city: preset.chartBase + 1000, district: preset.chartBase - 2000, listing: listingPrice },
  ];

  return {
    listingPrice,
    cityAveragePrice: preset.cityAveragePrice,
    districtAveragePrice: preset.districtAveragePrice,
    comparisonPercent,
    comparisonText,
    periodLabel: "6 месяцев",
    chart,
    hasDistrictData: true,
  };
}

// Legacy export for backward compatibility (deprecated)
export const mockPriceAnalyticsData = generateMockPriceAnalytics(150000);