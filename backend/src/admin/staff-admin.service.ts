import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { EmailService } from "../notifications/email.service";
import type { AuthedUser } from "../common/jwt-auth.guard";
import { hashPassword } from "../auth/password";
import { passwordProblem } from "../cli/reset-password";
import { RbacService, rbacUserInclude } from "../rbac/rbac.service";
import { ADMIN_ROLE_KEY, CUSTOMER_ROLE_KEY, can, resolveEffective, toWirePermissions, type PermissionKey } from "../rbac/permissions";
import { AdminCustomersService } from "./customers-admin.service";
import type { CreateStaffDto, ListStaffQueryDto, UpdateStaffDto } from "./staff-admin.dto";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const STAFF_INVITE_TTL_HOURS = 72;

type Actor = Pick<AuthedUser, "id" | "permissions">;

/** List row for `GET /admin/users`. */
export interface StaffListItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  phone: string | null;
  role: string;
  roleId: string;
  roleKey: string | null;
  roleName: string | null;
  status: string;
  mustChangePassword: boolean;
  overrideCount: number;
  lastLoginAt: string | null;
  invitedBy: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
}

export interface StaffDetail extends StaffListItem {
  emailVerifiedAt: string | null;
  passwordChangedAt: string | null;
  /** Effective permissions (`["*"]` for admin). */
  permissions: string[];
  /** Pending invite, if the account is still INVITED. */
  invite: { expiresAt: string; createdAt: string } | null;
}

const LIST_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  roleId: true,
  status: true,
  mustChangePassword: true,
  lastLoginAt: true,
  invitedBy: true,
  suspendedAt: true,
  suspendedReason: true,
  createdAt: true,
  accessRole: { select: { key: true, name: true } },
  _count: { select: { permissionOverrides: true } },
} satisfies Prisma.UserSelect;

type ListRow = Prisma.UserGetPayload<{ select: typeof LIST_SELECT }>;

function toListItem(u: ListRow): StaffListItem {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || null,
    phone: u.phone,
    role: u.role,
    roleId: u.roleId,
    roleKey: u.accessRole?.key ?? null,
    roleName: u.accessRole?.name ?? null,
    status: u.status,
    mustChangePassword: u.mustChangePassword,
    overrideCount: u._count.permissionOverrides,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    invitedBy: u.invitedBy,
    suspendedAt: u.suspendedAt?.toISOString() ?? null,
    suspendedReason: u.suspendedReason,
    createdAt: u.createdAt.toISOString(),
  };
}

/**
 * Staff account management (`users:*`, plan §5.2). Every mutation applies the
 * escalation safeguards from §3.6 — no self-modification, target tier, grant
 * ceiling, last-admin lock — revokes the target's sessions where access
 * changes, and audits inside the transaction.
 */
