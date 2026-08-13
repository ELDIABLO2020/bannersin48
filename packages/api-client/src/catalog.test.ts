import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { handlers } from "./mocks/handlers";
import { createApiClient } from "./apiClient";
import { ApiClientError } from "./apiClient";

const server = setupServer(...handlers);

describe("banner catalog + quote", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const client = () => createApiClient({ baseUrl: "http://localhost:3001" });

  it("lists 7 hub cards in map order", async () => {
    const cards = await client().getBannerCatalog();
    expect(cards).toHaveLength(7);
    expect(cards[0]?.slug).toBe("hd-banner");
    expect(cards[6]?.slug).toBe("econostand");
    expect(cards[6]?.hasMoreInfo).toBe(false);
  });

  it("returns mesh more-info including webbing", async () => {
    const info = await client().getBannerCatalogInfo("mesh");
    expect(info.options.some((o) => o.includes("Webbing reinforcement"))).toBe(true);
  });

  it("404s econostand more-info", async () => {
    await expect(client().getBannerCatalogInfo("econostand")).rejects.toBeInstanceOf(ApiClientError);
    await expect(client().getBannerCatalogInfo("econostand")).rejects.toMatchObject({ status: 404 });
  });

  it("quotes poster 3×6 at $118", async () => {
    const res = await client().quote({
      productId: "POSTER",
      material: "POSTER_8MIL",
      dimensions: { widthFt: 3, widthIn: 0, heightFt: 6, heightIn: 0 },
      finishing: {
        welding: false,
        grommets: false,
        windSlits: false,
        polePockets: false,
        rope: false,
        webbing: false,
      },
      quantity: 1,
    });
    expect(res.total).toBe(118);
  });

  it("quotes a legacy vinyl body without productId", async () => {
    const res = await client().quote({
      material: "VINYL_13OZ_SINGLE",
      dimensions: { widthFt: 4, widthIn: 0, heightFt: 8, heightIn: 0 },
      finishing: {
        welding: true,
        grommets: true,
        windSlits: false,
        polePockets: false,
        rope: false,
        webbing: false,
      },
      quantity: 1,
    });
    expect(res.total).toBe(138);
  });
});
