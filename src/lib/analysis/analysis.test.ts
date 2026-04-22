import { describe, expect, it } from "vitest";
import { analyzeParsedListing } from "./analyzeParsedListing";
import type { NormalizedListing } from "../parsers";

const richListing: NormalizedListing = {
  source: "krisha",
  url: "https://krisha.kz/a/show/1",
  title: "2-комнатная квартира",
  description: "Светлая квартира после ремонта, рядом метро, тихий двор, все условия для проживания.",
  price: 280000,
  currency: "KZT",
  city: "Алматы",
  district: "Алмалинский",
  address: "ул. Абая, 150",
  rooms: 2,
  areaSqm: 65,
  floor: 5,
  totalFloors: 12,
  housingType: "квартира",
  condition: "хорошее",
  phoneAvailable: true,
  sellerType: "частное лицо",
  images: ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"],
  coordinates: { lat: 43.2566, lng: 76.9286 },
};

const weakListing: NormalizedListing = {
  source: "olx",
  url: "https://olx.kz/d/1",
  title: "Срочно",
  description: "сдам",
  price: 100000,
  currency: "KZT",
  city: "Алматы",
  images: [],
};

describe("analysis scoring", () => {
  it("produces meaningfully different scores", async () => {
    const strong = await analyzeParsedListing(richListing);
    const weak = await analyzeParsedListing(weakListing);

    expect(strong.trustScore).toBeGreaterThan(weak.trustScore);
    expect(strong.risks.negative.length).toBeLessThan(weak.risks.negative.length);
  });

  it("builds recommendations from risks", async () => {
    const weak = await analyzeParsedListing(weakListing);
    const codes = weak.recommendations.map((item) => item.riskCode);
    expect(codes).toContain("no_images");
    expect(codes).toContain("missing_address");
  });
});
