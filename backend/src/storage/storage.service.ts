import { Injectable, Logger, NotFoundException, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createReadStream } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";

/**
 * Storage abstraction. The backend only ever talks to `StorageService`;
 * adding an S3 driver means implementing StorageDriver here — no other
 * module changes (keys stay opaque; the DB stores key + bucket).
 *
 * Uploads never pass through memory: multer streams them into `incomingDir`
 * (see upload-storage.ts) and `commit` moves the finished file to its key.
 */
export interface StoredObject {
  key: string;
  bucket: string;
}

export interface StorageDriver {
  /** Where in-flight uploads are written. Same filesystem as the objects, so commit is a rename. */
  readonly incomingDir: string;
  /** Create directories, prove they are writable, and clear abandoned temp files. */
  init(): Promise<void>;
  /** Moves a finished temp file to `key`. If the key already exists (same content), the temp file is dropped. */
  commit(tempPath: string, key: string): Promise<StoredObject & { existed: boolean }>;
  exists(key: string): Promise<boolean>;
  size(key: string): Promise<number>;
  openRead(key: string): Readable;
  delete(key: string): Promise<void>;
}

/** Temp files older than this are leftovers from a crash or a killed request. */
export const STALE_UPLOAD_MS = 60 * 60 * 1000;
const INCOMING = ".incoming";
/** Server-generated keys only: `<owner>/<sha256>.<ext>`, `labels/<orderId>/<sha256>.pdf`, legacy `<owner>/<date>/<hex>.<ext>`. */
const KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/;

/** Writes objects to a local directory (LOCAL_STORAGE_DIR, default ./storage). */
export class LocalStorageDriver implements StorageDriver {
  readonly baseDir: string;
  readonly incomingDir: string;
  private readonly logger = new Logger(LocalStorageDriver.name);

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
    this.incomingDir = path.join(this.baseDir, INCOMING);
  }

  resolve(key: string): string {
    if (!KEY_PATTERN.test(key) || key.split("/").includes("..")) {
      throw new Error("Invalid storage key.");
    }
    const full = path.resolve(this.baseDir, key);
    if (!full.startsWith(this.baseDir + path.sep)) {
      throw new Error("Invalid storage key.");
    }
    return full;
  }

  async init(now = Date.now()): Promise<void> {
    await fs.mkdir(this.incomingDir, { recursive: true, mode: 0o750 });
    const probe = path.join(this.incomingDir, `.probe-${randomUUID()}`);
    try {
      await fs.writeFile(probe, "ok", { flag: "wx" });
      await fs.rm(probe, { force: true });
    } catch (err) {
      throw new Error(`LOCAL_STORAGE_DIR is not writable (${this.incomingDir}): ${(err as Error).message}`);
    }
    const removed = await this.sweepIncoming(now);
    if (removed > 0) this.logger.warn(`Removed ${removed} abandoned upload temp file(s) from ${this.incomingDir}.`);
  }

  /** Deletes temp files older than STALE_UPLOAD_MS. Returns how many were removed. */
  async sweepIncoming(now = Date.now()): Promise<number> {
    let removed = 0;
    for (const name of await fs.readdir(this.incomingDir)) {
      const full = path.join(this.incomingDir, name);
      try {
        const st = await fs.lstat(full);
        if (now - st.mtimeMs > STALE_UPLOAD_MS) {
          await fs.rm(full, { recursive: true, force: true });
          removed += 1;
        }
      } catch {
        // Vanished meanwhile (a request finished with it); nothing to do.
      }
    }
    return removed;
  }

  async commit(tempPath: string, key: string): Promise<StoredObject & { existed: boolean }> {
    const tempFull = path.resolve(tempPath);
    if (path.dirname(tempFull) !== this.incomingDir) throw new Error("Not an upload temp file.");
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true, mode: 0o750 });
    if (await this.exists(key)) {
      // Content-addressed key: the same bytes are already stored.
      await fs.rm(tempFull, { force: true });
      return { key, bucket: "local", existed: true };
    }
    await fs.rename(tempFull, full);
    return { key, bucket: "local", existed: false };
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await fs.stat(this.resolve(key))).isFile();
    } catch {
      return false;
    }
  }

  async size(key: string): Promise<number> {
    const st = await fs.stat(this.resolve(key));
    if (!st.isFile()) throw new Error("Not a file.");
    return st.size;
  }

  openRead(key: string): Readable {
    return createReadStream(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }
}

// Only the local driver exists. An S3 driver would implement StorageDriver and
// be selected here via STORAGE_DRIVER=s3; nothing else needs to change.

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly driver: StorageDriver;

  constructor(config: ConfigService) {
    const driverName = config.get<string>("STORAGE_DRIVER") ?? "local";
    switch (driverName) {
      case "local":
        this.driver = new LocalStorageDriver(config.get<string>("LOCAL_STORAGE_DIR") ?? "./storage");
        break;
      default:
        throw new Error(`Unknown STORAGE_DRIVER "${driverName}".`);
    }
  }

  /** Fails the boot if uploads could not be written, and clears temp files left by a crash. */
  async onModuleInit(): Promise<void> {
    await this.driver.init();
  }

  get incomingDir(): string {
    return this.driver.incomingDir;
  }

  async commit(tempPath: string, key: string): Promise<StoredObject & { existed: boolean }> {
    try {
      return await this.driver.commit(tempPath, key);
    } catch (err) {
      throw new ServiceUnavailableException(
        { code: "STORAGE_WRITE_FAILED", message: "Could not store the file. Please retry." },
        { cause: err as Error },
      );
    }
  }

  /** Removes an upload temp file; safe to call when it was already committed or removed. */
  async discard(tempPath: string | undefined): Promise<void> {
    if (!tempPath) return;
    const full = path.resolve(tempPath);
    if (path.dirname(full) !== path.resolve(this.driver.incomingDir)) return;
    await fs.rm(full, { force: true }).catch(() => undefined);
  }

  exists(key: string): Promise<boolean> {
    return this.driver.exists(key);
  }

  /** Size + read stream for a stored object; 404 FILE_MISSING when it is gone. */
  async open(key: string): Promise<{ size: number; stream: Readable }> {
    let size: number;
    try {
      size = await this.driver.size(key);
    } catch {
      throw new NotFoundException({ code: "FILE_MISSING", message: "Stored file is no longer available." });
    }
    return { size, stream: this.driver.openRead(key) };
  }

  delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  /** Content-addressed key: identical bytes from the same owner map to one object. */
  static contentKey(prefix: string, sha256: string, mime: string): string {
    if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error("Invalid sha256.");
    return `${prefix}/${sha256}${EXTENSIONS[mime] ?? ""}`;
  }
}

const EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};
