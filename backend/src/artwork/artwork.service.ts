import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import * as path from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { ALLOWED_MIME_TYPES, inspectDimensions, sniffMime } from "./artwork-inspect";
import type { AllowedMimeType } from "./artwork-inspect";

const MAX_BYTES = 50 * 1024 * 1024; // keep in sync with shared ARTWORK_MAX_BYTES_DEFAULT

/** Shape the frontend library grid consumes (matches the MSW handler). */
export interface ArtworkLibraryItem {
  id: string;
  folderId: string | null;
  filename: string;
  previewUrl: string;
  mimeType: string;
  sizeBytes: number;
  widthPx?: number;
  heightPx?: number;
  dpi?: number;
}

@Injectable()
export class ArtworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    userId: string,
    file: { originalname: string; size: number; buffer: Buffer },
    folderId?: string,
  ): Promise<{ artworkId: string; previewUrl: string; meta: Record<string, unknown> }> {
    if (!file || file.size === 0) {
      throw new BadRequestException({ code: "NO_FILE", message: "No file provided." });
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException({
        code: "FILE_TOO_LARGE",
        message: "Files can be at most 50 MB.",
      });
    }

    // Magic-byte sniff — the declared Content-Type is ignored.
    const mime = sniffMime(file.buffer);
    if (!mime || !(ALLOWED_MIME_TYPES as readonly string[]).includes(mime)) {
      throw new BadRequestException({
        code: "UNSUPPORTED_FILE_TYPE",
        message: "Only JPEG, PNG, and PDF files are supported.",
      });
    }

    if (folderId) {
      const folder = await this.prisma.artworkFolder.findUnique({ where: { id: folderId } });
      if (!folder || folder.userId !== userId) {
        throw new BadRequestException({ code: "BAD_FOLDER", message: "Unknown folder." });
      }
    }

    const dims = inspectDimensions(mime, file.buffer);
    const sha256 = createHash("sha256").update(file.buffer).digest("hex");
    const key = StorageService.buildKey(userId, file.originalname);
    const stored = await this.storage.put(key, file.buffer, mime);

    const row = await this.prisma.artworkFile.create({
      data: {
        userId,
        folderId: folderId ?? null,
        s3Key: stored.key,
        s3Bucket: stored.bucket,
        originalFilename: path.basename(file.originalname).slice(0, 200),
        mime,
        bytes: file.size,
        sha256,
        widthPx: dims.widthPx ?? null,
        heightPx: dims.heightPx ?? null,
        dpiReport: dims.report as object,
        scanStatus: "PENDING",
      },
    });

    return {
      artworkId: row.id,
      previewUrl: `/artwork/${row.id}/download`,
      meta: {
        mimeType: row.mime,
        sizeBytes: row.bytes,
        widthPx: row.widthPx ?? undefined,
        heightPx: row.heightPx ?? undefined,
        dpi: dims.dpi,
      },
    };
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
      where: { userId, deletedAt: null, ...(folderId ? { folderId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return rows.map((r) => this.toLibraryItem(r));
  }

  async download(
    userId: string,
    role: string,
    artworkId: string,
  ): Promise<{ file: Buffer; mime: string; filename: string }> {
    const row = await this.prisma.artworkFile.findUnique({ where: { id: artworkId } });
    if (!row || row.deletedAt) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Artwork not found." });
    }
    const isPrivileged = role === "ADMIN" || role === "STAFF" || role === "CONTENT_EDITOR";
    if (row.userId !== userId && !isPrivileged) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "This file belongs to another account." });
    }
    let file: Buffer;
    try {
      file = await this.storage.get(row.s3Key);
    } catch {
      throw new NotFoundException({ code: "FILE_MISSING", message: "Stored file is no longer available." });
    }
    return { file, mime: row.mime, filename: row.originalFilename };
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
      previewUrl: `/artwork/${r.id}/download`,
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
