import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import { RbacService } from "./rbac.service";
import { syncRbacCatalog } from "./catalog-sync";
import { AuditService } from "../audit/audit.service";
import type { PrismaService } from "../prisma/prisma.service";
import {
  ADMIN_WILDCARD,
  PERMISSIONS,
  PERMISSION_KEYS,
  SYSTEM_ROLE_DEFAULTS,
  TEMPLATE_ROLE_DEFAULTS,
  can,
  resolveEffective,
  toWirePermissions,
  type EffectivePermissions,
  type PermissionKey,
} from "./permissions";

// --- Pure resolver -----------------------------------------------------------------

const role = (key: string, ...perms: string[]) => ({ key, permissions: perms.map((permissionKey) => ({ permissionKey })) });
const override = (permissionKey: string, effect: "ALLOW" | "DENY", expiresAt: Date | null = null) => ({ permissionKey, effect, expiresAt });
const keys = (e: EffectivePermissions) => (e === ADMIN_WILDCARD ? e : [...e].sort());

describe("resolveEffective", () => {
  it("gives the admin role the wildcard and ignores its overrides", () => {
    const admin = { role: "ADMIN", accessRole: role("admin"), permissionOverrides: [override("orders:read", "DENY")] };
    expect(resolveEffective(admin)).toBe(ADMIN_WILDCARD);
    expect(toWirePermissions(resolveEffective(admin))).toEqual(["*"]);
    expect(can({ permissions: resolveEffective(admin) }, "rbac:manage")).toBe(true);
  });

  it("unions role permissions with ALLOW overrides; DENY wins over both", () => {
    const user = {
      role: "STAFF",
      accessRole: role("fulfillment", "orders:read", "orders:tracking"),
      permissionOverrides: [override("payments:mark_paid", "ALLOW"), override("orders:tracking", "DENY"), override("payments:mark_paid", "DENY")],
    };
    expect(keys(resolveEffective(user))).toEqual(["orders:read"]);
  });

  it("ignores expired overrides and honours live ones", () => {
    const now = new Date("2026-10-01T12:00:00Z");
    const user = {
      role: "STAFF",
      accessRole: role("staff", "orders:read"),
      permissionOverrides: [
        override("payments:mark_paid", "ALLOW", new Date("2026-09-30T00:00:00Z")),
        override("rewards:adjust", "ALLOW", new Date("2026-12-31T00:00:00Z")),
      ],
    };
    expect(keys(resolveEffective(user, now))).toEqual(["orders:read", "rewards:adjust"]);
  });

  it("falls back to the legacy enum's default set while roleId is unset", () => {
    expect(keys(resolveEffective({ role: "STAFF", accessRole: null }))).toEqual([...SYSTEM_ROLE_DEFAULTS.staff].sort());
    expect(keys(resolveEffective({ role: "CONTENT_EDITOR" }))).toEqual([...SYSTEM_ROLE_DEFAULTS.content_editor].sort());
    expect(keys(resolveEffective({ role: "CUSTOMER" }))).toEqual([]);
    expect(resolveEffective({ role: "ADMIN" })).toBe(ADMIN_WILDCARD);
  });

  it("drops keys that are no longer in the catalog and gives customers nothing", () => {
    expect(keys(resolveEffective({ role: "STAFF", accessRole: role("staff", "orders:read", "legacy:gone") }))).toEqual(["orders:read"]);
    expect(keys(resolveEffective({ role: "CUSTOMER", accessRole: role("customer"), permissionOverrides: [] }))).toEqual([]);
  });
});

