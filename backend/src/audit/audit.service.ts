import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditEntry {
  actorId?: string | null;
  action: string; // e.g. "order.mark_paid", "material.update"
  entityType: string; // e.g. "order", "product_material"
  entityId?: string | null;
  /** old→new diff (use AuditService.diffOf) or arbitrary context */
  diff?: unknown;
  ip?: string | null;
}

const IGNORED_KEYS = new Set(["createdAt", "updatedAt"]);

/**
 * Append-only audit trail for every staff/admin mutation. Applied explicitly
 * in services (boring and greppable) — no magic interceptors.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        diff: (entry.diff ?? null) as object,
        ip: entry.ip ?? null,
      },
    });
  }

  /**
   * Shallow old→new diff of two rows: { field: { from, to } }.
   * Values are JSON-stringified when not primitive so Decimal/Date compare safely.
   */
  static diffOf(
    before: Record<string, unknown> | null | undefined,
    after: Record<string, unknown>,
  ): Record<string, { from: unknown; to: unknown }> {
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after)]);
    for (const key of keys) {
      if (IGNORED_KEYS.has(key)) continue;
      const from = before?.[key];
      const to = after[key];
      if (!AuditService.sameValue(from, to)) {
        diff[key] = { from: AuditService.presentable(from), to: AuditService.presentable(to) };
      }
    }
    return diff;
  }

  private static sameValue(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }

  private static presentable(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (typeof value === "object") return JSON.parse(JSON.stringify(value));
    return value;
  }
}
