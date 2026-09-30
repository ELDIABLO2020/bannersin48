import { randomBytes, createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request as httpRequest, type ClientRequest } from "node:http";
import type { AddressInfo } from "node:net";
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import type { NestExpressApplication } from "@nestjs/platform-express";

/**
 * Upload and download over real HTTP (AppModule + configureApp, multer, the
 * streaming engine, real files in a temp LOCAL_STORAGE_DIR). Only Prisma is faked.
 */
const hex = () => randomBytes(32).toString("hex");
const STORAGE = mkdtempSync(join(tmpdir(), "bi48-artwork-http-"));
Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://unused:unused@localhost:1/unused",
  JWT_SECRET: hex(),
  ADDRESS_TOKEN_SECRET: hex(),
  DOWNLOAD_URL_SECRET: hex(),
  CORS_ORIGINS: "https://www.bannersin48.test",
  LOCAL_STORAGE_DIR: STORAGE,
  PUBLIC_API_URL: "https://api.bannersin48.test",
  UPLOAD_MAX_CONCURRENCY: "2",
  ARTWORK_QUOTA_FILES: "5",
});

const { AppModule } = require("../app.module") as typeof import("../app.module");
const { PrismaService } = require("../prisma/prisma.service") as typeof import("../prisma/prisma.service");
const { configureApp } = require("../bootstrap") as typeof import("../bootstrap");
const { UploadLimiter } = require("../storage/upload-slots") as typeof import("../storage/upload-slots");
const { DownloadUrlService } = require("./download-url.service") as typeof import("./download-url.service");

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Page /MediaBox [0 0 612 792] >> endobj\n%%EOF\n");

type Row = Record<string, any>;
const users: Row[] = [
  { id: "cust_1", email: "c1@example.com", role: "CUSTOMER", status: "ACTIVE" },
  { id: "cust_2", email: "c2@example.com", role: "CUSTOMER", status: "ACTIVE" },
  { id: "staff_1", email: "s@example.com", role: "STAFF", status: "ACTIVE" },
  { id: "editor_1", email: "e@example.com", role: "CONTENT_EDITOR", status: "ACTIVE" },
  { id: "full_1", email: "f@example.com", role: "CUSTOMER", status: "ACTIVE" },
];
const artwork: Row[] = Array.from({ length: 5 }, (_, i) => ({
  id: `full_art_${i}`,
  userId: "full_1",
  s3Key: `full_1/${String(i).repeat(64)}.png`,
  s3Bucket: "local",
  bytes: 10,
  sha256: String(i).repeat(64),
  mime: "image/png",
  originalFilename: "x.png",
  deletedAt: null,
  createdAt: new Date(),
}));
const orders: Row[] = [{ id: "ord_1", userId: "cust_2" }];
const shipments: Row[] = [];
let seq = 0;

const isLabel = (a: Row) => shipments.some((s) => s.labelFileId === a.id);
const live = (a: Row) => a.deletedAt === null && !isLabel(a);

const client: any = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $transaction: async (fn: (tx: unknown) => unknown) => fn(client),
  $executeRaw: jest.fn(async () => 1),
  $queryRaw: jest.fn(async (_strings: TemplateStringsArray, userId: string) => {
    const rows = artwork.filter((a) => a.userId === userId && live(a));
    const bytes = [...new Map(rows.map((a) => [a.s3Key, a.bytes])).values()].reduce((x, y) => x + y, 0);
    return [{ files: rows.length, bytes: BigInt(bytes) }];
  }),
  user: { findUnique: async ({ where }: any) => users.find((u) => u.id === where.id) ?? null },
  artworkFolder: { findUnique: async () => null },
  artworkFile: {
    findFirst: async ({ where }: any) =>
      artwork.find((a) => a.userId === where.userId && a.sha256 === where.sha256 && a.bytes === where.bytes && live(a)) ?? null,
    findUnique: async ({ where }: any) => artwork.find((a) => a.id === where.id) ?? null,
    findMany: async ({ where }: any) => artwork.filter((a) => a.userId === where.userId && live(a)),
    create: async ({ data }: any) => {
      const row = { id: `art_${++seq}`, createdAt: new Date(), deletedAt: null, widthPx: null, heightPx: null, folderId: null, ...data };
      artwork.push(row);
      return row;
    },
  },
  shipment: {
    findFirst: async ({ where }: any) =>
      shipments.find((s) => s.labelFileId === where.labelFileId && orders.some((o) => o.id === s.orderId && o.userId === where.order.userId)) ?? null,
  },
};

let app: NestExpressApplication;
let base = "";
let jwt: InstanceType<typeof JwtService>;
let ipSeq = 0;

