import { fetchKrishaAnalytics } from './fetchKrishaAnalytics';

// Test with a real Krisha URL to see what analytics data is available
async function testKrishaAnalytics() {
  // First, let's fetch a real Krisha page to get the analysisUrl
  const testUrl = "https://krisha.kz/a/show/123456"; // Using a placeholder ID

  try {
    console.log("Testing Krisha analytics with URL:", testUrl);

    // For now, let's manually test with a known analysis URL pattern
    const analysisUrl = "/analytics/aPriceAnalysis/123456"; // Placeholder
    const analytics = await fetchKrishaAnalytics(analysisUrl);

    console.log("Analytics result:", analytics);

    if (analytics) {
      console.log("Trend data points:", analytics.trend.length);
      if (analytics.trend.length > 0) {
        console.log("Sample trend point:", analytics.trend[0]);
      }
    }
  } catch (error) {
    console.log("Test failed:", error);
  }
}

testKrishaAnalytics();