describe("default role matrix (plan §3.3 as amended by §11 decision 2)", () => {
  it("strips payments:mark_paid and customers:reset_password from the default staff role", () => {
    expect(SYSTEM_ROLE_DEFAULTS.staff).not.toContain("payments:mark_paid");
    expect(SYSTEM_ROLE_DEFAULTS.staff).not.toContain("customers:reset_password");
    expect(SYSTEM_ROLE_DEFAULTS.staff).toEqual(expect.arrayContaining(["orders:read", "orders:tracking", "customers:read", "artwork:read_any", "catalog:read"]));
    expect(SYSTEM_ROLE_DEFAULTS.customer).toEqual([]);
    expect(SYSTEM_ROLE_DEFAULTS.admin).toEqual([]); // wildcard, not a list
  });

  it("keeps money and access control out of every default and template except via Support/Catalog Manager", () => {
    const support = TEMPLATE_ROLE_DEFAULTS.find((t) => t.key === "support")!;
    const catalog = TEMPLATE_ROLE_DEFAULTS.find((t) => t.key === "catalog_manager")!;
    expect(support.permissions).toContain("customers:reset_password");
    expect(catalog.permissions).toEqual(expect.arrayContaining(["pricing:write", "catalog:write"]));
    for (const set of [SYSTEM_ROLE_DEFAULTS.staff, SYSTEM_ROLE_DEFAULTS.content_editor, ...TEMPLATE_ROLE_DEFAULTS.map((t) => t.permissions)]) {
      expect(set).not.toContain("rbac:manage");
      expect(set).not.toContain("users:create");
      expect(set).not.toContain("payments:mark_paid");
    }
  });

  it("only references catalog keys", () => {
    const all = [...Object.values(SYSTEM_ROLE_DEFAULTS).flat(), ...TEMPLATE_ROLE_DEFAULTS.flatMap((t) => t.permissions)];
    for (const key of all) expect(PERMISSION_KEYS).toContain(key);
    expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSIONS.length);
  });
});

