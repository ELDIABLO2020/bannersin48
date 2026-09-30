import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as path from "node:path";
import type { Readable } from "node:stream";
import type { Prisma } from "@prisma/client";
import { ARTWORK_MAX_BYTES_DEFAULT } from "@bannersin48/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import type { UploadedTempFile } from "../storage/upload-storage";
import { UPLOAD_DEFAULTS } from "../config/env.validation";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { ALLOWED_MIME_TYPES, inspectDimensions } from "./artwork-inspect";
import { DownloadUrlService, type DownloadPurpose, type SignedDownloadUrl } from "./download-url.service";

/** Shape the frontend library grid consumes (matches the MSW handler). */
export interface ArtworkLibraryItem {
  id: string;
  folderId: string | null;
  filename: string;
  /** Signed, short-lived URL (5 min); mint a fresh one with POST /artwork/:id/download-url. */
  previewUrl: string;
  mimeType: string;
  sizeBytes: number;
  widthPx?: number;
  heightPx?: number;
  dpi?: number;
}

/** Roles that may read any customer's artwork. CONTENT_EDITOR is deliberately absent (M3). */
const ARTWORK_READER_ROLES = new Set(["STAFF", "ADMIN"]);
/** Served inline for `preview` links; every other type is always an attachment. */
export const INLINE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Shipment labels are artwork rows too; they never show up in libraries or count toward quotas. */
const NOT_A_LABEL: Prisma.ArtworkFileWhereInput = { shipmentLabels: { none: {} } };

export interface ArtworkQuota {
  bytes: number;
  files: number;
}

