import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import type { AuditQueryDto } from "./audit-admin.dto";

export interface AuditListItem {
  id: string;
  actorId: string | null;
  /** Joined at read time; null for system/CLI actors (`diff.actor` names them). */
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  /** Stored as written by the mutation (full before/after lists for RBAC changes). */
  diff: unknown;
  ip: string | null;
  createdAt: string;
}

export const AUDIT_DEFAULT_PAGE_SIZE = 50;
export const AUDIT_MAX_PAGE_SIZE = 100;

/** Builds the Prisma filter from a validated query; exported so the spec can pin the bounds. */
export function auditWhere(query: AuditQueryDto): Prisma.AuditLogWhereInput {
  const from = query.from ? new Date(query.from) : undefined;
  const to = query.to ? new Date(query.to) : undefined;
  if (from && to && from > to) throw new BadRequestException({ code: "INVALID_RANGE", message: "`from` must be before `to`." });
  return {
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.entityId ? { entityId: query.entityId } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };
}

/** Read side of `audit_log` (`audit:read`). Append-only: there is no write here on purpose. */
@Injectable()
export class AuditAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AuditQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(AUDIT_MAX_PAGE_SIZE, query.pageSize ?? AUDIT_DEFAULT_PAGE_SIZE);
    const where = auditWhere(query);
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { email: true } } },
      }),
    ]);
    const items: AuditListItem[] = rows.map((row) => ({
      id: row.id,
      actorId: row.actorId,
      actorEmail: row.actor?.email ?? null,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      diff: row.diff,
      ip: row.ip,
      createdAt: row.createdAt.toISOString(),
    }));
    return { page, pageSize, total, items };
  }

  /** Distinct action names for the filter dropdown. */
  async actions(): Promise<string[]> {
    const rows = await this.prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } });
    return rows.map((r) => r.action);
  }
}
