import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ServiceUnavailableException,
  type Type,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileInterceptor, MulterModule } from "@nestjs/platform-express";
import type { Request, Response } from "express";
import { finalize, type Observable } from "rxjs";
import { StorageService } from "./storage.service";
import { StreamingDiskStorage } from "./upload-storage";

export const DEFAULT_UPLOAD_MAX_CONCURRENCY = 4;
export const UPLOAD_RETRY_AFTER_SECONDS = 5;

/**
 * Caps uploads in flight in this process. Each one holds a socket, a file
 * descriptor and up to 1 MiB of head buffer for minutes on a slow link; beyond
 * the cap the API answers 503 with Retry-After instead of queueing.
 */
@Injectable()
export class UploadLimiter {
  readonly max: number;
  private inFlight = 0;

  constructor(config: ConfigService) {
    this.max = config.get<number>("UPLOAD_MAX_CONCURRENCY") ?? DEFAULT_UPLOAD_MAX_CONCURRENCY;
  }

  get active(): number {
    return this.inFlight;
  }

  /** Returns a release function (idempotent), or null when every slot is taken. */
  tryAcquire(): (() => void) | null {
    if (this.inFlight >= this.max) return null;
    this.inFlight += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.inFlight -= 1;
    };
  }
}

/**
 * Runs before multer: takes an upload slot, and when the request ends (handled,
 * failed or aborted) releases it and deletes any temp file the handler did not
 * commit, so no error path can leave a file behind in `.incoming`.
 */
@Injectable()
export class UploadSlotInterceptor implements NestInterceptor {
  constructor(
    private readonly limiter: UploadLimiter,
    private readonly storage: StorageService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const release = this.limiter.tryAcquire();
    if (!release) {
      res.setHeader("Retry-After", String(UPLOAD_RETRY_AFTER_SECONDS));
      throw new ServiceUnavailableException({
        code: "UPLOADS_BUSY",
        message: "The server is handling too many uploads right now. Please retry in a few seconds.",
      });
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      release();
      const files = [req.file, ...(Array.isArray(req.files) ? req.files : Object.values(req.files ?? {}).flat())];
      for (const file of files) void this.storage.discard(file?.path);
    };
    res.once("close", finish);
    return next.handle().pipe(finalize(finish));
  }
}

/** Upload-slot cap + multer (StreamingDiskStorage from MulterModule) for one file field. */
export function singleFileUpload(field: string, maxBytes: number): Type<NestInterceptor>[] {
  return [
    UploadSlotInterceptor,
    FileInterceptor(field, { limits: { fileSize: maxBytes, files: 1, fields: 10, parts: 12 } }),
  ];
}

/** Import in every module whose controllers use singleFileUpload(): uploads stream to disk, never to memory. */
export function streamingUploadsModule() {
  return MulterModule.registerAsync({
    inject: [StorageService],
    useFactory: (storage: StorageService) => ({ storage: new StreamingDiskStorage(() => storage.incomingDir) }),
  });
}
