import { describe, expect, it } from "vitest";
import { detectRentalType, extractPricePeriodText, normalizeDistrict } from "./normalization";

describe("district normalization", () => {
  it("maps transliterated districts to cyrillic labels", () => {
    expect(normalizeDistrict("Esiliyskiy_r-n")).toBe("Есильский район");
    expect(normalizeDistrict("Almatinskiy rayon")).toBe("Алматинский район");
    expect(normalizeDistrict("Nura r-n")).toBe("Нура район");
    expect(normalizeDistrict("Sarayshyk")).toBe("Сарайшык район");
    expect(normalizeDistrict("Сарайшык")).toBe("Сарайшык район");
  });
});

describe("rental type detection", () => {
  it("detects daily rent phrases from price text", () => {
    const result = detectRentalType({ priceText: "15 000 ₸ за сутки" });
    expect(result.value).toBe("посуточно");
  });

  it("detects monthly rent phrases from price text", () => {
    const result = detectRentalType({ priceText: "245 000 ₸ за месяц" });
    expect(result.value).toBe("помесячно");
  });
});

describe("price period extraction", () => {
  it("extracts explicit price period text", () => {
    expect(extractPricePeriodText(["15 000 ₸ за сутки"])).toBe("15 000 ₸ за сутки");
    expect(extractPricePeriodText(["245 000 ₸ за месяц"])).toBe("245 000 ₸ за месяц");
  });
});
