import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { ArtworkService } from "./artwork.service";
import { DownloadUrlService } from "./download-url.service";
import { StorageService } from "../storage/storage.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { UploadedTempFile } from "../storage/upload-storage";

const GIB = 1024 ** 3;

async function setup(usage: { files: number; bytes: number }, twin: Record<string, unknown> | null = null) {
  const dir = mkdtempSync(join(tmpdir(), "bi48-artwork-svc-"));
  const config = new ConfigService({ LOCAL_STORAGE_DIR: dir, DOWNLOAD_URL_SECRET: randomBytes(32).toString("hex") });
  const storage = new StorageService(config);
  await storage.onModuleInit();
  const create = jest.fn(async ({ data }: any) => ({ id: "art_new", ...data }));
  const prisma: any = {
    $transaction: async (fn: (tx: unknown) => unknown) => fn(prisma),
    $executeRaw: jest.fn(async () => 1),
    $queryRaw: jest.fn(async () => [{ files: usage.files, bytes: BigInt(usage.bytes) }]),
    artworkFile: { findFirst: jest.fn(async () => twin), create },
  };
  const service = new ArtworkService(prisma as PrismaService, storage, new DownloadUrlService(config), config);
  const file = (size: number): UploadedTempFile => {
    mkdirSync(storage.incomingDir, { recursive: true });
    const path = join(storage.incomingDir, `${Math.random().toString(36).slice(2)}.part`);
    writeFileSync(path, "%PDF-1.7");
    return { originalname: "a.pdf", path, size, sha256: "c".repeat(64), detectedMime: "application/pdf", head: Buffer.from("%PDF-1.7") };
  };
  return { service, storage, file, create, dir, prisma };
}

describe("ArtworkService.upload quotas and dedup (H9)", () => {
  it("answers 413 ARTWORK_STORAGE_QUOTA when the upload would pass 2 GiB, and deletes the temp file", async () => {
    const { service, storage, file, create } = await setup({ files: 10, bytes: 2 * GIB - 1000 });
    await expect(service.upload("u1", file(2000))).rejects.toMatchObject({ status: 413, response: { code: "ARTWORK_STORAGE_QUOTA" } });
    expect(create).not.toHaveBeenCalled();
    expect(readdirSync(storage.incomingDir)).toEqual([]);
  });

  it("allows an upload that fits exactly", async () => {
    const { service, file, create } = await setup({ files: 10, bytes: 2 * GIB - 1000 });
    await expect(service.upload("u1", file(1000))).resolves.toMatchObject({ artworkId: "art_new" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ s3Key: `u1/${"c".repeat(64)}.pdf` }) }));
  });

  it("does not count bytes for a duplicate of a stored object, but still counts the file", async () => {
    const twin = { s3Key: "u1/existing.pdf", s3Bucket: "local" };
    const full = await setup({ files: 10, bytes: 2 * GIB }, twin);
    mkdirSync(join(full.dir, "u1"), { recursive: true });
    writeFileSync(join(full.dir, "u1", "existing.pdf"), "%PDF-1.7");
    await expect(full.service.upload("u1", full.file(8))).resolves.toBeTruthy();
    expect(full.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ s3Key: "u1/existing.pdf" }) }));
    expect(readdirSync(full.storage.incomingDir)).toEqual([]);

    const atFileLimit = await setup({ files: 500, bytes: 0 }, twin);
    await expect(atFileLimit.service.upload("u1", atFileLimit.file(8))).rejects.toMatchObject({ status: 409, response: { code: "ARTWORK_FILE_QUOTA" } });
  });

  it("serialises uploads per user with an advisory lock inside the transaction", async () => {
    const { service, file, prisma } = await setup({ files: 0, bytes: 0 });
    await service.upload("u1", file(8));
    const [strings, key] = prisma.$executeRaw.mock.calls[0];
    expect(strings.join("?")).toContain("pg_advisory_xact_lock(hashtext(?))");
    expect(key).toBe("artwork-upload:u1");
  });

  it("rejects files whose magic bytes were not recognised", async () => {
    const { service, storage, file } = await setup({ files: 0, bytes: 0 });
    const f = { ...file(8), detectedMime: null };
    await expect(service.upload("u1", f)).rejects.toMatchObject({ status: 400, response: { code: "UNSUPPORTED_FILE_TYPE" } });
    expect(readdirSync(storage.incomingDir)).toEqual([]);
  });
});