@Injectable()
export class ArtworkService {
  private readonly quota: ArtworkQuota;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly urls: DownloadUrlService,
    config: ConfigService,
  ) {
    this.quota = {
      bytes: config.get<number>("ARTWORK_QUOTA_BYTES") ?? UPLOAD_DEFAULTS.ARTWORK_QUOTA_BYTES,
      files: config.get<number>("ARTWORK_QUOTA_FILES") ?? UPLOAD_DEFAULTS.ARTWORK_QUOTA_FILES,
    };
  }

  /**
   * Stores an upload that multer already streamed to a temp file. The temp file is
   * committed (renamed) to a content-addressed key or deleted — never left behind.
   */
  async upload(
    userId: string,
    file: UploadedTempFile | undefined,
    folderId?: string,
  ): Promise<{ artworkId: string; previewUrl: string; meta: Record<string, unknown> }> {
    try {
      return await this.store(userId, file, folderId);
    } finally {
      await this.storage.discard(file?.path);
    }
  }

  private async store(userId: string, file: UploadedTempFile | undefined, folderId?: string) {
    if (!file || file.size === 0) {
      throw new BadRequestException({ code: "NO_FILE", message: "No file provided." });
    }
    if (file.size > ARTWORK_MAX_BYTES_DEFAULT) {
      throw new PayloadTooLargeException({ code: "FILE_TOO_LARGE", message: "Files can be at most 50 MB." });
    }
    // Magic-byte sniff during streaming; the declared Content-Type is ignored.
    const mime = file.detectedMime;
    if (!mime || !(ALLOWED_MIME_TYPES as readonly string[]).includes(mime)) {
      throw new BadRequestException({ code: "UNSUPPORTED_FILE_TYPE", message: "Only JPEG, PNG, and PDF files are supported." });
    }
    if (folderId) {
      const folder = await this.prisma.artworkFolder.findUnique({ where: { id: folderId } });
      if (!folder || folder.userId !== userId) {
        throw new BadRequestException({ code: "BAD_FOLDER", message: "Unknown folder." });
      }
    }

    const dims = inspectDimensions(mime, file.head);

    const row = await this.prisma.$transaction(
      async (tx) => {
        // One upload per user at a time past this point, so the quota check and the
        // insert cannot interleave with another request from the same account.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`artwork-upload:${userId}`}))`;

        // Same bytes already stored for this user: reuse that object (dedup).
        const twin = await tx.artworkFile.findFirst({
          where: { userId, sha256: file.sha256, bytes: file.size, deletedAt: null, ...NOT_A_LABEL },
          orderBy: { createdAt: "asc" },
          select: { s3Key: true, s3Bucket: true },
        });
        const reuse = twin && (await this.storage.exists(twin.s3Key)) ? twin : null;

        const usage = await this.usage(tx, userId);
        if (usage.files + 1 > this.quota.files) {
          throw new ConflictException({
            code: "ARTWORK_FILE_QUOTA",
            message: `Your library is limited to ${this.quota.files} files. Remove files you no longer need, or contact us.`,
          });
        }
        if (!reuse && usage.bytes + file.size > this.quota.bytes) {
          throw new PayloadTooLargeException({
            code: "ARTWORK_STORAGE_QUOTA",
            message: `Your library is limited to ${formatGiB(this.quota.bytes)} of artwork. Remove files you no longer need, or contact us.`,
          });
        }

        const stored = reuse
          ? { key: reuse.s3Key, bucket: reuse.s3Bucket }
          : await this.storage.commit(file.path, StorageService.contentKey(userId, file.sha256, mime));

        return tx.artworkFile.create({
          data: {
            userId,
            folderId: folderId ?? null,
            s3Key: stored.key,
            s3Bucket: stored.bucket,
            originalFilename: path.basename(file.originalname || "artwork").slice(0, 200),
            mime,
            bytes: file.size,
            sha256: file.sha256,
            widthPx: dims.widthPx ?? null,
            heightPx: dims.heightPx ?? null,
            dpiReport: dims.report as object,
            scanStatus: "PENDING",
          },
        });
      },
      { timeout: 30_000 },
    );

    return {
      artworkId: row.id,
      previewUrl: this.urls.sign(row.id, "preview").url,
      meta: {
        mimeType: row.mime,
        sizeBytes: row.bytes,
        widthPx: row.widthPx ?? undefined,
        heightPx: row.heightPx ?? undefined,
        dpi: dims.dpi,
      },
    };
  }

  /** Live library files and their stored bytes (each object counted once, labels excluded). */
  private async usage(tx: Prisma.TransactionClient, userId: string): Promise<{ files: number; bytes: number }> {
    const rows = await tx.$queryRaw<Array<{ files: number; bytes: bigint | number | null }>>`
      SELECT count(*)::int AS files,
             COALESCE(sum(bytes) FILTER (WHERE first_of_key), 0)::bigint AS bytes
      FROM (
        SELECT a.bytes, row_number() OVER (PARTITION BY a."s3Key" ORDER BY a."createdAt") = 1 AS first_of_key
        FROM artwork_file a
        WHERE a."userId" = ${userId}
          AND a."deletedAt" IS NULL
          AND NOT EXISTS (SELECT 1 FROM shipment s WHERE s."labelFileId" = a.id)
      ) live`;
    return { files: Number(rows[0]?.files ?? 0), bytes: Number(rows[0]?.bytes ?? 0) };
  }

  async listFolders(userId: string): Promise<Array<{ id: string; name: string; parentId: null }>> {
    const folders = await this.prisma.artworkFolder.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return folders.map((f) => ({ id: f.id, name: f.name, parentId: null }));
  }

  async createFolder(userId: string, name: string): Promise<{ id: string; name: string; parentId: null }> {
    const folder = await this.prisma.artworkFolder.create({ data: { userId, name: name.slice(0, 80) } });
    return { id: folder.id, name: folder.name, parentId: null };
  }

  async renameFolder(userId: string, folderId: string, name: string): Promise<void> {
    await this.assertFolderOwnership(userId, folderId);
    await this.prisma.artworkFolder.update({ where: { id: folderId }, data: { name: name.slice(0, 80) } });
  }

  /** Deletes a folder; its files stay in the library (moved to root). */
  async deleteFolder(userId: string, folderId: string): Promise<void> {
    await this.assertFolderOwnership(userId, folderId);
    await this.prisma.$transaction([
      this.prisma.artworkFile.updateMany({ where: { folderId }, data: { folderId: null } }),
      this.prisma.artworkFolder.delete({ where: { id: folderId } }),
    ]);
  }

  async library(userId: string, folderId?: string): Promise<ArtworkLibraryItem[]> {
    const rows = await this.prisma.artworkFile.findMany({
      where: { userId, deletedAt: null, ...NOT_A_LABEL, ...(folderId ? { folderId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return rows.map((r) => this.toLibraryItem(r));
  }

  /**
   * Mints a short-lived signed URL. Readers: the owner; STAFF and ADMIN; and, for a
   * shipment label, the customer whose order it belongs to (M4).
   */
  async createDownloadUrl(user: AuthedUser, artworkId: string, purpose: DownloadPurpose): Promise<SignedDownloadUrl> {
    const row = await this.prisma.artworkFile.findUnique({ where: { id: artworkId }, select: { id: true, userId: true, deletedAt: true } });
    if (!row || row.deletedAt) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Artwork not found." });
    }
    if (row.userId !== user.id && !ARTWORK_READER_ROLES.has(user.role)) {
      const ownLabel = await this.prisma.shipment.findFirst({
        where: { labelFileId: row.id, order: { userId: user.id } },
        select: { id: true },
      });
      if (!ownLabel) {
        throw new ForbiddenException({ code: "FORBIDDEN", message: "This file belongs to another account." });
      }
    }
    return this.urls.sign(row.id, purpose);
  }

  /** Signed preview URL for responses that embed artwork (admin order detail). */
  previewUrl(artworkId: string): string {
    return this.urls.sign(artworkId, "preview").url;
  }

  /** Resolves a signed link (already verified by the caller) to a stream plus response metadata. */
  async openSigned(
    artworkId: string,
    purpose: DownloadPurpose,
  ): Promise<{ stream: Readable; size: number; mime: string; filename: string; inline: boolean }> {
    const row = await this.prisma.artworkFile.findUnique({ where: { id: artworkId } });
    if (!row || row.deletedAt) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Artwork not found." });
    }
    const { stream, size } = await this.storage.open(row.s3Key);
    return {
      stream,
      size,
      mime: row.mime,
      filename: row.originalFilename,
      inline: purpose === "preview" && INLINE_IMAGE_TYPES.has(row.mime),
    };
  }

  /** Ownership + health check used by order creation. */
  async assertUsableBy(userId: string, artworkId: string): Promise<void> {
    const row = await this.prisma.artworkFile.findUnique({ where: { id: artworkId } });
    if (!row || row.deletedAt || row.userId !== userId) {
      throw new BadRequestException({
        code: "ARTWORK_INVALID",
        message: "One of the referenced artwork files does not exist in your library.",
      });
    }
    if (row.scanStatus === "FLAGGED") {
      throw new BadRequestException({
        code: "ARTWORK_FLAGGED",
        message: "One of the uploaded files failed our checks and cannot be used.",
      });
    }
  }

  private toLibraryItem(r: {
    id: string;
    folderId: string | null;
    originalFilename: string;
    mime: string;
    bytes: number;
    widthPx: number | null;
    heightPx: number | null;
    dpiReport: unknown;
  }): ArtworkLibraryItem {
    const report = (r.dpiReport ?? {}) as Record<string, unknown>;
    const dpi = typeof report.dpi === "number" ? report.dpi : undefined;
    return {
      id: r.id,
      folderId: r.folderId,
      filename: r.originalFilename,
      previewUrl: this.urls.sign(r.id, "preview").url,
      mimeType: r.mime,
      sizeBytes: r.bytes,
      widthPx: r.widthPx ?? undefined,
      heightPx: r.heightPx ?? undefined,
      dpi,
    };
  }

  private async assertFolderOwnership(userId: string, folderId: string): Promise<void> {
    const folder = await this.prisma.artworkFolder.findUnique({ where: { id: folderId } });
    if (!folder || folder.userId !== userId) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Folder not found." });
    }
  }
}

function formatGiB(bytes: number): string {
  const gib = bytes / 1024 ** 3;
  return Number.isInteger(gib) ? `${gib} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}
