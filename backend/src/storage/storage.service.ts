import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

/**
 * Storage abstraction. The backend only ever talks to `StorageService`;
 * swapping LOCAL for S3 in Phase 1 means adding a driver here — no other
 * module changes (keys stay opaque; the DB stores key + bucket).
 */
export interface StoredObject {
  key: string;
  bucket: string;
}

export interface StorageDriver {
  put(key: string, data: Buffer, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

/** Writes objects to a local directory (LOCAL_STORAGE_DIR, default ./storage). */
export class LocalStorageDriver implements StorageDriver {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  private resolve(key: string): string {
    const safe = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
    const full = path.join(this.baseDir, safe);
    if (!full.startsWith(this.baseDir)) {
      throw new Error("Invalid storage key.");
    }
    return full;
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<StoredObject> {
    const full = this.resolve(key);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, data);
    return { key, bucket: "local" };
  }

  async get(key: string): Promise<Buffer> {
    return fs.promises.readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await fs.promises.rm(this.resolve(key), { force: true });
  }
}

// Phase 1: class S3StorageDriver implements StorageDriver { … } — drop-in via
// STORAGE_DRIVER=s3 + AWS credentials from the task role. No other changes.

@Injectable()
export class StorageService {
  private readonly driver: StorageDriver;

  constructor(config: ConfigService) {
    const driverName = config.get<string>("STORAGE_DRIVER") ?? "local";
    switch (driverName) {
      case "local":
        this.driver = new LocalStorageDriver(config.get<string>("LOCAL_STORAGE_DIR") ?? "./storage");
        break;
      // case "s3": this.driver = new S3StorageDriver(config); break;
      default:
        throw new Error(`Unknown STORAGE_DRIVER "${driverName}".`);
    }
  }

  async put(key: string, data: Buffer, contentType: string): Promise<StoredObject> {
    try {
      return await this.driver.put(key, data, contentType);
    } catch (err) {
      throw new ServiceUnavailableException({
        code: "STORAGE_WRITE_FAILED",
        message: "Could not store the file. Please retry.",
      }, { cause: err as Error });
    }
  }

  async get(key: string): Promise<Buffer> {
    return this.driver.get(key);
  }

  async delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  /** Opaque, path-safe object key: owner-scoped, content-hash leaf. */
  static buildKey(userId: string, originalFilename: string): string {
    const ext = path.extname(originalFilename).toLowerCase().replace(/[^.a-z0-9]/g, "");
    const hash = crypto.randomBytes(12).toString("hex");
    return `${userId}/${new Date().toISOString().slice(0, 10)}/${hash}${ext}`;
  }
}
