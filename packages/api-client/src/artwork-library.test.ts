import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { handlers } from "./mocks/handlers";
import { createApiClient } from "./apiClient";

const server = setupServer(...handlers);

describe("artwork library + upload meta", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  // Artwork endpoints are account-only in V1; use the seeded demo account token.
  const client = () =>
    createApiClient({
      baseUrl: "http://localhost:3001",
      getToken: () => "mock-token-user_demo",
    });

  it("lists Home folder", async () => {
    const folders = await client().listArtworkFolders();
    expect(folders.some((f) => f.id === "folder_home" && f.name === "Home")).toBe(true);
  });

  it("lists seeded library items with px/DPI", async () => {
    const items = await client().listArtwork("folder_home");
    expect(items.length).toBeGreaterThanOrEqual(2);
    const sample = items.find((i) => i.id === "art_sample_1");
    expect(sample?.widthPx).toBe(1800);
    expect(sample?.heightPx).toBe(3600);
    expect(sample?.dpi).toBe(150);
    expect(sample?.mimeType).toBe("image/png");
  });

  it("accepts PNG upload and returns dpi meta", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "logo.png", { type: "image/png" });
    const res = await client().uploadArtwork(file, { widthPx: 900, heightPx: 600, dpi: 150 });
    expect(res.artworkId).toMatch(/^art_/);
    expect(res.meta.mimeType).toBe("image/png");
    expect(res.meta.widthPx).toBe(900);
    expect(res.meta.heightPx).toBe(600);
    expect(res.meta.dpi).toBe(150);
  });

  it("rejects unsupported mime types", async () => {
    const file = new File([new Uint8Array([1])], "x.gif", { type: "image/gif" });
    await expect(client().uploadArtwork(file)).rejects.toMatchObject({ status: 400 });
  });
});