const nextIp = () => `198.18.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;
const auth = (userId: string) => ({ Authorization: `Bearer ${jwt.sign({ sub: userId })}`, "X-Forwarded-For": nextIp() });
const incoming = () => readdirSync(join(STORAGE, ".incoming"));
/** Signed URLs carry the public origin; replay the path + query against the test server. */
const local = (url: string) => {
  const u = new URL(url);
  expect(u.origin).toBe("https://api.bannersin48.test");
  return `${base}${u.pathname}${u.search}`;
};

async function upload(userId: string, body: Buffer, name = "art.png", type = "image/png") {
  const form = new FormData();
  form.append("file", new Blob([body], { type }), name);
  return fetch(`${base}/artwork/upload`, { method: "POST", headers: auth(userId), body: form });
}

async function mint(userId: string, id: string, purpose?: "preview" | "download") {
  return fetch(`${base}/artwork/${id}/download-url`, {
    method: "POST",
    headers: { ...auth(userId), "Content-Type": "application/json" },
    body: JSON.stringify(purpose ? { purpose } : {}),
  });
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(client).compile();
  app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.listen(0, "127.0.0.1");
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  jwt = app.get(JwtService, { strict: false });
});

afterAll(async () => {
  await app.close();
});

describe("POST /artwork/upload (H9)", () => {
  let firstId = "";

  it("streams the file to a content-addressed key and leaves nothing in .incoming", async () => {
    const res = await upload("cust_1", PNG);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { artworkId: string; previewUrl: string; meta: Record<string, unknown> };
    firstId = body.artworkId;
    expect(body.meta).toMatchObject({ mimeType: "image/png", sizeBytes: PNG.length, widthPx: 1, heightPx: 1 });

    const sha = createHash("sha256").update(PNG).digest("hex");
    const row = artwork.find((a) => a.id === body.artworkId)!;
    expect(row).toMatchObject({ s3Key: `cust_1/${sha}.png`, sha256: sha, bytes: PNG.length, mime: "image/png" });
    expect(readFileSync(join(STORAGE, row.s3Key)).equals(PNG)).toBe(true);
    expect(incoming()).toEqual([]);

    // The preview URL in the response is already signed and loads as an image.
    const preview = await fetch(local(body.previewUrl));
    expect(preview.status).toBe(200);
    expect(preview.headers.get("content-type")).toBe("image/png");
  });

  it("reuses the stored object when the same user uploads identical bytes", async () => {
    const res = await upload("cust_1", PNG, "again.png");
    expect(res.status).toBe(201);
    const { artworkId } = (await res.json()) as { artworkId: string };
    expect(artworkId).not.toBe(firstId);
    const a = artwork.find((r) => r.id === firstId)!;
    const b = artwork.find((r) => r.id === artworkId)!;
    expect(b.s3Key).toBe(a.s3Key);
    expect(b.originalFilename).toBe("again.png");
    expect(readdirSync(join(STORAGE, "cust_1"))).toHaveLength(1);
    expect(incoming()).toEqual([]);
  });

  it("rejects unknown types from their magic bytes, whatever the declared type", async () => {
    const res = await upload("cust_1", Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"), "x.png", "image/png");
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "UNSUPPORTED_FILE_TYPE" });
    expect(incoming()).toEqual([]);
  });

  it("answers 413 above 50 MB and removes the partial temp file", async () => {
    const big = Buffer.alloc(50 * 1024 * 1024 + 10, 0x20);
    PNG.copy(big);
    const res = await upload("cust_1", big);
    expect(res.status).toBe(413);
    expect(incoming()).toEqual([]);
  });

  it("answers 400 NO_FILE without a file part", async () => {
    const form = new FormData();
    form.append("note", "hello");
    const res = await fetch(`${base}/artwork/upload`, { method: "POST", headers: auth("cust_1"), body: form });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "NO_FILE" });
  });

  it("answers 409 ARTWORK_FILE_QUOTA once the library holds ARTWORK_QUOTA_FILES files", async () => {
    const res = await upload("full_1", PDF, "one-more.pdf", "application/pdf");
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "ARTWORK_FILE_QUOTA" });
    expect(existsSync(join(STORAGE, "full_1"))).toBe(false);
    expect(incoming()).toEqual([]);
  });

  it("caps uploads in flight (503 + Retry-After) and cleans up aborted uploads", async () => {
    const limiter = app.get(UploadLimiter);
    const boundary = "----bi48slow";
    const slow: ClientRequest[] = [];
    for (let i = 0; i < 2; i++) {
      const req = httpRequest(`${base}/artwork/upload`, {
        method: "POST",
        headers: { ...auth("cust_1"), "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": String(10 * 1024 * 1024) },
      });
      req.on("error", () => undefined);
      req.write(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="slow.png"\r\nContent-Type: image/png\r\n\r\n`);
      req.write(PNG);
      req.write(Buffer.alloc(64 * 1024));
      slow.push(req);
    }
    for (let i = 0; i < 100 && (limiter.active < 2 || incoming().length < 2); i++) await new Promise((r) => setTimeout(r, 20));
    expect(limiter.active).toBe(2);
    expect(incoming()).toHaveLength(2);

    const busy = await upload("cust_2", PNG);
    expect(busy.status).toBe(503);
    expect(busy.headers.get("retry-after")).toBe("5");
    expect(await busy.json()).toMatchObject({ code: "UPLOADS_BUSY" });

    for (const req of slow) req.destroy();
    for (let i = 0; i < 100 && (limiter.active > 0 || incoming().length > 0); i++) await new Promise((r) => setTimeout(r, 20));
    expect(limiter.active).toBe(0);
    expect(incoming()).toEqual([]);

    expect((await upload("cust_2", PNG)).status).toBe(201);
  });
});

