import { describe, expect, it } from "vitest";
import { isExpiredSignedUrl } from "./signedUrls";

describe("isExpiredSignedUrl", () => {
  const now = Date.parse("2026-10-01T12:00:00Z");
  const signed = (expSec: number) =>
    `https://api.example.com/artwork/art_1/file?purpose=preview&exp=${expSec}&sig=${"a".repeat(64)}`;

  it("treats links within 30 s of expiry as expired", () => {
    expect(isExpiredSignedUrl(signed(now / 1000 + 300), now)).toBe(false);
    expect(isExpiredSignedUrl(signed(now / 1000 + 20), now)).toBe(true);
    expect(isExpiredSignedUrl(signed(now / 1000 - 1), now)).toBe(true);
  });

  it("never expires unsigned URLs (mock assets, blob: previews)", () => {
    expect(isExpiredSignedUrl("/mock-artwork-portrait.svg", now)).toBe(false);
    expect(isExpiredSignedUrl("blob:http://localhost:3000/1234", now)).toBe(false);
    expect(isExpiredSignedUrl("https://api.example.com/artwork/x/file?exp=1", now)).toBe(false);
  });
});
