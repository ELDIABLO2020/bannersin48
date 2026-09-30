import { BadRequestException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { rm } from "node:fs/promises";
import * as path from "node:path";
import { pipeline, Transform } from "node:stream";
import type { Request } from "express";
import type { StorageEngine } from "multer";
import { sniffMime, type AllowedMimeType } from "../artwork/artwork-inspect";

/** Enough for every magic number we accept (PNG needs 8). */
const SNIFF_BYTES = 8;
/** Kept in memory for dimension/DPI parsing (JPEG SOF after large APP segments, PDF MediaBox). */
export const HEAD_BYTES = 1024 * 1024;

/** What `req.file` carries after StreamingDiskStorage has written an upload. */
export interface UploadedTempFile {
  originalname: string;
  /** Temp file under `${LOCAL_STORAGE_DIR}/.incoming`; the service commits or discards it. */
  path: string;
  size: number;
  sha256: string;
  /** Detected from magic bytes; the client's Content-Type is never used. */
  detectedMime: AllowedMimeType | null;
  /** First HEAD_BYTES of the file. */
  head: Buffer;
}

function unsupportedType(): BadRequestException {
  return new BadRequestException({
    code: "UNSUPPORTED_FILE_TYPE",
    message: "Only JPEG, PNG, and PDF files are supported.",
  });
}

/**
 * Multer storage engine that streams each upload straight to disk while
 * hashing it (sha256), counting bytes, keeping only the first HEAD_BYTES in
 * memory, and rejecting unknown file types as soon as the magic bytes arrive.
 * The temp file is removed on every failure path; multer calls _removeFile
 * for files it aborts (size limit, client disconnect).
 */
export class StreamingDiskStorage implements StorageEngine {
  constructor(private readonly incomingDir: () => string) {}

  _handleFile(
    req: Request,
    file: Express.Multer.File,
    callback: (error?: unknown, info?: Partial<Express.Multer.File> & Partial<UploadedTempFile>) => void,
  ): void {
    const tempPath = path.join(this.incomingDir(), `${randomUUID()}.part`);
    // Set early so multer's abort cleanup can find a file that is still being written.
    (file as { path?: string }).path = tempPath;

    const hash = createHash("sha256");
    const headChunks: Buffer[] = [];
    let headLength = 0;
    let size = 0;
    let detected: AllowedMimeType | null | undefined;

    const inspect = new Transform({
      transform(chunk: Buffer, _encoding, done) {
        hash.update(chunk);
        size += chunk.length;
        if (headLength < HEAD_BYTES) {
          const part = chunk.subarray(0, HEAD_BYTES - headLength);
          headChunks.push(part);
          headLength += part.length;
        }
        if (detected === undefined && headLength >= SNIFF_BYTES) {
          detected = sniffMime(Buffer.concat(headChunks));
          if (!detected) return done(unsupportedType());
        }
        done(null, chunk);
      },
      flush(done) {
        if (detected === undefined && size > 0) {
          detected = sniffMime(Buffer.concat(headChunks));
          if (!detected) return done(unsupportedType());
        }
        done();
      },
    });

    const out = createWriteStream(tempPath, { flags: "wx", mode: 0o640 });
    let settled = false;
    // Same rule multer uses: a request that closes before its body ended was aborted.
    const onRequestClose = () => {
      if (!settled && !req.readableEnded) inspect.destroy(new Error("Request closed"));
    };
    req.once("close", onRequestClose);

    pipeline(file.stream, inspect, out, (err) => {
      settled = true;
      req.off("close", onRequestClose);
      if (err) {
        rm(tempPath, { force: true }).finally(() => callback(err));
        return;
      }
      callback(null, {
        path: tempPath,
        size,
        sha256: hash.digest("hex"),
        detectedMime: detected ?? null,
        head: Buffer.concat(headChunks),
      });
    });
  }

  _removeFile(_req: Request, file: Express.Multer.File, callback: (error: Error | null) => void): void {
    if (!file.path) return callback(null);
    rm(file.path, { force: true }).then(
      () => callback(null),
      (err: Error) => callback(err),
    );
  }
}
