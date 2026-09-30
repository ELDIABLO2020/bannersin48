import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { EventEmitter } from "node:events";
import { createHash } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { of, lastValueFrom, throwError } from "rxjs";
import type { ExecutionContext } from "@nestjs/common";
import { LocalStorageDriver, StorageService, STALE_UPLOAD_MS } from "./storage.service";
import { HEAD_BYTES, StreamingDiskStorage, type UploadedTempFile } from "./upload-storage";
import { UploadLimiter, UploadSlotInterceptor } from "./upload-slots";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), "bi48-storage-spec-"));
}

describe("LocalStorageDriver", () => {
  it("resolves keys strictly inside the base directory (L3)", () => {
    const root = tempRoot();
    const driver = new LocalStorageDriver(join(root, "storage"));
    expect(driver.resolve("user1/abc.png")).toBe(join(root, "storage", "user1", "abc.png"));
    expect(driver.resolve("labels/ord1/abc.pdf")).toBe(join(root, "storage", "labels", "ord1", "abc.pdf"));
    expect(driver.resolve("user1/2026-08-23/0af3.png")).toBe(join(root, "storage", "user1", "2026-08-23", "0af3.png"));
    for (const bad of [
      "../outside.png",
      "user1/../../outside.png",
      "/etc/passwd",
      ".incoming/x.part",
      "user1/./x",
      "user1//x",
      "user1\\..\\x",
      "",
      // A sibling directory that shares the prefix ("storage-evil") must not pass.
      "../storage-evil/x",
    ]) {
      expect(() => driver.resolve(bad)).toThrow(/Invalid storage key/);
    }
  });

  it("creates .incoming on init and sweeps only temp files older than an hour", async () => {
    const root = join(tempRoot(), "storage");
    const driver = new LocalStorageDriver(root);
    await driver.init();
    const incoming = join(root, ".incoming");
    writeFileSync(join(incoming, "old.part"), "x");
    writeFileSync(join(incoming, "fresh.part"), "y");
    const old = (Date.now() - STALE_UPLOAD_MS - 60_000) / 1000;
    utimesSync(join(incoming, "old.part"), old, old);

    await driver.init();
    expect(readdirSync(incoming)).toEqual(["fresh.part"]);
  });

  it("refuses to boot when the storage directory is not writable", async () => {
    const root = join(tempRoot(), "storage");
    mkdirSync(join(root, ".incoming"), { recursive: true });
    chmodSync(join(root, ".incoming"), 0o555);
    try {
      await expect(new LocalStorageDriver(root).init()).rejects.toThrow(/not writable/);
    } finally {
      chmodSync(join(root, ".incoming"), 0o755);
    }
  });

  it("commits by rename, and drops the temp file when the content key already exists", async () => {
    const root = join(tempRoot(), "storage");
    const driver = new LocalStorageDriver(root);
    await driver.init();
    const t1 = join(driver.incomingDir, "a.part");
    writeFileSync(t1, "same");
    await expect(driver.commit(t1, "u1/k.png")).resolves.toMatchObject({ key: "u1/k.png", existed: false });
    expect(readFileSync(join(root, "u1", "k.png"), "utf8")).toBe("same");

    const t2 = join(driver.incomingDir, "b.part");
    writeFileSync(t2, "same");
    await expect(driver.commit(t2, "u1/k.png")).resolves.toMatchObject({ existed: true });
    expect(existsSync(t2)).toBe(false);
    expect(await driver.size("u1/k.png")).toBe(4);
  });

  it("only commits files from its own .incoming directory", async () => {
    const root = join(tempRoot(), "storage");
    const driver = new LocalStorageDriver(root);
    await driver.init();
    const elsewhere = join(root, "..", "stray.part");
    writeFileSync(elsewhere, "x");
    await expect(driver.commit(elsewhere, "u1/k.png")).rejects.toThrow(/Not an upload temp file/);
  });
});

describe("StorageService", () => {
  it("builds content-addressed keys and rejects anything but a sha256", () => {
    const sha = "a".repeat(64);
    expect(StorageService.contentKey("user1", sha, "image/png")).toBe(`user1/${sha}.png`);
    expect(StorageService.contentKey("labels/ord1", sha, "application/pdf")).toBe(`labels/ord1/${sha}.pdf`);
    expect(() => StorageService.contentKey("user1", "../x", "image/png")).toThrow();
  });

  it("answers 404 FILE_MISSING for a stored key whose file is gone, and streams existing ones with their size", async () => {
    const root = join(tempRoot(), "storage");
    const storage = new StorageService(new ConfigService({ LOCAL_STORAGE_DIR: root }));
    await storage.onModuleInit();
    await expect(storage.open("u1/missing.png")).rejects.toMatchObject({ status: 404, response: { code: "FILE_MISSING" } });

    mkdirSync(join(root, "u1"), { recursive: true });
    writeFileSync(join(root, "u1", "there.png"), PNG);
    const { size, stream } = await storage.open("u1/there.png");
    expect(size).toBe(PNG.length);
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    expect(Buffer.concat(chunks).equals(PNG)).toBe(true);
  });

  it("discard only ever deletes inside .incoming", async () => {
    const root = join(tempRoot(), "storage");
    const storage = new StorageService(new ConfigService({ LOCAL_STORAGE_DIR: root }));
    await storage.onModuleInit();
    mkdirSync(join(root, "u1"), { recursive: true });
    writeFileSync(join(root, "u1", "keep.png"), "x");
    await storage.discard(join(root, "u1", "keep.png"));
    expect(existsSync(join(root, "u1", "keep.png"))).toBe(true);
  });
});

