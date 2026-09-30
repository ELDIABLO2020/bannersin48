import { createHmac, randomBytes } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { DOWNLOAD_URL_TTL_SECONDS, DownloadUrlService } from "./download-url.service";

const SECRET = randomBytes(32).toString("hex");
const NOW = Date.parse("2026-10-01T12:00:00Z");
const service = new DownloadUrlService(new ConfigService({ DOWNLOAD_URL_SECRET: SECRET, PUBLIC_API_URL: "https://api.example.com" }));

function parts(url: string) {
  const u = new URL(url);
  return { path: u.pathname, query: Object.fromEntries(u.searchParams) as Record<string, string> };
}

describe("DownloadUrlService (H4)", () => {
  it("signs absolute /artwork/:id/file URLs that expire in 5 minutes", () => {
    const signed = service.sign("art_1", "preview", NOW);
    const { path, query } = parts(signed.url);
    expect(signed.url.startsWith("https://api.example.com/artwork/art_1/file?")).toBe(true);
    expect(path).toBe("/artwork/art_1/file");
    expect(Number(query.exp)).toBe(NOW / 1000 + DOWNLOAD_URL_TTL_SECONDS);
    expect(signed.expiresAt).toBe("2026-10-01T12:05:00.000Z");
    // sig = HMAC-SHA256(secret, `${id}.${exp}.${purpose}`)
    expect(query.sig).toBe(createHmac("sha256", SECRET).update(`art_1.${query.exp}.preview`).digest("hex"));
    expect(signed.url).not.toMatch(/access_token|Bearer/);
  });

  it("verifies its own signatures until they expire", () => {
    const { query } = parts(service.sign("art_1", "download", NOW).url);
    expect(service.verify("art_1", query, NOW)).toBe("download");
    expect(service.verify("art_1", query, NOW + DOWNLOAD_URL_TTL_SECONDS * 1000)).toBe("download");
    expect(() => service.verify("art_1", query, NOW + (DOWNLOAD_URL_TTL_SECONDS + 1) * 1000)).toThrow(
      expect.objectContaining({ status: 403, response: expect.objectContaining({ code: "DOWNLOAD_LINK_EXPIRED" }) }),
    );
  });

  it.each([
    ["another file id", (q: Record<string, string>) => ({ id: "art_2", q })],
    ["a flipped signature byte", (q: Record<string, string>) => ({ id: "art_1", q: { ...q, sig: (q.sig[0] === "a" ? "b" : "a") + q.sig.slice(1) } })],
    ["a later expiry", (q: Record<string, string>) => ({ id: "art_1", q: { ...q, exp: String(Number(q.exp) + 60) } })],
    ["a different purpose", (q: Record<string, string>) => ({ id: "art_1", q: { ...q, purpose: "download" } })],
    ["an unknown purpose", (q: Record<string, string>) => ({ id: "art_1", q: { ...q, purpose: "admin" } })],
    ["a missing signature", (q: Record<string, string>) => ({ id: "art_1", q: { exp: q.exp, purpose: q.purpose } })],
    ["an uppercase signature", (q: Record<string, string>) => ({ id: "art_1", q: { ...q, sig: q.sig.toUpperCase() } })],
    ["a short signature", (q: Record<string, string>) => ({ id: "art_1", q: { ...q, sig: q.sig.slice(0, 63) } })],
    ["a zero-padded expiry", (q: Record<string, string>) => ({ id: "art_1", q: { ...q, exp: `0${q.exp}` } })],
    ["an array parameter", (q: Record<string, string>) => ({ id: "art_1", q: { ...q, sig: [q.sig, q.sig] as unknown as string } })],
  ])("rejects %s with 403", (_label, tamper) => {
    const { query } = parts(service.sign("art_1", "preview", NOW).url);
    const { id, q } = tamper(query);
    expect(() => service.verify(id, q, NOW)).toThrow(expect.objectContaining({ status: 403 }));
  });

  it("rejects links signed with another secret", () => {
    const other = new DownloadUrlService(new ConfigService({ DOWNLOAD_URL_SECRET: randomBytes(32).toString("hex") }));
    const { query } = parts(other.sign("art_1", "preview", NOW).url);
    expect(() => service.verify("art_1", query, NOW)).toThrow(expect.objectContaining({ status: 403 }));
  });

  it("rejects a validly signed expiry that is too far in the future", () => {
    const exp = NOW / 1000 + 3600;
    const sig = createHmac("sha256", SECRET).update(`art_1.${exp}.preview`).digest("hex");
    expect(() => service.verify("art_1", { exp: String(exp), purpose: "preview", sig }, NOW)).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: "DOWNLOAD_LINK_INVALID" }) }),
    );
  });
});