describe("migration seed stays in sync with the code catalog", () => {
  const sql = readFileSync(join(__dirname, "../../prisma/migrations/20261003000000_rbac_roles_permissions/migration.sql"), "utf8");

  it("inserts exactly the catalog's permission keys", () => {
    const block = sql.slice(sql.indexOf('INSERT INTO "permission"'), sql.indexOf('ON CONFLICT ("key") DO NOTHING;'));
    const seeded = [...block.matchAll(/^\s+\('([a-z_]+:[a-z_]+)', '/gm)].map((m) => m[1]);
    expect(seeded.sort()).toEqual([...PERMISSION_KEYS].sort());
  });

  it("grants the system and template roles exactly their default sets", () => {
    const pairs = [...sql.matchAll(/\('(role_[a-z_]+)', '([a-z_]+:[a-z_]+)'\)/g)].map((m) => [m[1], m[2]] as const);
    const byRole = new Map<string, string[]>();
    for (const [roleId, key] of pairs) byRole.set(roleId, [...(byRole.get(roleId) ?? []), key]);
    const sorted = (list: readonly string[] | undefined) => [...(list ?? [])].sort();

    expect(sorted(byRole.get("role_system_staff"))).toEqual(sorted(SYSTEM_ROLE_DEFAULTS.staff));
    expect(sorted(byRole.get("role_system_content_editor"))).toEqual(sorted(SYSTEM_ROLE_DEFAULTS.content_editor));
    expect(byRole.has("role_system_admin")).toBe(false);
    expect(byRole.has("role_system_customer")).toBe(false);
    for (const tpl of TEMPLATE_ROLE_DEFAULTS) expect(sorted(byRole.get(`role_template_${tpl.key}`))).toEqual(sorted(tpl.permissions));
    expect(sql).toMatch(/UPDATE "user" u\s+SET "roleId" = r\."id"/);
  });
});

// --- Service: an in-memory stand-in for the RBAC tables ----------------------------------

type Row = Record<string, any>;

interface State {
  users: Row[];
  roles: Row[];
  rolePerms: Array<{ roleId: string; permissionKey: string }>;
  overrides: Row[];
  tokens: Row[];
  audit: Row[];
  permissions: Row[];
}

let seq = 0;

class FakeDb {
  state: State;
  failOn: string | null = null;

  constructor(state: Partial<State>) {
    this.state = { users: [], roles: [], rolePerms: [], overrides: [], tokens: [], audit: [], permissions: [], ...state };
  }

  private maybeFail(op: string) {
    if (this.failOn === op) throw new Error(`injected failure: ${op}`);
  }

  private hydrateRole(r: Row, include?: Row): Row {
    const base = { createdAt: new Date(0), updatedAt: new Date(0), description: null, name: r.key, ...r };
    if (!include) return base;
    return {
      ...base,
      ...(include.permissions ? { permissions: this.state.rolePerms.filter((rp) => rp.roleId === r.id).map((rp) => ({ permissionKey: rp.permissionKey })) } : {}),
      ...(include._count ? { _count: { users: this.state.users.filter((u) => u.roleId === r.id).length } } : {}),
    };
  }

  private hydrate(u: Row | undefined, include?: Row): Row | null {
    if (!u) return null;
    if (!include) return { ...u };
    const roleRow = this.state.roles.find((r) => r.id === u.roleId);
    const accessRole = roleRow
      ? { ...roleRow, permissions: this.state.rolePerms.filter((rp) => rp.roleId === roleRow.id).map((rp) => ({ permissionKey: rp.permissionKey })) }
      : null;
    const permissionOverrides = this.state.overrides.filter((o) => o.userId === u.id);
    return { ...u, accessRole, permissionOverrides };
  }

  client(): any {
    const s = this.state;
    const client: any = {
      user: {
        findUnique: async ({ where, include }: any) => this.hydrate(s.users.find((u) => u.id === where.id), include),
        findUniqueOrThrow: async (args: any) => {
          const row = await client.user.findUnique(args);
          if (!row) throw new Error("not found");
          return row;
        },
        count: async ({ where }: any) =>
          s.users.filter((u) => {
            if (where.id?.not && u.id === where.id.not) return false;
            if (where.status && u.status !== where.status) return false;
            // Only the access role counts (phase 5: roleId is NOT NULL, `role` is derived).
            return s.roles.find((r) => r.id === u.roleId)?.key === "admin";
          }).length,
        update: async ({ where, data }: any) => {
          this.maybeFail("user.update");
          const u = s.users.find((x) => x.id === where.id)!;
          Object.assign(u, data);
          return { ...u };
        },
      },
      accessRole: {
        findUnique: async ({ where, include }: any) => {
          const r = s.roles.find((x) => (where.id ? x.id === where.id : x.key === where.key));
          return r ? this.hydrateRole(r, include) : null;
        },
        findMany: async ({ include }: any) => s.roles.map((r) => this.hydrateRole(r, include)),
        create: async ({ data }: any) => {
          const row = { id: `role_${data.key}`, createdAt: new Date(0), updatedAt: new Date(0), ...data };
          s.roles.push(row);
          return row;
        },
        update: async ({ where, data }: any) => {
          this.maybeFail("accessRole.update");
          const r = s.roles.find((x) => x.id === where.id)!;
          Object.assign(r, data);
          return { ...r };
        },
        delete: async ({ where }: any) => {
          this.maybeFail("accessRole.delete");
          s.roles = s.roles.filter((x) => x.id !== where.id);
          s.rolePerms = s.rolePerms.filter((rp) => rp.roleId !== where.id);
        },
      },
      actionToken: {
        updateMany: async () => ({ count: 0 }),
      },
      rolePermission: {
        createMany: async ({ data }: any) => {
          for (const d of data) if (!s.rolePerms.some((rp) => rp.roleId === d.roleId && rp.permissionKey === d.permissionKey)) s.rolePerms.push({ roleId: d.roleId, permissionKey: d.permissionKey });
          return { count: data.length };
        },
        deleteMany: async ({ where }: any) => {
          const keep = s.rolePerms.filter((rp) => !(rp.roleId === where.roleId && !where.permissionKey.notIn.includes(rp.permissionKey)));
          const count = s.rolePerms.length - keep.length;
          s.rolePerms = keep;
          return { count };
        },
      },
      userPermission: {
        upsert: async ({ where, update, create }: any) => {
          const existing = s.overrides.find((o) => o.userId === where.userId_permissionKey.userId && o.permissionKey === where.userId_permissionKey.permissionKey);
          if (existing) Object.assign(existing, update);
          else s.overrides.push({ id: `ov_${++seq}`, expiresAt: null, ...create });
        },
        deleteMany: async ({ where }: any) => {
          s.overrides = s.overrides.filter((o) => !(o.userId === where.userId && o.permissionKey === where.permissionKey));
        },
      },
      refreshToken: {
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const t of s.tokens) {
            const byUser = where.userId ? t.userId === where.userId : s.users.some((u) => u.id === t.userId && u.roleId === where.user.roleId);
            if (byUser && t.revokedAt === null) {
              Object.assign(t, data);
              count++;
            }
          }
          return { count };
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          this.maybeFail("auditLog.create");
          s.audit.push(data);
          return data;
        },
      },
      permission: {
        findMany: async () => s.permissions.map((p) => ({ key: p.key })),
        upsert: async ({ where, update, create }: any) => {
          const existing = s.permissions.find((p) => p.key === where.key);
          if (existing) Object.assign(existing, update);
          else s.permissions.push({ ...create });
        },
      },
      $transaction: async (fn: (tx: any) => Promise<unknown>) => {
        const snapshot = structuredClone(this.state);
        try {
          return await fn(client);
        } catch (err) {
          this.state = snapshot;
          throw err;
        }
      },
    };
    return client;
  }
}

function build(state: Partial<State>) {
  const db = new FakeDb(state);
  const client = db.client();
  // The fake's state object can be swapped on rollback, so read through the db each time.
  const proxy = new Proxy(client, { get: (_t, prop) => db.client()[prop as string] });
  const service = new RbacService(proxy as PrismaService, new AuditService(proxy as PrismaService));
  return { service, db };
}

const roles = [
  { id: "role_admin", key: "admin", legacyRole: "ADMIN", isSystem: true },
  { id: "role_staff", key: "staff", legacyRole: "STAFF", isSystem: true },
  { id: "role_customer", key: "customer", legacyRole: "CUSTOMER", isSystem: true },
  { id: "role_fulfillment", key: "fulfillment", legacyRole: "STAFF", isSystem: false },
  { id: "role_support", key: "support", legacyRole: "STAFF", isSystem: false },
];
const rolePerms = [
  ...SYSTEM_ROLE_DEFAULTS.staff.map((permissionKey) => ({ roleId: "role_staff", permissionKey })),
  ...TEMPLATE_ROLE_DEFAULTS.find((t) => t.key === "fulfillment")!.permissions.map((permissionKey) => ({ roleId: "role_fulfillment", permissionKey })),
  ...TEMPLATE_ROLE_DEFAULTS.find((t) => t.key === "support")!.permissions.map((permissionKey) => ({ roleId: "role_support", permissionKey })),
];
const users = () => [
  { id: "admin", email: "a@test.com", role: "ADMIN", status: "ACTIVE", roleId: "role_admin" },
  { id: "admin2", email: "a2@test.com", role: "ADMIN", status: "ACTIVE", roleId: "role_admin" },
  { id: "lead", email: "lead@test.com", role: "STAFF", status: "ACTIVE", roleId: "role_staff" },
  { id: "picker", email: "p@test.com", role: "STAFF", status: "ACTIVE", roleId: "role_fulfillment" },
  { id: "cust", email: "c@test.com", role: "CUSTOMER", status: "ACTIVE", roleId: "role_customer" },
];
const tokens = () => [
  { id: "t1", userId: "picker", revokedAt: null },
  { id: "t2", userId: "picker", revokedAt: null },
  { id: "t3", userId: "lead", revokedAt: null },
];

const wildcard = { id: "admin", permissions: ADMIN_WILDCARD as EffectivePermissions };
const holder = (id: string, ...perms: PermissionKey[]) => ({ id, permissions: new Set(perms) as EffectivePermissions });

describe("RbacService.assertCanGrant (grant ceiling)", () => {
  const { service } = build({});

  it("lets an actor grant what they hold and refuses what they do not", () => {
    expect(() => service.assertCanGrant(holder("lead", "orders:read", "orders:hold"), ["orders:read"])).not.toThrow();
    try {
      service.assertCanGrant(holder("lead", "orders:read"), ["orders:read", "orders:cancel"]);
      throw new Error("should not reach here");
    } catch (err) {
      expect((err as ForbiddenException).getResponse()).toMatchObject({ code: "GRANT_CEILING", required: ["orders:cancel"] });
    }
  });

  it("needs rbac:manage to grant an elevated permission, even one the actor holds", () => {
    expect(() => service.assertCanGrant(holder("lead", "payments:mark_paid"), ["payments:mark_paid"])).toThrow(ForbiddenException);
    expect(() => service.assertCanGrant(holder("lead", "payments:mark_paid", "rbac:manage"), ["payments:mark_paid"])).not.toThrow();
  });

  it("never limits the admin wildcard", () => {
    expect(() => service.assertCanGrant(wildcard, [...PERMISSION_KEYS])).not.toThrow();
  });
});

describe("RbacService.assignRole", () => {
  it("syncs User.role, revokes every refresh token and audits before/after in one transaction", async () => {
    const { service, db } = build({ roles, rolePerms, users: users(), tokens: tokens() });
    const result = await service.assignRole(wildcard, "picker", "role_support", "203.0.113.5");

    expect(result.roleKey).toBe("support");
    expect(result.permissions).toContain("customers:reset_password");
    const picker = db.state.users.find((u) => u.id === "picker")!;
    expect(picker).toMatchObject({ roleId: "role_support", role: "STAFF" });
    expect(db.state.tokens.filter((t) => t.userId === "picker").every((t) => t.revokedAt instanceof Date)).toBe(true);
    expect(db.state.tokens.find((t) => t.id === "t3")!.revokedAt).toBeNull();
    expect(db.state.audit).toHaveLength(1);
    expect(db.state.audit[0]).toMatchObject({ actorId: "admin", action: "rbac.user.role.assign", entityType: "user", entityId: "picker", ip: "203.0.113.5" });
    const diff = db.state.audit[0]!.diff as { from: { roleKey: string; permissions: string[] }; to: { roleKey: string; permissions: string[] } };
    expect(diff.from.roleKey).toBe("fulfillment");
    expect(diff.from.permissions).toContain("orders:tracking");
    expect(diff.to.roleKey).toBe("support");
    expect(diff.to.permissions).toContain("customers:reset_password");
  });

  it("writes nothing when the audit row fails (same transaction)", async () => {
    const { service, db } = build({ roles, rolePerms, users: users(), tokens: tokens() });
    db.failOn = "auditLog.create";
    await expect(service.assignRole(wildcard, "picker", "role_support")).rejects.toThrow(/injected failure/);
    expect(db.state.users.find((u) => u.id === "picker")!.roleId).toBe("role_fulfillment");
    expect(db.state.tokens.find((t) => t.id === "t1")!.revokedAt).toBeNull();
    expect(db.state.audit).toEqual([]);
  });

  it("applies the grant ceiling to the new role's permission set", async () => {
    const { service, db } = build({ roles, rolePerms, users: users() });
    // The default staff role cannot hand out Support (it holds customers:reset_password, rewards:adjust).
    const lead = holder("lead", ...SYSTEM_ROLE_DEFAULTS.staff, "users:update");
    await expect(service.assignRole(lead, "picker", "role_support")).rejects.toMatchObject({ response: { code: "GRANT_CEILING" } });
    // Fulfillment is a strict subset of what the lead holds.
    await expect(service.assignRole(lead, "picker", "role_fulfillment")).resolves.toMatchObject({ roleKey: "fulfillment" });
    expect(db.state.audit).toHaveLength(1);
  });

  it("refuses the admin role without rbac:manage, and refuses self-modification", async () => {
    const { service } = build({ roles, rolePerms, users: users() });
    await expect(service.assignRole(holder("lead", ...PERMISSION_KEYS.filter((k) => k !== "rbac:manage")), "picker", "role_admin")).rejects.toMatchObject({
      response: { code: "FORBIDDEN_PERMISSION", required: ["rbac:manage"] },
    });
    await expect(service.assignRole(wildcard, "admin", "role_staff")).rejects.toMatchObject({ response: { code: "SELF_MODIFICATION" } });
  });

  it("locks the last active admin: demotion is refused with 409 LAST_ADMIN", async () => {
    const { service, db } = build({ roles, rolePerms, users: users().filter((u) => u.id !== "admin2") });
    const other = { id: "lead", permissions: ADMIN_WILDCARD as EffectivePermissions }; // a non-admin row wielding the wildcard, to isolate the rule
    await expect(service.assignRole(other, "admin", "role_staff")).rejects.toThrow(ConflictException);
    expect(db.state.users.find((u) => u.id === "admin")!.roleId).toBe("role_admin");
    expect(db.state.audit).toEqual([]);

    const twoAdmins = build({ roles, rolePerms, users: users() });
    await expect(twoAdmins.service.assignRole({ id: "admin2", permissions: ADMIN_WILDCARD }, "admin", "role_staff")).resolves.toMatchObject({ roleKey: "staff" });
  });

  it("ignores the legacy enum for the lock: a stale role=ADMIN row with a non-admin access role is not an admin", async () => {
    // Phase 5: roleId is NOT NULL and `role` is derived, so only the access role counts.
    const { service } = build({
      roles,
      rolePerms,
      users: [...users().filter((u) => u.id !== "admin2"), { id: "stale", email: "s@test.com", role: "ADMIN", status: "ACTIVE", roleId: "role_staff" }],
    });
    await expect(service.assignRole({ id: "stale", permissions: ADMIN_WILDCARD }, "admin", "role_staff")).rejects.toThrow(ConflictException);
  });
});

describe("RbacService overrides and role permission sets", () => {
  it("setOverride upserts, revokes sessions and audits the before/after effective lists", async () => {
    const { service, db } = build({ roles, rolePerms, users: users(), tokens: tokens() });
    const result = await service.setOverride(wildcard, "picker", { permissionKey: "payments:mark_paid", effect: "ALLOW", reason: "Covers Fridays" });
    expect(result.permissions).toContain("payments:mark_paid");
    expect(db.state.overrides).toHaveLength(1);
    expect(db.state.tokens.find((t) => t.id === "t1")!.revokedAt).not.toBeNull();
    expect(db.state.audit[0]).toMatchObject({ action: "rbac.user.permission.set", entityId: "picker" });

    const cleared = await service.clearOverride(wildcard, "picker", "payments:mark_paid");
    expect(cleared.permissions).not.toContain("payments:mark_paid");
    expect(db.state.overrides).toEqual([]);
    expect(db.state.audit[1]).toMatchObject({ action: "rbac.user.permission.clear" });
  });

  it("applies the ceiling to ALLOW overrides, refuses self and admin targets", async () => {
    const { service } = build({ roles, rolePerms, users: users() });
    await expect(service.setOverride(holder("lead", "orders:read"), "picker", { permissionKey: "orders:cancel", effect: "ALLOW" })).rejects.toMatchObject({
      response: { code: "GRANT_CEILING" },
    });
    await expect(service.setOverride(wildcard, "admin", { permissionKey: "orders:read", effect: "DENY" })).rejects.toMatchObject({ response: { code: "SELF_MODIFICATION" } });
    await expect(service.setOverride(wildcard, "admin2", { permissionKey: "rbac:manage", effect: "DENY" })).rejects.toMatchObject({ response: { code: "ROLE_IMMUTABLE" } });
  });

  it("setRolePermissions replaces the set, keeps admin/customer immutable and ends members' sessions", async () => {
    const { service, db } = build({ roles, rolePerms, users: users(), tokens: tokens() });
    await expect(service.setRolePermissions(wildcard, "role_admin", ["orders:read"])).rejects.toMatchObject({ response: { code: "ROLE_IMMUTABLE" } });
    await expect(service.setRolePermissions(wildcard, "role_customer", ["orders:read"])).rejects.toMatchObject({ response: { code: "ROLE_IMMUTABLE" } });

    const result = await service.setRolePermissions(wildcard, "role_fulfillment", ["orders:read", "orders:tracking"]);
    expect(result.permissions).toEqual(["orders:read", "orders:tracking"]);
    expect(db.state.rolePerms.filter((rp) => rp.roleId === "role_fulfillment").map((rp) => rp.permissionKey).sort()).toEqual(["orders:read", "orders:tracking"]);
    expect(db.state.tokens.find((t) => t.id === "t1")!.revokedAt).not.toBeNull(); // picker is a member
    expect(db.state.tokens.find((t) => t.id === "t3")!.revokedAt).toBeNull(); // lead is not
    expect(db.state.audit[0]!.diff).toMatchObject({ roleKey: "fulfillment", permissions: { to: ["orders:read", "orders:tracking"] } });
  });

  it("only applies the ceiling to additions, so narrowing a role never needs extra rights", async () => {
    const { service } = build({ roles, rolePerms, users: users() });
    const lead = holder("lead", "orders:read", "rbac:read");
    await expect(service.setRolePermissions(lead, "role_fulfillment", ["orders:read"])).resolves.toEqual({ permissions: ["orders:read"] });
    await expect(service.setRolePermissions(lead, "role_fulfillment", ["orders:read", "orders:cancel"])).rejects.toMatchObject({ response: { code: "GRANT_CEILING" } });
  });
});

describe("RbacService roles API (plan §5.2 /admin/roles*)", () => {
  it("lists roles with sorted permission keys, member counts and the immutable flag", async () => {
    const { service } = build({ roles, rolePerms, users: users() });
    const list = await service.listRoles();
    const byKey = Object.fromEntries(list.map((r) => [r.key, r]));
    expect(byKey.admin).toMatchObject({ immutable: true, isSystem: true, permissions: [], memberCount: 2 });
    expect(byKey.customer).toMatchObject({ immutable: true, memberCount: 1 });
    expect(byKey.fulfillment).toMatchObject({ immutable: false, isSystem: false, memberCount: 1 });
    expect(byKey.fulfillment!.permissions).toEqual([...TEMPLATE_ROLE_DEFAULTS.find((t) => t.key === "fulfillment")!.permissions].sort());
    await expect(service.getRole("nope")).rejects.toMatchObject({ response: { code: "ROLE_NOT_FOUND" } });
  });

  it("createRole applies the grant ceiling, refuses duplicate keys and audits the initial set", async () => {
    const { service, db } = build({ roles, rolePerms, users: users() });
    await expect(
      service.createRole(holder("lead", "orders:read", "rbac:manage"), { key: "night_shift", name: "Night shift", legacyRole: "STAFF", permissions: ["orders:read", "orders:cancel"] }),
    ).rejects.toMatchObject({ response: { code: "GRANT_CEILING", required: ["orders:cancel"] } });
    expect(db.state.roles.some((r) => r.key === "night_shift")).toBe(false);

    const created = await service.createRole(wildcard, { key: "Night_Shift ", name: " Night shift ", description: "", legacyRole: "STAFF", permissions: ["orders:read", "orders:read", "orders:note"] }, "203.0.113.1");
    expect(created).toMatchObject({ key: "night_shift", name: "Night shift", description: null, legacyRole: "STAFF", isSystem: false, immutable: false, permissions: ["orders:note", "orders:read"], memberCount: 0 });
    expect(db.state.audit.at(-1)).toMatchObject({ action: "rbac.role.create", entityType: "access_role", entityId: created.id, ip: "203.0.113.1", diff: { permissions: { from: [], to: ["orders:note", "orders:read"] } } });

    await expect(service.createRole(wildcard, { key: "night_shift", name: "Dup", legacyRole: "STAFF", permissions: [] })).rejects.toMatchObject({ response: { code: "ROLE_KEY_TAKEN" } });
  });

  it("updateRole changes name/description for custom and editable system roles only, with a field diff", async () => {
    const { service, db } = build({ roles, rolePerms, users: users() });
    await expect(service.updateRole(wildcard, "role_admin", { name: "Root" })).rejects.toMatchObject({ response: { code: "ROLE_IMMUTABLE" } });
    await expect(service.updateRole(wildcard, "role_customer", { name: "Shopper" })).rejects.toMatchObject({ response: { code: "ROLE_IMMUTABLE" } });

    const updated = await service.updateRole(wildcard, "role_fulfillment", { name: "Warehouse", description: "  Picks and ships  " });
    expect(updated).toMatchObject({ name: "Warehouse", description: "Picks and ships" });
    expect(db.state.audit.at(-1)).toMatchObject({ action: "rbac.role.update", diff: { roleKey: "fulfillment", name: { from: "fulfillment", to: "Warehouse" } } });
    // The default staff role is a system role but its metadata is editable.
    await expect(service.updateRole(wildcard, "role_staff", { description: "Default employee" })).resolves.toMatchObject({ description: "Default employee" });
  });

  it("deleteRole refuses system roles and roles with members, and otherwise removes the role in one transaction", async () => {
    const { service, db } = build({ roles, rolePerms, users: users() });
    await expect(service.deleteRole(wildcard, "role_staff")).rejects.toMatchObject({ response: { code: "ROLE_IMMUTABLE" } });
    await expect(service.deleteRole(wildcard, "role_fulfillment")).rejects.toMatchObject({ response: { code: "ROLE_IN_USE" } });
    expect(db.state.roles.some((r) => r.key === "fulfillment")).toBe(true);

    await expect(service.deleteRole(wildcard, "role_support", "203.0.113.2")).resolves.toEqual({ deleted: true });
    expect(db.state.roles.some((r) => r.key === "support")).toBe(false);
    expect(db.state.rolePerms.some((rp) => rp.roleId === "role_support")).toBe(false);
    expect(db.state.audit.at(-1)).toMatchObject({ action: "rbac.role.delete", entityId: "role_support", diff: { permissions: { to: [] } } });

    db.failOn = "auditLog.create";
    const { service: failing, db: failingDb } = build({ roles, rolePerms, users: users().filter((u) => u.id !== "picker") });
    failingDb.failOn = "auditLog.create";
    await expect(failing.deleteRole(wildcard, "role_fulfillment")).rejects.toThrow(/injected failure/);
    expect(failingDb.state.roles.some((r) => r.key === "fulfillment")).toBe(true);
  });

  it("userPermissions breaks a user's effective set down into role, overrides and result", async () => {
    const { service, db } = build({ roles, rolePerms, users: users() });
    db.state.overrides.push({ id: "ov_x", userId: "picker", permissionKey: "payments:mark_paid", effect: "ALLOW", reason: "Fridays", grantedBy: "admin", expiresAt: null, createdAt: new Date("2026-09-01T00:00:00Z") });
    db.state.overrides.push({ id: "ov_y", userId: "picker", permissionKey: "orders:tracking", effect: "DENY", reason: null, grantedBy: "admin", expiresAt: null, createdAt: new Date("2026-09-02T00:00:00Z") });
    const breakdown = await service.userPermissions("picker");
    expect(breakdown.roleKey).toBe("fulfillment");
    expect(breakdown.rolePermissions).toContain("orders:tracking");
    expect(breakdown.overrides).toEqual([
      { permissionKey: "payments:mark_paid", effect: "ALLOW", reason: "Fridays", grantedBy: "admin", expiresAt: null, createdAt: "2026-09-01T00:00:00.000Z" },
      { permissionKey: "orders:tracking", effect: "DENY", reason: null, grantedBy: "admin", expiresAt: null, createdAt: "2026-09-02T00:00:00.000Z" },
    ]);
    expect(breakdown.effective).toContain("payments:mark_paid");
    expect(breakdown.effective).not.toContain("orders:tracking");
    await expect(service.userPermissions("ghost")).rejects.toMatchObject({ response: { code: "NOT_FOUND" } });
  });
});

describe("RbacService.assertMayResetPassword (plan §3.6 rule 5)", () => {
  const { service } = build({});
  const customer = { id: "c", role: "CUSTOMER", accessRole: { key: "customer" } };
  const staff = { id: "s", role: "STAFF", accessRole: { key: "fulfillment" } };
  const admin = { id: "a", role: "ADMIN", accessRole: { key: "admin" } };

  it("maps the target kind to the permission family", () => {
    expect(() => service.assertMayResetPassword(holder("x", "customers:reset_password"), customer)).not.toThrow();
    expect(() => service.assertMayResetPassword(holder("x", "customers:reset_password"), staff)).toThrow(ForbiddenException);
    expect(() => service.assertMayResetPassword(holder("x", "users:reset_password"), staff)).not.toThrow();
    expect(() => service.assertMayResetPassword(holder("x", "users:reset_password"), customer)).toThrow(ForbiddenException);
  });

  it("keeps other admins CLI-only but allows self", () => {
    expect(() => service.assertMayResetPassword(wildcard, admin)).toThrow(/reset-password script/);
    expect(() => service.assertMayResetPassword({ id: "a", permissions: ADMIN_WILDCARD }, admin)).not.toThrow();
  });
});

describe("syncRbacCatalog", () => {
  it("creates the catalog and roles on an empty database and is idempotent", async () => {
    const db = new FakeDb({});
    const first = await syncRbacCatalog(db.client());
    expect(first.newPermissionKeys).toHaveLength(PERMISSIONS.length);
    expect(first.createdRoles.sort()).toEqual(["admin", "catalog_manager", "content_editor", "customer", "fulfillment", "staff", "support"]);
    expect(db.state.rolePerms.filter((rp) => rp.roleId === "role_staff").map((rp) => rp.permissionKey).sort()).toEqual([...SYSTEM_ROLE_DEFAULTS.staff].sort());
    expect(db.state.rolePerms.filter((rp) => rp.roleId === "role_admin")).toEqual([]);

    const second = await syncRbacCatalog(db.client());
    expect(second).toEqual({ newPermissionKeys: [], createdRoles: [] });
    expect(db.state.permissions).toHaveLength(PERMISSIONS.length);
  });

  it("never re-adds a default an admin pruned from a system role, but adds keys new to the catalog", async () => {
    const db = new FakeDb({});
    await syncRbacCatalog(db.client());
    db.state.rolePerms = db.state.rolePerms.filter((rp) => !(rp.roleId === "role_staff" && rp.permissionKey === "orders:cancel"));
    // Simulate a catalog key that did not exist at the last sync.
    db.state.permissions = db.state.permissions.filter((p) => p.key !== "orders:note");
    db.state.rolePerms = db.state.rolePerms.filter((rp) => rp.permissionKey !== "orders:note");

    const result = await syncRbacCatalog(db.client());
    expect(result.newPermissionKeys).toEqual(["orders:note"]);
    const staff = db.state.rolePerms.filter((rp) => rp.roleId === "role_staff").map((rp) => rp.permissionKey);
    expect(staff).toContain("orders:note");
    expect(staff).not.toContain("orders:cancel");
  });
});