describe("StreamingDiskStorage", () => {
  async function run(content: Readable | Buffer, dir: string): Promise<{ err?: any; info?: UploadedTempFile }> {
    const engine = new StreamingDiskStorage(() => dir);
    const stream = Buffer.isBuffer(content) ? Readable.from([content]) : content;
    const req = Object.assign(new EventEmitter(), { readableEnded: true }) as any;
    const file = { fieldname: "file", originalname: "a.png", stream } as any;
    return new Promise((resolve) => engine._handleFile(req, file, (err, info) => resolve({ err, info: info as UploadedTempFile })));
  }

  it("streams to .incoming while hashing, counting and sniffing", async () => {
    const dir = tempRoot();
    const { err, info } = await run(PNG, dir);
    expect(err).toBeFalsy();
    expect(info!.size).toBe(PNG.length);
    expect(info!.sha256).toBe(createHash("sha256").update(PNG).digest("hex"));
    expect(info!.detectedMime).toBe("image/png");
    expect(info!.path.startsWith(dir)).toBe(true);
    expect(readFileSync(info!.path).equals(PNG)).toBe(true);
  });

  it("keeps only the first MiB in memory", async () => {
    const dir = tempRoot();
    const big = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(3 * 1024 * 1024, 0x20)]);
    const { info } = await run(Readable.from([big.subarray(0, 700_000), big.subarray(700_000)]), dir);
    expect(info!.size).toBe(big.length);
    expect(info!.head.length).toBe(HEAD_BYTES);
    expect(info!.detectedMime).toBe("application/pdf");
  });

  it("rejects an unknown type from the first bytes and leaves no temp file", async () => {
    const dir = tempRoot();
    const { err } = await run(Buffer.from("GIF89a...............not allowed"), dir);
    expect(err).toMatchObject({ status: 400, response: { code: "UNSUPPORTED_FILE_TYPE" } });
    expect(readdirSync(dir)).toEqual([]);
  });

  it("removes the temp file when the upload stream fails midway", async () => {
    const dir = tempRoot();
    const stream = new Readable({ read() {} });
    const pending = run(stream, dir);
    stream.push(PNG);
    setTimeout(() => stream.destroy(new Error("client went away")), 10);
    const { err } = await pending;
    expect(err).toBeInstanceOf(Error);
    expect(readdirSync(dir)).toEqual([]);
  });
});

describe("upload slots (H9)", () => {
  function context(req: any = {}, res: any = { setHeader: jest.fn(), once: jest.fn() }) {
    return {
      ctx: { switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }) } as unknown as ExecutionContext,
      res,
    };
  }

  it("allows the configured number of uploads in flight, then 503 with Retry-After", async () => {
    const limiter = new UploadLimiter(new ConfigService({ UPLOAD_MAX_CONCURRENCY: 2 }));
    const storage = { discard: jest.fn(async () => undefined) } as unknown as StorageService;
    const interceptor = new UploadSlotInterceptor(limiter, storage);

    const pending = [interceptor.intercept(context().ctx, { handle: () => of("a") }), interceptor.intercept(context().ctx, { handle: () => of("b") })];
    expect(limiter.active).toBe(2);
    const third = context();
    expect(() => interceptor.intercept(third.ctx, { handle: () => of("c") })).toThrow(
      expect.objectContaining({ status: 503, response: expect.objectContaining({ code: "UPLOADS_BUSY" }) }),
    );
    expect(third.res.setHeader).toHaveBeenCalledWith("Retry-After", "5");

    await Promise.all(pending.map((o) => lastValueFrom(o)));
    expect(limiter.active).toBe(0);
  });

  it("releases the slot and deletes uncommitted temp files when the handler fails", async () => {
    const limiter = new UploadLimiter(new ConfigService({}));
    const storage = { discard: jest.fn(async () => undefined) } as unknown as StorageService;
    const interceptor = new UploadSlotInterceptor(limiter, storage);
    const { ctx } = context({ file: { path: "/data/storage/.incoming/x.part" } });

    await expect(lastValueFrom(interceptor.intercept(ctx, { handle: () => throwError(() => new Error("boom")) }))).rejects.toThrow("boom");
    expect(limiter.active).toBe(0);
    expect(storage.discard).toHaveBeenCalledWith("/data/storage/.incoming/x.part");
  });
});