@Injectable()
export class StaffAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly rbac: RbacService,
    private readonly customers: AdminCustomersService,
  ) {}

  // --- Reads --------------------------------------------------------------------

  async list(query: ListStaffQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      role: { not: "CUSTOMER" },
      ...(query.status ? { status: query.status } : {}),
      ...(query.roleId ? { roleId: query.roleId } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({ where, orderBy: [{ createdAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize, select: LIST_SELECT }),
    ]);
    return { page, pageSize, total, items: rows.map(toListItem) };
  }

  async detail(id: string): Promise<StaffDetail> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { ...rbacUserInclude(), _count: { select: { permissionOverrides: true } } },
    });
    if (!user || user.role === "CUSTOMER") throw new NotFoundException({ code: "NOT_FOUND", message: "Staff account not found." });
    const invite =
      user.status === "INVITED"
        ? await this.prisma.actionToken.findFirst({
            where: { userId: id, purpose: "STAFF_INVITE", usedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "desc" },
            select: { expiresAt: true, createdAt: true },
          })
        : null;
    return {
      ...toListItem({ ...user, accessRole: { key: user.accessRole.key, name: user.accessRole.name } }),
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null,
      permissions: toWirePermissions(resolveEffective(user)),
      invite: invite ? { expiresAt: invite.expiresAt.toISOString(), createdAt: invite.createdAt.toISOString() } : null,
    };
  }

  // --- Create ----------------------------------------------------------------------

  /**
   * Creates a staff account. The role must be one the actor could assign
   * (grant ceiling; `admin` needs `rbac:manage`). `temporary_password` creates
   * an ACTIVE account that must change its password on first sign-in; the
   * password is never returned. `invite` creates an INVITED account with an
   * unusable hash and a single-use 72-hour token that only ever reaches EmailService.
   */
  async create(actor: Actor, dto: CreateStaffDto, ip?: string): Promise<{ user: StaffDetail; mode: CreateStaffDto["mode"]; inviteExpiresAt: string | null }> {
    const email = dto.email.toLowerCase().trim();
    const role = await this.prisma.accessRole.findUnique({ where: { id: dto.roleId }, include: { permissions: { select: { permissionKey: true } } } });
    if (!role) throw new NotFoundException({ code: "ROLE_NOT_FOUND", message: "Role not found." });
    if (role.key === CUSTOMER_ROLE_KEY) throw new BadRequestException({ code: "ROLE_NOT_STAFF", message: "Staff accounts need a staff role." });
    if (role.key === ADMIN_ROLE_KEY && !can(actor, "rbac:manage")) {
      throw new ForbiddenException({ code: "FORBIDDEN_PERMISSION", message: "Only rbac:manage holders can create admin accounts.", required: ["rbac:manage"] });
    }
    this.rbac.assertCanGrant(actor, role.permissions.map((p) => p.permissionKey as PermissionKey));

    let passwordHash: string;
    if (dto.mode === "temporary_password") {
      if (!dto.temporaryPassword) throw new BadRequestException({ code: "PASSWORD_REQUIRED", message: "Set a temporary password." });
      const problem = passwordProblem(dto.temporaryPassword);
      if (problem) throw new BadRequestException({ code: "WEAK_PASSWORD", message: problem });
      passwordHash = await hashPassword(dto.temporaryPassword);
    } else {
      // Unusable until the invite is accepted: nobody knows this value.
      passwordHash = await hashPassword(randomBytes(32).toString("hex"));
    }

    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new ConflictException({ code: "EMAIL_TAKEN", message: "An account with that email already exists." });

    const rawToken = dto.mode === "invite" ? randomBytes(32).toString("hex") : null;
    const now = new Date();
    const inviteExpiresAt = rawToken ? new Date(now.getTime() + STAFF_INVITE_TTL_HOURS * 60 * 60 * 1000) : null;

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          phone: dto.phone?.trim() || null,
          role: role.legacyRole,
          roleId: role.id,
          status: dto.mode === "invite" ? "INVITED" : "ACTIVE",
          mustChangePassword: dto.mode === "temporary_password",
          invitedBy: actor.id,
        },
        select: { id: true },
      });
      if (rawToken && inviteExpiresAt) {
        await tx.actionToken.create({
          data: { userId: user.id, purpose: "STAFF_INVITE", tokenHash: sha256(rawToken), roleId: role.id, requestedBy: actor.id, expiresAt: inviteExpiresAt },
        });
      }
      await this.audit.record(
        {
          actorId: actor.id,
          action: "user.create",
          entityType: "user",
          entityId: user.id,
          diff: {
            email,
            mode: dto.mode,
            status: dto.mode === "invite" ? "INVITED" : "ACTIVE",
            role: { roleKey: role.key, legacyRole: role.legacyRole, permissions: role.permissions.map((p) => p.permissionKey).sort() },
            mustChangePassword: dto.mode === "temporary_password",
          },
          ip,
        },
        tx,
      );
      return user;
    });

    if (rawToken) {
      await this.email.send({ to: email, template: "staff_invite", payload: { inviteToken: rawToken, expiresAt: inviteExpiresAt?.toISOString() } });
    }
    return { user: await this.detail(created.id), mode: dto.mode, inviteExpiresAt: inviteExpiresAt?.toISOString() ?? null };
  }

  /** Burns any outstanding invite and issues a fresh one. INVITED accounts only. */
  async resendInvite(actor: Actor, id: string, ip?: string): Promise<{ ok: true; inviteExpiresAt: string }> {
    const user = await this.loadStaffTarget(id);
    if (user.status !== "INVITED") throw new ConflictException({ code: "NOT_INVITED", message: "This account has already been activated." });
    const rawToken = randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + STAFF_INVITE_TTL_HOURS * 60 * 60 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await tx.actionToken.updateMany({ where: { userId: id, purpose: "STAFF_INVITE", usedAt: null }, data: { usedAt: now } });
      await tx.actionToken.create({ data: { userId: id, purpose: "STAFF_INVITE", tokenHash: sha256(rawToken), roleId: user.roleId, requestedBy: actor.id, expiresAt } });
      await this.audit.record({ actorId: actor.id, action: "user.invite_resend", entityType: "user", entityId: id, diff: { expiresAt: expiresAt.toISOString() }, ip }, tx);
    });
    await this.email.send({ to: user.email, template: "staff_invite", payload: { inviteToken: rawToken, expiresAt: expiresAt.toISOString() } });
    return { ok: true, inviteExpiresAt: expiresAt.toISOString() };
  }

  // --- Profile / role ---------------------------------------------------------------

  async update(actor: Actor, id: string, dto: UpdateStaffDto, ip?: string): Promise<StaffDetail> {
    const user = await this.loadStaffTarget(id);
    const data = {
      ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
    };
    const before = { firstName: user.firstName, lastName: user.lastName, phone: user.phone };
    const diff = AuditService.diffOf(before, { ...before, ...data });
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data });
      await this.audit.record({ actorId: actor.id, action: "user.update", entityType: "user", entityId: id, diff, ip }, tx);
    });
    return this.detail(id);
  }

  /** Target tier (rule 5) is checked here; RbacService.assignRole applies every other rule. */
  async assignRole(actor: Actor, id: string, roleId: string, ip?: string): Promise<StaffDetail> {
    const user = await this.loadStaffTarget(id);
    this.rbac.assertTargetKind(user, "staff");
    await this.rbac.assignRole(actor, id, roleId, ip);
    return this.detail(id);
  }

  // --- Status ------------------------------------------------------------------------

  async suspend(actor: Actor, id: string, reason: string, ip?: string): Promise<StaffDetail> {
    this.rbac.assertNotSelf(actor, id);
    const user = await this.loadStaffTarget(id);
    this.rbac.assertTargetKind(user, "staff");
    if (user.status === "SUSPENDED") throw new ConflictException({ code: "ALREADY_SUSPENDED", message: "This account is already suspended." });
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      if (this.isAdmin(user)) await this.rbac.assertNotLastAdmin(id, tx);
      await tx.user.update({ where: { id }, data: { status: "SUSPENDED", suspendedAt: now, suspendedReason: reason.trim() } });
      await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: now } });
      await this.audit.record(
        { actorId: actor.id, action: "user.suspend", entityType: "user", entityId: id, diff: { status: { from: user.status, to: "SUSPENDED" }, reason: reason.trim() }, ip },
        tx,
      );
    });
    return this.detail(id);
  }

  async reactivate(actor: Actor, id: string, reason: string | undefined, ip?: string): Promise<StaffDetail> {
    this.rbac.assertNotSelf(actor, id);
    const user = await this.loadStaffTarget(id);
    this.rbac.assertTargetKind(user, "staff");
    if (user.status !== "SUSPENDED") throw new ConflictException({ code: "NOT_SUSPENDED", message: "This account is not suspended." });
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { status: "ACTIVE", suspendedAt: null, suspendedReason: null } });
      await this.audit.record(
        {
          actorId: actor.id,
          action: "user.reactivate",
          entityType: "user",
          entityId: id,
          diff: { status: { from: "SUSPENDED", to: "ACTIVE" }, previousReason: user.suspendedReason, reason: reason?.trim() || null },
          ip,
        },
        tx,
      );
    });
    return this.detail(id);
  }

  /** Staff targets only; the shared reset path enforces `users:reset_password` and the admin-is-CLI-only rule. */
  async resetPassword(actor: Actor, id: string, ip?: string): Promise<{ ok: true }> {
    const user = await this.loadStaffTarget(id);
    this.rbac.assertTargetKind(user, "staff");
    return this.customers.adminResetPassword(actor, id, ip);
  }

  // --- Internals ------------------------------------------------------------------------

  private async loadStaffTarget(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, include: rbacUserInclude() });
    if (!user || user.role === "CUSTOMER") throw new NotFoundException({ code: "NOT_FOUND", message: "Staff account not found." });
    return user;
  }

  private isAdmin(user: { role: string; accessRole?: { key: string } | null }): boolean {
    return (user.accessRole?.key ?? (user.role === "ADMIN" ? ADMIN_ROLE_KEY : null)) === ADMIN_ROLE_KEY;
  }
}
