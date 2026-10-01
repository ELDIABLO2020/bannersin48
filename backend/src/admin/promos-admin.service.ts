import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type PromoCode } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { CreatePromoDto, ListPromosQueryDto, UpdatePromoDto } from "./promos-admin.dto";

/** Wire shape of a promo code. Money / percentages are decimal strings, never floats. */
export interface AdminPromoCode {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: string;
  minOrder: string;
  maxUses: number | null;
  perUserLimit: number | null;
  timesUsed: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Promo code CRUD (`promos:read` / `promos:write`, plan §5.2). Codes are
 * deactivated, never deleted (orders reference them). Checkout does not apply
 * promo codes yet (plan §11 Q7): this is the management surface only.
 */
@Injectable()
export class PromosAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListPromosQueryDto): Promise<{ page: number; pageSize: number; total: number; items: AdminPromoCode[] }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.PromoCodeWhereInput = {
      ...(query.active !== undefined ? { active: query.active === "true" } : {}),
      ...(query.search?.trim() ? { code: { contains: query.search.trim().toUpperCase() } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.promoCode.count({ where }),
      this.prisma.promoCode.findMany({ where, orderBy: [{ active: "desc" }, { createdAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
    ]);
    return { page, pageSize, total, items: rows.map(serializePromo) };
  }

  async get(id: string): Promise<AdminPromoCode> {
    return serializePromo(await this.load(id));
  }

  async create(actorId: string, dto: CreatePromoDto, ip?: string): Promise<AdminPromoCode> {
    const data = {
      code: normalizeCode(dto.code),
      type: dto.type,
      value: dto.value.toFixed(2),
      minOrder: (dto.minOrder ?? 0).toFixed(2),
      maxUses: dto.maxUses ?? null,
      perUserLimit: dto.perUserLimit ?? null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      active: dto.active ?? true,
    };
    assertPromoRules(data);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const row = await tx.promoCode.create({ data });
        await this.audit.record({ actorId, action: "promo_code.create", entityType: "promo_code", entityId: row.id, diff: { after: serializePromo(row) }, ip }, tx);
        return row;
      });
      return serializePromo(row);
    } catch (err) {
      if (isUniqueViolation(err)) throw codeTaken(data.code);
      throw err;
    }
  }

  async update(actorId: string, id: string, dto: UpdatePromoDto, ip?: string): Promise<AdminPromoCode> {
    const before = await this.load(id);
    const data: Prisma.PromoCodeUpdateInput = {
      ...(dto.code !== undefined ? { code: normalizeCode(dto.code) } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.value !== undefined ? { value: dto.value.toFixed(2) } : {}),
      ...(dto.minOrder !== undefined ? { minOrder: dto.minOrder.toFixed(2) } : {}),
      ...(dto.maxUses !== undefined ? { maxUses: dto.maxUses } : {}),
      ...(dto.perUserLimit !== undefined ? { perUserLimit: dto.perUserLimit } : {}),
      ...(dto.startsAt !== undefined ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null } : {}),
      ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
    };
    assertPromoRules({
      type: (data.type as PromoCode["type"]) ?? before.type,
      value: (data.value as string) ?? decimalString(before.value),
      startsAt: data.startsAt === undefined ? before.startsAt : (data.startsAt as Date | null),
      endsAt: data.endsAt === undefined ? before.endsAt : (data.endsAt as Date | null),
    });
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const row = await tx.promoCode.update({ where: { id }, data });
        const diff = AuditService.diffOf(serializePromo(before) as unknown as Record<string, unknown>, serializePromo(row) as unknown as Record<string, unknown>);
        await this.audit.record({ actorId, action: "promo_code.update", entityType: "promo_code", entityId: id, diff, ip }, tx);
        return row;
      });
      return serializePromo(row);
    } catch (err) {
      if (isUniqueViolation(err)) throw codeTaken(String(data.code));
      throw err;
    }
  }

  /** "Delete" is `active: false` (orders keep their reference). Already-inactive codes are a no-op. */
  async deactivate(actorId: string, id: string, ip?: string): Promise<AdminPromoCode> {
    const before = await this.load(id);
    if (!before.active) return serializePromo(before);
    const row = await this.prisma.$transaction(async (tx) => {
      const row = await tx.promoCode.update({ where: { id }, data: { active: false } });
      await this.audit.record({ actorId, action: "promo_code.deactivate", entityType: "promo_code", entityId: id, diff: { active: { from: true, to: false } }, ip }, tx);
      return row;
    });
    return serializePromo(row);
  }

  private async load(id: string): Promise<PromoCode> {
    const row = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!row) throw new NotFoundException({ code: "NOT_FOUND", message: "Promo code not found." });
    return row;
  }
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Percentages stay within 100; a window must end after it starts. */
export function assertPromoRules(input: { type: string; value: string; startsAt: Date | null; endsAt: Date | null }): void {
  if (input.type === "PERCENT" && Number(input.value) > 100) {
    throw new BadRequestException({ code: "PROMO_VALUE_INVALID", message: "A percentage discount cannot exceed 100%." });
  }
  if (input.startsAt && input.endsAt && input.endsAt.getTime() <= input.startsAt.getTime()) {
    throw new BadRequestException({ code: "PROMO_WINDOW_INVALID", message: "The end date must be after the start date." });
  }
}

export function serializePromo(row: PromoCode): AdminPromoCode {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: decimalString(row.value),
    minOrder: decimalString(row.minOrder),
    maxUses: row.maxUses,
    perUserLimit: row.perUserLimit,
    timesUsed: row.timesUsed,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Prisma returns `Decimal`; the in-memory spec database stores the `toFixed(2)` string we wrote. */
function decimalString(value: Prisma.Decimal | string | number): string {
  return typeof value === "string" ? value : Number(value).toFixed(2);
}

function codeTaken(code: string): ConflictException {
  return new ConflictException({ code: "PROMO_CODE_TAKEN", message: `Promo code ${code} already exists.` });
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