describe("signed downloads (H4, M3, M4, M11)", () => {
  let pngId = "";
  let pdfId = "";
  beforeAll(async () => {
    pngId = ((await (await upload("cust_1", PNG)).json()) as { artworkId: string }).artworkId;
    pdfId = ((await (await upload("cust_1", PDF, "proof.pdf", "application/pdf")).json()) as { artworkId: string }).artworkId;
  });

  it("serves a raster preview inline with locked-down headers", async () => {
    const minted = await mint("cust_1", pngId, "preview");
    expect(minted.status).toBe(201);
    const { url, expiresAt } = (await minted.json()) as { url: string; expiresAt: string };
    expect(new Date(expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(300_000);

    const res = await fetch(local(url));
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).equals(PNG)).toBe(true);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("content-length")).toBe(String(PNG.length));
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
    expect(res.headers.get("cache-control")).toBe("private, max-age=300");
    expect(res.headers.get("content-disposition")).toMatch(/^inline; filename="art.png"; filename\*=UTF-8''art\.png$/);
  });

  it("serves downloads, and PDFs even as previews, as attachments with the stored type", async () => {
    const dl = await fetch(local(((await (await mint("cust_1", pngId)).json()) as { url: string }).url));
    expect(dl.headers.get("content-disposition")).toMatch(/^attachment;/);

    const pdf = await fetch(local(((await (await mint("cust_1", pdfId, "preview")).json()) as { url: string }).url));
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get("content-type")).toBe("application/pdf");
    expect(pdf.headers.get("content-disposition")).toMatch(/^attachment; filename="proof.pdf"/);
    expect(pdf.headers.get("content-security-policy")).toContain("sandbox");
  });

  it("rejects tampered, expired and unsigned links with 403", async () => {
    const { url } = (await (await mint("cust_1", pngId)).json()) as { url: string };
    const u = new URL(local(url));
    const tampered = new URL(u);
    tampered.searchParams.set("sig", "0".repeat(64));
    expect((await fetch(tampered)).status).toBe(403);

    const otherFile = new URL(u.toString().replace(pngId, pdfId));
    expect((await fetch(otherFile)).status).toBe(403);

    const expired = app.get(DownloadUrlService).sign(pngId, "download", Date.now() - 10 * 60_000);
    const res = await fetch(local(expired.url));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "DOWNLOAD_LINK_EXPIRED" });

    expect((await fetch(`${base}/artwork/${pngId}/file`)).status).toBe(403);
  });

  it("no longer accepts ?access_token= anywhere, and the old bearer download route is gone", async () => {
    const token = jwt.sign({ sub: "cust_1" });
    expect((await fetch(`${base}/artwork/library?access_token=${token}`)).status).toBe(401);
    expect((await fetch(`${base}/artwork/${pngId}/file?access_token=${token}`)).status).toBe(403);
    expect((await fetch(`${base}/artwork/${pngId}/download?access_token=${token}`)).status).toBe(404);
  });

  it("mints only for the owner, STAFF/ADMIN, or the customer of a label's order", async () => {
    expect((await mint("cust_2", pngId)).status).toBe(403);
    expect((await mint("editor_1", pngId)).status).toBe(403); // M3
    expect((await mint("staff_1", pngId)).status).toBe(201);
    expect((await fetch(`${base}/artwork/${pngId}/download-url`, { method: "POST" })).status).toBe(401);
    expect((await mint("cust_1", "missing")).status).toBe(404);

    // M4: a label uploaded by staff for cust_2's order.
    const label = ((await (await upload("staff_1", PDF, "label.pdf", "application/pdf")).json()) as { artworkId: string }).artworkId;
    shipments.push({ id: "sh_1", orderId: "ord_1", labelFileId: label });
    expect((await mint("cust_2", label)).status).toBe(201);
    expect((await mint("cust_1", label)).status).toBe(403);
  });

  it("lists the library with signed preview URLs and without shipment labels", async () => {
    const res = await fetch(`${base}/artwork/library`, { headers: auth("cust_1") });
    expect(res.status).toBe(200);
    const items = (await res.json()) as Array<{ id: string; previewUrl: string }>;
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item.previewUrl).toMatch(/\/artwork\/[^/]+\/file\?purpose=preview&exp=\d+&sig=[0-9a-f]{64}$/);
  });

  it("rejects mint requests with an unknown purpose", async () => {
    const res = await fetch(`${base}/artwork/${pngId}/download-url`, {
      method: "POST",
      headers: { ...auth("cust_1"), "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "inline-anything" }),
    });
    expect(res.status).toBe(400);
  });
});
