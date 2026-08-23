import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../notifications/email.service";
import type { BlockType } from "@prisma/client";

const VALID_BLOCK_TYPES = ["BANNER_IMAGE", "TEXT", "ANNOUNCEMENT", "PROMO_STRIP"];

export interface ContentBlock {
  key: string;
  blockType: string;
  payload: unknown;
  published: boolean;
  updatedAt: string;
}

/** Public CMS read — published blocks only. */
@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublished(): Promise<ContentBlock[]> {
    const rows = await this.prisma.siteContent.findMany({ where: { published: true } });
    return rows.map(serializeBlock);
  }

  async getPublished(key: string): Promise<ContentBlock> {
    const row = await this.prisma.siteContent.findUnique({ where: { key } });
    if (!row || !row.published) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Content block not found." });
    }
    return serializeBlock(row);
  }
}

/** Admin CMS + customer management (§3d/§3e). ADMIN only; mutations audited. */
@Injectable()
export class AdminContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listAll(): Promise<ContentBlock[]> {
    const rows = await this.prisma.siteContent.findMany();
    return rows.map(serializeBlock);
  }

  async get(key: string): Promise<ContentBlock> {
    const row = await this.prisma.siteContent.findUnique({ where: { key } });
    if (!row) throw new NotFoundException({ code: "NOT_FOUND", message: "Content block not found." });
    return serializeBlock(row);
  }

  async upsert(actorId: string, dto: {
    key: string;
    blockType?: string;
    payload?: unknown;
    published?: boolean;
  }, ip?: string): Promise<ContentBlock> {
    const before = await this.prisma.siteContent.findUnique({ where: { key: dto.key } });
    if (!before && !dto.blockType) {
      throw new BadRequestException({ code: "BLOCK_TYPE_REQUIRED", message: "blockType is required when creating a block." });
    }
    if (dto.blockType && !VALID_BLOCK_TYPES.includes(dto.blockType)) {
      throw new BadRequestException({
        code: "BAD_BLOCK_TYPE",
        message: `blockType must be one of ${VALID_BLOCK_TYPES.join(", ")}.`,
      });
    }

    // Upsert by key (site_content.key is the PK).
    const after = await this.prisma.siteContent.upsert({
      where: { key: dto.key },
      update: {
        ...(dto.payload !== undefined ? { payload: dto.payload as object } : {}),
        ...(dto.published !== undefined ? { published: dto.published } : {}),
        updatedBy: actorId,
      },
      create: {
        key: dto.key,
        blockType: (dto.blockType ?? "TEXT") as BlockType,
        payload: (dto.payload ?? {}) as object,
        published: dto.published ?? true,
        updatedBy: actorId,
      },
    });

    await this.audit.record({
      actorId,
      action: before ? "site_content.update" : "site_content.create",
      entityType: "site_content",
      entityId: dto.key,
      diff: AuditService.diffOf(
        (before as unknown as Record<string, unknown>) ?? {},
        after as unknown as Record<string, unknown>,
      ),
      ip,
    });
    return serializeBlock(after);
  }

  async delete(actorId: string, key: string, ip?: string): Promise<{ deleted: boolean }> {
    const before = await this.prisma.siteContent.findUnique({ where: { key } });
    if (!before) throw new NotFoundException({ code: "NOT_FOUND", message: "Content block not found." });
    await this.prisma.siteContent.delete({ where: { key } });
    await this.audit.record({
      actorId,
      action: "site_content.delete",
      entityType: "site_content",
      entityId: key,
      diff: { removed: before as unknown as Record<string, unknown> },
      ip,
    });
    return { deleted: true };
  }
}

function serializeBlock(row: {
  key: string;
  blockType: string;
  payload: unknown;
  published: boolean;
  updatedAt: Date;
}): ContentBlock {
  return {
    key: row.key,
    blockType: row.blockType,
    payload: row.payload,
    published: row.published,
    updatedAt: row.updatedAt.toISOString(),
  };
}
