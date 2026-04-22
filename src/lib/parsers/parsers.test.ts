import { describe, expect, it, vi } from "vitest";
import { detectSource } from "./detectSource";
import { parseKrisha } from "./parseKrisha";
import { parseOlx } from "./parseOlx";
import { parseListingUrl } from "./index";

const krishaFixture = `
<html><head>
<meta property="og:title" content="2-комнатная квартира, 65 м², 5/12 этаж" />
<meta property="og:description" content="Алматы, Алмалинский район, цена 250000 ₸" />
<meta property="og:image" content="https://img.krisha.kz/1.jpg" />
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"Квартира в аренду","description":"2 комнаты, 65 м²","image":["https://img.krisha.kz/2.jpg"],"offers":{"@type":"Offer","price":"250000","priceCurrency":"KZT"}}
</script>
</head><body>{"city":"Алматы","district":"Алмалинский район","lat":43.2566,"lon":76.9286}</body></html>
`;

const olxFixture = `
<html><head>
<meta property="og:title" content="Сдам квартиру в Алматы" />
<meta property="og:description" content="Квартира 2 комнат, 60 м², 220000 ₸" />
<meta property="og:image" content="https://img.olx.kz/1.jpg" />
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"Сдам квартиру","description":"От собственника","image":["https://img.olx.kz/2.jpg"],"offers":{"@type":"Offer","price":"220000","priceCurrency":"KZT"},"address":{"@type":"PostalAddress","addressLocality":"Алматы","streetAddress":"ул. Абая, 10"}}
</script>
</head><body>показать телефон</body></html>
`;

describe("source detection", () => {
  it("detects krisha variations", () => {
    expect(detectSource("https://krisha.kz/a/show/123")).toMatchObject({ ok: true, source: "krisha" });
    expect(detectSource("https://www.krisha.kz/a/show/123")).toMatchObject({ ok: true, source: "krisha" });
  });

  it("returns unsupported source", () => {
    const result = detectSource("https://example.com/listing/1");
    expect(result.ok).toBe(false);
    if (!("error" in result)) {
      throw new Error("Expected unsupported source detection to fail");
    }
    expect(result.error.code).toBe("unsupported_source");
  });
});

describe("site parsers", () => {
  it("parses krisha fixture", () => {
    const result = parseKrisha(krishaFixture, "https://krisha.kz/a/show/1");
    expect("source" in result && result.source).toBe("krisha");
    if ("source" in result) {
      expect(result.price).toBe(250000);
      expect(result.city).toBe("Алматы");
      expect(Array.isArray(result.images)).toBe(true);
    }
  });

  it("parses olx fixture", () => {
    const result = parseOlx(olxFixture, "https://www.olx.kz/d/obyavlenie/1");
    expect("source" in result && result.source).toBe("olx");
    if ("source" in result) {
      expect(result.price).toBe(220000);
      expect(result.city).toBe("Алматы");
      expect(result.phoneAvailable).toBe(true);
    }
  });

  it("detects rental type from explicit price text in parser", () => {
    const html = `
      <html><head>
      <meta property="og:title" content="Аренда квартиры" />
      <meta property="og:description" content="245 000 ₸ за месяц" />
      <script type="application/ld+json">
      {"@type":"Product","name":"Квартира","offers":{"price":"245000","priceCurrency":"KZT"}}
      </script>
      </head><body></body></html>
    `;
    const result = parseOlx(html, "https://olx.kz/d/1");
    expect("source" in result).toBe(true);
    if ("source" in result) {
      expect(result.rentalType).toBe("помесячно");
      expect(result.rawPriceText).toContain("за месяц");
    }
  });

  it("does not produce absurd room count from noisy digits", () => {
    const html = `
      <html><head>
      <meta property="og:title" content="Объявление" />
      <script>window.__INITIAL_STATE__={"listing":{"rooms":"1011435901","floor":"8","floors":"12","description":"Есть описание","images":["https://img.olx.kz/p1.jpg"]}}</script>
      </head><body></body></html>
    `;
    const result = parseOlx(html, "https://olx.kz/d/1");
    expect("source" in result).toBe(true);
    if ("source" in result) {
      expect(result.rooms).toBeUndefined();
      expect(result.floor).toBe(8);
      expect(result.totalFloors).toBe(12);
      expect(result.description).toBe("Есть описание");
      expect(Array.isArray(result.images) && result.images.length).toBeGreaterThan(0);
    }
  });

  it("extracts floor pair safely for krisha", () => {
    const html = `
      <html><head>
      <meta property="og:title" content="3-комнатная квартира 8/16 этаж" />
      <meta property="og:description" content="Описание" />
      <script type="application/ld+json">{"@type":"Product","name":"Квартира","image":["https://img.krisha.kz/1.jpg"],"offers":{"price":"300000","priceCurrency":"KZT"}}</script>
      </head><body>8/16 этаж</body></html>
    `;
    const result = parseKrisha(html, "https://krisha.kz/a/show/2");
    expect("source" in result).toBe(true);
    if ("source" in result) {
      expect(result.floor).toBe(8);
      expect(result.totalFloors).toBe(16);
    }
  });

  it("keeps krisha address clean without title pollution", () => {
    const html = `
      <html><head>
      <meta property="og:title" content="Сдается в субаренду евро-2 комнатная квартира ЖК Green House Premium" />
      <meta property="og:description" content="Описание" />
      <meta property="og:street-address" content="Калдаякова 32 — Сдается в субаренду евро-2 комнатная квартира ЖК Green House Premium" />
      <script type="application/ld+json">{"@type":"Product","name":"Квартира","offers":{"price":"14000","priceCurrency":"KZT"}}</script>
      </head><body></body></html>
    `;
    const result = parseKrisha(html, "https://krisha.kz/a/show/3");
    expect("source" in result).toBe(true);
    if ("source" in result) {
      expect(result.address).toBe("Калдаякова 32");
    }
  });

  it("detects krisha rental type from price line", () => {
    const html = `
      <html><head>
      <meta property="og:title" content="Аренда" />
      <meta property="og:description" content="Описание" />
      <script type="application/ld+json">{"@type":"Product","name":"Квартира","offers":{"price":"600000","priceCurrency":"KZT"}}</script>
      </head><body><div>600 000 ₸ за месяц</div></body></html>
    `;
    const result = parseKrisha(html, "https://krisha.kz/a/show/4");
    expect("source" in result).toBe(true);
    if ("source" in result) {
      expect(result.rentalType).toBe("помесячно");
      expect(result.rawPriceText).toContain("за месяц");
    }
  });
});

describe("pipeline failures", () => {
  it("returns invalid_url for malformed input", async () => {
    const result = await parseListingUrl("not a url");
    expect(result.ok).toBe(false);
    if (!("error" in result)) {
      throw new Error("Expected malformed URL parsing to fail");
    }
    expect(result.error.code).toBe("invalid_url");
  });

  it("returns fetch_failed when fetch throws", async () => {
    const original = global.fetch;
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const result = await parseListingUrl("https://krisha.kz/a/show/1");
    expect(result.ok).toBe(false);
    if (!("error" in result)) {
      throw new Error("Expected fetch failure for listing parsing");
    }
    expect(result.error.code).toBe("fetch_failed");
    vi.stubGlobal("fetch", original);
  });

  it("returns parse_failed for partially parseable page", () => {
    const result = parseOlx("<html><head></head><body>empty</body></html>", "https://olx.kz/d/1");
    expect("ok" in result && result.ok).toBe(false);
  });
});
