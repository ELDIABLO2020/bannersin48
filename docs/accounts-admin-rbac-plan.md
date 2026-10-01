# Customer account, admin panel and RBAC — implementation plan

*Planning document, 2026-09-30. No feature code has been written. Paths are relative to the repo
root. Where this plan and [architecture.md](architecture.md) / [api.md](api.md) disagree after
implementation, update those two files; they are the living references.*

## 1. Executive summary

Three features, in dependency order:

1. **RBAC (role + permission model).** Keep the existing `Role` enum (`CUSTOMER`, `STAFF`,
   `ADMIN`, `CONTENT_EDITOR`) as a coarse, backward-compatible *kind*, and layer a data-driven
   permission system under it: a code-defined permission catalog (`resource:action` strings),
   roles as database rows that carry permission sets, one primary role per user, and per-user
   allow/deny overrides. Enforcement is a new backend `PermissionsGuard` fed by a
   `@RequirePermissions()` decorator; the server resolves `role permissions ∪ allows − denies` on
   every request (the guard already re-reads the user row today). The frontend gets the effective
   permission list in `/auth/me` and gates menus, routes and buttons with a `useCan()` hook —
   cosmetic only.
2. **Admin panel.** Extend the existing staff area (`frontend/app/admin/*`,
   `backend/src/admin/*`) with: staff-account management (create, invite, suspend, reactivate,
   role + override assignment), a roles & permissions screen, an audit-log viewer, reward
   adjustments, promo-code management, order notes, and customer suspend. Every existing admin
   route moves from `@Roles(...)` to `@RequirePermissions(...)`.
3. **Customer account page.** Turn the current `/dashboard` into a proper `/account` area:
   profile, address book, order history + tracking, saved designs (the `SavedDesign` model exists
   but has no code), artwork library, reward balance + ledger, password/email/sessions, and
   settings.

**Chosen RBAC approach: role + permission (RBAC1 with per-user overrides), not pure RBAC and not
ABAC.** Rationale:

- Pure RBAC (what exists today) cannot express "fulfillment employee who may also edit the promo
  strip" without inventing a new enum value and a deploy for every combination.
- ABAC/policy engines (OPA, Casbin, Cerbos) add a runtime, a policy language and an operational
  surface that a 2 vCPU VPS and a four-person operations team do not need. The only attribute-style
  rule in the product today is *ownership* (customers see their own orders, addresses and
  artwork), and that is already enforced by `userId` scoping in services. It stays there.
- Role + permission is what Shopify staff permissions, Stripe team roles and WooCommerce
  capabilities all do. It is auditable (a diff of two string lists), explainable in a UI, and
  cheap to resolve (two indexed queries per request, or one `include`).
- The existing `Role` enum keeps working throughout, so the migration can ship in slices behind
  tests rather than as a big-bang rewrite.

## 2. Current-state findings

### 2.1 Authentication and sessions

| Concern | Today | Source |
|---|---|---|
| Credentials | Email + password, bcryptjs cost 10, timing-equalised compare | `backend/src/auth/password.ts`, `backend/src/auth/auth.service.ts` |
| Access token | HS256 JWT, 15 min, payload `sub` only, `iss`/`aud` pinned | `backend/src/auth/auth.module.ts` (`ACCESS_TOKEN_TTL`, `jwtOptions`) |
| Refresh token | Opaque 48-byte hex, sha256-hashed in `refresh_token`, 30 days, rotated on use, revoked on logout/reset | `auth.service.ts` (`issueTokens`, `refresh`, `logout`) |
| Password reset | Hashed 256-bit token, 1 h, single use; `forgot-password` always 200; token only goes to `EmailService` (which logs a fingerprint, delivers nothing) | `auth.service.ts` (`forgotPassword`, `resetPassword`); `backend/src/notifications/email.service.ts` |
| Operator reset | CLI over SSH, writes `audit_log` with `actorId: null`, `diff.actor = "system:cli"` | `backend/src/cli/reset-password.ts` |
| Login backoff | In-memory IP+email exponential backoff; auth routes share a 10/min bucket | `backend/src/auth/login-backoff.ts`, `backend/src/common/throttling.ts` |
| Missing | change-password, change-email, email verification, session list/revoke, MFA | `docs/backend-plan.md` items 16–18 (planned, not built) |

### 2.2 Authorization

- `backend/src/common/jwt-auth.guard.ts` is a global `APP_GUARD`. It verifies the JWT, **re-reads
  the user row on every request**, rejects non-`ACTIVE` users, and attaches
  `request.user = { id, email, role }` (`AuthedUser`). This is the hook point for permission
  resolution: no JWT change is needed and permission changes apply immediately, exactly as role
  changes do today.
- `backend/src/common/roles.guard.ts` + `roles.decorator.ts`: `@Roles("STAFF", "ADMIN")` on
  controllers/handlers. **`ADMIN` bypasses every check**, and **a route with no `@Roles` metadata
  is open to any authenticated user** (`roles.guard.spec.ts`, "is open when no @Roles metadata is
  present"). Safe today only because every admin controller carries a class-level `@Roles`.
- Guard order in `backend/src/app.module.ts`: `ThrottlerGuard` → `JwtAuthGuard` → `RolesGuard`.
- Role is a single enum column, `User.role` (`backend/prisma/schema.prisma`, `enum Role`,
  `model User`). `User.status` is `ACTIVE | SUSPENDED` but **no endpoint sets it**; suspension is a
  manual DB edit.
- Hard-coded role logic outside the guard (all of these conflict with a data-driven model and are
  listed again in §9):
  - `backend/src/admin/customers-admin.service.ts` `assertMayReset()` — STAFF may reset CUSTOMER;
    ADMIN may reset STAFF/CONTENT_EDITOR/self; never another ADMIN.
  - `backend/src/artwork/artwork.service.ts` `ARTWORK_READER_ROLES = {STAFF, ADMIN}`.
  - `backend/src/admin/pricing-admin.controller.ts` — class `@Roles("STAFF","ADMIN")`, mutations
    `@Roles("ADMIN")`.
  - `backend/src/admin/content-customers.controller.ts` — per-handler `@Roles` mixing
    `CONTENT_EDITOR` and `STAFF`.
  - `backend/src/admin/admin-orders.controller.ts` — class `@Roles("STAFF","ADMIN")`.
- `backend/src/app.security.spec.ts` boots the real `AppModule` and pins the exact list of
  `@Public()` routes (`EXPECTED_PUBLIC`). Any new public route (invite accept, email verify) must
  be added there or CI fails — a useful property to keep.

### 2.3 Audit

- `backend/src/audit/audit.service.ts`: `record(entry, tx?)` appends to `audit_log`
  (`actorId`, `action`, `entityType`, `entityId`, `diff`, `ip`); `AuditService.diffOf()` builds
  shallow old→new diffs. Convention for `action` is `entity.verb` (`order.mark_paid`,
  `product_material.update`, `site_content.delete`, `customer.admin_password_reset`).
- Audit rows are written **inside the mutation's transaction** for orders (`admin-orders.service.ts`)
  and after the write for pricing/content. The RBAC work should use the in-transaction form.
- **There is no read endpoint for `audit_log`.** Indexes exist on `actorId`, `(entityType,
  entityId)`, `createdAt`; the security review (§6) recommends composite `(entityType, entityId,
  createdAt DESC)` and `(actorId, createdAt DESC)`.

### 2.4 Admin surface

| Area | Backend | Frontend |
|---|---|---|
| Order board + fulfillment (buckets, list, detail, mark-paid, dropship, tracking, status) | `backend/src/admin/admin-orders.controller.ts`, `admin-orders.service.ts`; status machine in `backend/src/orders/status-machine.ts` | `frontend/app/admin/page.tsx`, `frontend/app/admin/orders/[id]/page.tsx` |
| Pricing/catalog (products, materials, finishing options, volume tiers) | `pricing-admin.controller.ts`, `pricing-admin.service.ts`, `pricing-admin.dto.ts` | `frontend/app/admin/pricing/page.tsx` (`canEdit = role === "ADMIN"`) |
| CMS blocks | `content-customers.controller.ts`, `content-admin.service.ts` | `frontend/app/admin/content/page.tsx` |
| Customers (search, detail, admin password reset) | `content-customers.controller.ts`, `customers-admin.service.ts` | `frontend/app/admin/customers/page.tsx`, `customers/[id]/page.tsx` |
| Shell + sign-in + nav gating | — | `frontend/app/admin/layout.tsx` (`STAFF_ROLES`, `NAV[].roles`) |
| API client | — | `packages/api-client/src/admin.ts` (`AdminApiClient`), `frontend/lib/api/adminClient.ts` |

Notes: `GET /admin/customers` returns **every user including staff** (the "Filter by role" select on
the customers page is client-side). `AuditLog`, `PromoCode`, `RewardLedger.ADJUSTMENT`, `SavedDesign`
and `User.status` are modelled but have no endpoints.

### 2.5 Customer surface

- Backend: `backend/src/users/users.controller.ts` (`GET/PATCH /users/me`, address CRUD under
  `/users/me/addresses`), `backend/src/orders/orders.controller.ts` (list, detail, reorder,
  cancel), `backend/src/artwork/artwork.controller.ts` (upload, folders, library, signed links).
  `backend/src/common/user.serializer.ts` defines the wire shape (`SerializedUser`; `taxExempt`
  hard-coded `false`; `role` optional).
- Frontend: `frontend/app/(storefront)/dashboard/page.tsx` is the de-facto account page (name,
  email, points, last five orders, log out). `/orders` and `/orders/[id]` exist. **There is no
  profile-edit, address-book, rewards-ledger, saved-design or security UI.** Sign-in pages live in
  the `(account)` route group (`frontend/app/(account)/*`), whose quiet layout is a good shell for
  the account area too.
- Session state: `frontend/lib/stores/auth.ts` (zustand `persist`, key `bi48.auth`, token also in
  `localStorage["bi48.token"]`). **The frontend never calls `GET /auth/me`** (`ApiClient.me()` has
  zero call sites), so the persisted `user` — including `role` — is only refreshed at login. A role
  change or suspension takes effect server-side at once but the UI keeps showing stale state until
  the next sign-in. The refresh token is issued but discarded (`apiClient.ts` `login()` return type
  omits it; security review M1).
- `frontend/middleware.ts` only sets `X-Robots-Tag`; there is no server-side route gating, and the
  admin gate is a client component. That is acceptable (server enforces every API call) and stays.
- `packages/shared/src/user.ts` `userSchema` is `.strict()` with `role` as an optional enum. It is
  used for types only (no runtime `parse` call sites), so adding fields is safe, but the schema must
  be updated or the type will not carry `permissions`.
- MSW: `packages/api-client/src/mocks/handlers.ts` mocks auth and orders but **not** `/users/me`,
  addresses or any `/admin/*` route. e2e seeds a demo customer without `role`
  (`frontend/e2e/helpers/auth.ts`).

### 2.6 Data model (relevant parts of `backend/prisma/schema.prisma`)

`User` (role enum, status enum, `rewardPointsBalance` denormalised), `RefreshToken`,
`PasswordReset` (`requestedBy` for admin-initiated), `Address`, `AuditLog`, `RewardLedger`
(`deltaCents`, `reason ORDER_EARN|ADJUSTMENT|REDEMPTION`, `createdBy`), `SavedDesign`
(`name`, `productId`, `config` JSON, `artworkFileId`), `ArtworkFolder`/`ArtworkFile`, `PromoCode`,
`Order`/`OrderItem`/`OrderEvent`/`Shipment`, `SiteContent`. Migrations are forward-only and run as
the `bannersin48_migrate` owner role (`deploy/scripts/deploy.sh`); the API connects as
`bannersin48_app` (DML + sequences only), so **catalog seeding must be DML, never DDL at runtime**.

### 2.7 Overlap with the existing backend plan

`docs/backend-plan.md` already schedules: item 16 session redesign (httpOnly refresh cookie), 17
argon2id + change-password + email verification, 18 TOTP MFA for staff roles, 19 *admin
suspend/role endpoints (audited)*. This plan **absorbs item 19 entirely** and **delivers the
change-password / email-verification halves of item 17** as part of the customer account feature.
Items 16 and 18 remain separate; §10 notes where they touch this work.

## 3. RBAC design

### 3.1 Concepts

| Term | Definition |
|---|---|
| Permission | A string `resource:action` from a code-defined catalog (§3.2). Never user-defined. |
| Role | A named, database-stored set of permissions. Four **system roles** are seeded from the enum (`customer`, `staff`, `content_editor`, `admin`) and cannot be deleted. Admins create **custom roles** (`fulfillment`, `support`, …). |
| Kind (`User.role`, existing enum) | Coarse classification kept for compatibility: `CUSTOMER` (storefront account), `STAFF` (any employee role without full admin), `CONTENT_EDITOR`, `ADMIN` (the wildcard system role). Each `AccessRole` row declares which enum value it maps to; the service keeps `User.role` in sync whenever `User.roleId` changes. Treated as derived and read-only outside `RbacService`. |
| Override | A per-user `ALLOW` or `DENY` on one permission, optionally expiring, with a reason. |
| Effective permissions | `role.permissions ∪ {ALLOW overrides} − {DENY overrides}`. The `admin` system role resolves to the wildcard `*` and ignores overrides. |
| Ownership | Not a permission. Customer self-service routes stay authenticated-and-scoped-by-`userId` exactly as today. |

Single primary role per user, not many-to-many. The union-based resolver is forward-compatible
with a `UserRole` join table if multi-role is ever needed (§11, Q1); overrides cover the realistic
"one person wears two hats" cases for a small team.

### 3.2 Permission catalog (starter)

The catalog lives in code (`backend/src/rbac/permissions.ts`, mirrored as types in
`packages/shared/src/permissions.ts`) and is upserted into the `permission` table at boot. Code is
the source of truth for *which permissions exist*; the database is the source of truth for *who
holds them*. `elevated = true` marks permissions that only a holder of `rbac:manage` may grant.

| Key | Grants | Elevated | Today's equivalent |
|---|---|---|---|
| `orders:read` | Order board, buckets, list, detail, customer's artwork previews on an order | | `@Roles("STAFF","ADMIN")` on `admin/orders` |
| `orders:update_status` | `POST /admin/orders/:id/status` for `IN_PROCESSING`, `ACCEPTED`, `SHIPPED`, `DELIVERED` | | same |
| `orders:hold` | Transition to/from `ON_HOLD` | | same |
| `orders:cancel` | Transition to `CANCELLED` (staff-initiated) | | same |
| `orders:dropship` | `POST /admin/orders/:id/dropship` | | same |
| `orders:tracking` | `POST /admin/orders/:id/tracking` (number + label PDF) | | same |
| `orders:note` | Add an internal activity note (new) | | — |
| `payments:mark_paid` | `POST /admin/orders/:id/mark-paid` | yes | STAFF, ADMIN |
| `payments:refund` | Reserved for a future provider; not wired in V1 | yes | — |
| `customers:read` | Search customers, view profile, addresses, order history | | STAFF, ADMIN |
| `customers:update` | Edit a customer's name/phone/addresses on their behalf (new) | | — |
| `customers:reset_password` | Admin-initiated reset for `CUSTOMER` accounts | | STAFF, ADMIN |
| `customers:suspend` | Suspend / reactivate a `CUSTOMER` account (new) | yes | — |
| `artwork:read_any` | Mint download links for any customer's artwork | | `ARTWORK_READER_ROLES` |
| `rewards:read` | View a customer's reward ledger | | (implicit in customer detail) |
| `rewards:adjust` | Manual ledger adjustment with reason (new) | yes | — |
| `catalog:read` | `GET /admin/products`, `/finishing-options`, `/volume-tiers` | | STAFF read |
| `catalog:write` | Create/update/deactivate products, materials, finishing options | yes | ADMIN |
| `pricing:write` | Change rates, flat prices, multipliers, volume tiers | yes | ADMIN |
| `promos:read` | List promo codes (new) | | — |
| `promos:write` | Create/update/deactivate promo codes (new) | yes | — |
| `content:read` | `GET /admin/content` | | CONTENT_EDITOR, ADMIN |
| `content:edit` | Upsert block payloads (`PUT /admin/content/:key`) | | same |
| `content:publish` | Toggle `published`, delete blocks | | same |
| `users:read` | List and view staff accounts (new) | | — |
| `users:create` | Create or invite a staff account (new) | yes | — |
| `users:update` | Edit a staff account's name/phone; assign a non-elevated role (new) | yes | — |
| `users:suspend` | Suspend / reactivate a staff account; revoke sessions (new) | yes | — |
| `users:reset_password` | Admin-initiated reset for staff accounts | yes | ADMIN only (`assertMayReset`) |
| `rbac:read` | View roles, their permissions and any user's effective permissions (new) | | — |
| `rbac:manage` | Create/edit/delete custom roles; set role permissions; grant elevated permissions and overrides; assign the `admin` role (new) | yes | ADMIN only |
| `audit:read` | `GET /admin/audit` (new) | yes | — |
| `settings:read` / `settings:write` | Reserved for future site settings (cutoff, shipping flat rate). Not wired in V1 | yes | — |

Thirty permissions, nine resources. Two explicit non-permissions: there is **no**
`customers:impersonate` (log-in-as) and **no** `users:delete`; accounts are suspended, never deleted
(mirrors "catalog rows are deactivated, never deleted" in architecture.md).

### 3.3 Default role → permission matrix

`✓` granted by default. System roles (`customer`, `staff`, `content_editor`, `admin`) are seeded and
their *permission sets are editable* by `rbac:manage` holders except `admin` (immutable wildcard)
and `customer` (immutable, empty). The three custom examples are seeded as *templates* (editable,
deletable).

| Permission | customer | staff | content_editor | admin | Fulfillment (custom) | Support (custom) | Catalog Manager (custom) |
|---|---|---|---|---|---|---|---|
| `orders:read` | | ✓ | | `*` | ✓ | ✓ | |
| `orders:update_status` | | ✓ | | `*` | ✓ | | |
| `orders:hold` | | ✓ | | `*` | ✓ | ✓ | |
| `orders:cancel` | | ✓ | | `*` | | ✓ | |
| `orders:dropship` | | ✓ | | `*` | ✓ | | |
| `orders:tracking` | | ✓ | | `*` | ✓ | | |
| `orders:note` | | ✓ | | `*` | ✓ | ✓ | |
| `payments:mark_paid` | | ✓ | | `*` | | | |
| `customers:read` | | ✓ | | `*` | ✓ | ✓ | |
| `customers:update` | | | | `*` | | ✓ | |
| `customers:reset_password` | | ✓ | | `*` | | ✓ | |
| `customers:suspend` | | | | `*` | | | |
| `artwork:read_any` | | ✓ | | `*` | ✓ | ✓ | |
| `rewards:read` | | ✓ | | `*` | | ✓ | |
| `rewards:adjust` | | | | `*` | | ✓ | |
| `catalog:read` | | ✓ | | `*` | | | ✓ |
| `catalog:write` | | | | `*` | | | ✓ |
| `pricing:write` | | | | `*` | | | ✓ |
| `promos:read` | | ✓ | | `*` | | ✓ | ✓ |
| `promos:write` | | | | `*` | | | ✓ |
| `content:read` | | | ✓ | `*` | | | |
| `content:edit` | | | ✓ | `*` | | | |
| `content:publish` | | | ✓ | `*` | | | |
| `users:read` | | | | `*` | | | |
| `users:create` / `update` / `suspend` / `reset_password` | | | | `*` | | | |
| `rbac:read` | | | | `*` | | | |
| `rbac:manage` | | | | `*` | | | |
| `audit:read` | | | | `*` | | | |

Design notes on separation of duties: the default `staff` role keeps today's reach (it must, for
backward compatibility), but the custom templates split *money* (`payments:mark_paid`, `rewards:adjust`,
`pricing:write`) from *fulfillment* and from *access control* (`users:*`, `rbac:*`). Nobody except
`admin` holds `rbac:manage` by default, and §3.6 prevents a `rbac:manage` holder from granting what
they do not hold.

### 3.4 Prisma schema changes

```prisma
// --- new enums ---------------------------------------------------------------
enum PermissionEffect { ALLOW DENY }
enum ActionTokenPurpose { STAFF_INVITE EMAIL_CHANGE EMAIL_VERIFY }

// UserStatus gains INVITED (account exists, no password yet; cannot sign in).
enum UserStatus { ACTIVE SUSPENDED INVITED }

// --- new models --------------------------------------------------------------
model AccessRole {
  id          String   @id @default(cuid())
  key         String   @unique            // "admin" | "staff" | "content_editor" | "customer" | custom slug
  name        String
  description String?
  legacyRole  Role                        // enum value written to User.role on assignment
  isSystem    Boolean  @default(false)    // seeded; cannot be deleted; admin/customer also immutable
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  permissions RolePermission[]
  users       User[]
  invites     ActionToken[]

  @@map("access_role")
}

model Permission {
  key         String  @id                 // "orders:read"
  resource    String                      // "orders"
  action      String                      // "read"
  description String
  elevated    Boolean @default(false)     // only rbac:manage holders may grant
  sort        Int     @default(0)

  roles      RolePermission[]
  userGrants UserPermission[]

  @@index([resource])
  @@map("permission")
}

model RolePermission {
  roleId        String
  permissionKey String
  createdAt     DateTime @default(now())
  createdBy     String?

  role       AccessRole @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionKey], references: [key], onDelete: Cascade)

  @@id([roleId, permissionKey])
  @@index([permissionKey])
  @@map("role_permission")
}

model UserPermission {
  id            String           @id @default(cuid())
  userId        String
  permissionKey String
  effect        PermissionEffect
  reason        String?
  grantedBy     String?
  expiresAt     DateTime?
  createdAt     DateTime         @default(now())

  user       User       @relation("UserPermissionUser", fields: [userId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionKey], references: [key], onDelete: Cascade)
  grantor    User?      @relation("UserPermissionGrantor", fields: [grantedBy], references: [id])

  @@unique([userId, permissionKey])
  @@index([userId])
  @@index([expiresAt])
  @@map("user_permission")
}

/// Single-use hashed tokens for staff invites, email change and email verification.
/// PasswordReset stays as-is (open question Q6: fold it in later).
model ActionToken {
  id          String             @id @default(cuid())
  userId      String
  purpose     ActionTokenPurpose
  tokenHash   String             @unique
  payload     Json?              // EMAIL_CHANGE: { newEmail }; STAFF_INVITE: { roleId }
  roleId      String?
  requestedBy String?            // null = self; user id = admin-initiated
  expiresAt   DateTime
  usedAt      DateTime?
  createdAt   DateTime           @default(now())

  user User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  role AccessRole? @relation(fields: [roleId], references: [id])

  @@index([userId, purpose])
  @@index([expiresAt])
  @@map("action_token")
}

// --- User additions ------------------------------------------------------------
model User {
  // existing fields unchanged; `role Role @default(CUSTOMER)` stays (derived, see §3.1)
  roleId               String?            // nullable through phase 1; NOT NULL in phase 5
  pendingEmail         String?            // set while an EMAIL_CHANGE token is outstanding
  mustChangePassword   Boolean  @default(false) // set when staff create an account with a temp password
  passwordChangedAt    DateTime?
  lastLoginAt          DateTime?
  suspendedAt          DateTime?
  suspendedReason      String?
  invitedBy            String?

  accessRole           AccessRole?       @relation(fields: [roleId], references: [id])
  permissionOverrides  UserPermission[]  @relation("UserPermissionUser")
  permissionsGranted   UserPermission[]  @relation("UserPermissionGrantor")
  actionTokens         ActionToken[]

  @@index([roleId])
}

// RefreshToken: add `lastUsedAt DateTime?` and `label String?` so the customer "sessions" page can show them.
```

Why a separate `AccessRole` model instead of renaming the enum: Prisma already uses `Role` as the
enum name, the enum is referenced in ~15 places across backend, shared and frontend, and keeping it
means every existing `@Roles` guard, serializer and e2e fixture works unchanged during the rollout.

### 3.5 Backend enforcement

New module `backend/src/rbac/`:

| File | Purpose |
|---|---|
| `permissions.ts` | `PERMISSIONS` as-const catalog (`key`, `resource`, `action`, `description`, `elevated`), `type PermissionKey`, `SYSTEM_ROLES` with default sets, `ADMIN_WILDCARD = "*"`. |
| `require-permissions.decorator.ts` | `@RequirePermissions(...keys)` (all must hold) and `@RequireAnyPermission(...keys)`; both `SetMetadata`. |
| `permissions.guard.ts` | Global `APP_GUARD` registered **after** `RolesGuard`. Reads metadata; if none, passes (customer routes). Otherwise requires `request.user.permissions` to satisfy it; `admin` wildcard passes everything. Throws `403 { code: "FORBIDDEN_PERMISSION", required: [...] }`. |
| `rbac.service.ts` | `resolveEffective(user)`; role CRUD; `setRolePermissions`; `assignRole`; `setOverride`/`clearOverride`; `assertCanGrant(actor, keys)`; `assertNotLastAdmin`; `syncCatalog()` (boot-time upsert of `permission` rows and system roles). All mutations audited inside the transaction. |
| `rbac-admin.controller.ts` | `/admin/roles*`, `/admin/permissions`, `/admin/users/:id/permissions` (§6.3). |
| `rbac.module.ts` | Exports `RbacService`; imported by `AuthModule`, `AdminModule`, `UsersModule`. |
| `permissions-coverage.spec.ts` | Boots `AppModule` like `app.security.spec.ts`, lists routes, and **fails if any route under `/admin` lacks `@RequirePermissions`/`@RequireAnyPermission` metadata.** This is how deny-by-default is made structural rather than a convention. |

Resolution happens in `JwtAuthGuard` so there is one DB round-trip per request, as today:

```ts
// jwt-auth.guard.ts (sketch)
const user = await this.prisma.user.findUnique({
  where: { id: payload.sub },
  include: {
    accessRole: { include: { permissions: { select: { permissionKey: true } } } },
    permissionOverrides: { where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } },
  },
});
request.user = {
  id, email, role: user.role,
  roleKey: user.accessRole?.key ?? null,
  permissions: this.rbac.resolveEffective(user), // ReadonlySet<PermissionKey> | "*"
} satisfies AuthedUser;
```

`resolveEffective` is a pure function (unit-tested): wildcard for `admin`; otherwise
`role ∪ ALLOW − DENY`. Caching is deferred: the extra join costs ~1 ms on an indexed PK fetch, and
the single-instance deployment means an in-process cache would only need to exist to be
invalidated. Revisit with the Redis work in backend-plan item 25.

`AuthedUser` gains `permissions` and a helper `can(user, key)`. Services that need
object-level checks (reset-password target tier, last-admin, self-modification) call `RbacService`
helpers explicitly — the pattern stays "boring and greppable" like `AuditService`.

Transition rules for `POST /admin/orders/:id/status` map the requested status to a permission in
the controller: `ON_HOLD` → `orders:hold`, `CANCELLED` → `orders:cancel`, everything else →
`orders:update_status`. The DTO's `@IsIn` list stays.

### 3.6 Privilege-escalation safeguards (all enforced in `RbacService`, all unit-tested)

1. **Grant ceiling.** An actor may only put a permission into a role, or ALLOW it on a user, if the
   actor's own effective set contains it. Elevated permissions additionally require `rbac:manage`.
2. **`admin` role.** Only `rbac:manage` holders assign it; it is never assignable to oneself; its
   permission set is immutable (`403 ROLE_IMMUTABLE`); `customer` likewise (always empty).
3. **No self-service.** An actor cannot change their own role, overrides or status
   (`403 SELF_MODIFICATION`). Password reset for self stays allowed, as today.
4. **Last-admin lock.** Demoting, suspending or DENY-overriding `rbac:manage` on the last
   `ACTIVE` user with the `admin` role is refused (`409 LAST_ADMIN`).
5. **Target tier.** `customers:*` actions work only on `CUSTOMER`-kind targets; `users:*` only on
   non-`CUSTOMER` targets. Resetting another `admin`'s password stays CLI-only (keeps today's rule
   from `assertMayReset`, now expressed as "target role `admin` ⇒ 403 unless self").
6. **Kind sync.** `User.role` is written only by `RbacService.assignRole`; DTOs never accept `role`
   or `roleId` on profile endpoints (`whitelist: true` already strips unknown fields).
7. **Session hygiene.** Role change, override change, suspension and password change revoke all
   refresh tokens for the target; the access JWT is at most 15 min old and the guard re-reads
   status and permissions on every request, so the change is effective immediately.
8. **Catalog integrity.** Unknown permission keys are rejected at the DTO (`@IsIn(PERMISSION_KEYS)`),
   so a typo can never create a phantom permission.
9. **Audit.** Every mutation writes `audit_log` in the same transaction, with the full before/after
   permission lists in `diff` (not just the delta), so a single row explains the state.

Recommended but not required for the first slice: a *sudo* step (re-enter password, valid 5 min)
for `rbac:manage` and `users:create` mutations. It belongs with MFA (backend-plan item 18) and is
listed in §11 Q3.

### 3.7 Frontend gating (cosmetic; the server is the source of truth)

- `GET /auth/me`, `POST /auth/login`, `POST /auth/register` return `permissions: string[]`
  (effective; `["*"]` for admin; `[]` for customers) and `roleKey`. `packages/shared/src/user.ts`
  `userSchema` gains `permissions: z.array(z.string()).default([])` and `roleKey: z.string().nullable().optional()`.
- `packages/shared/src/permissions.ts`: `PERMISSION_KEYS` tuple + `PermissionKey` type, imported
  by both backend and frontend so `useCan("orders:raed")` is a type error.
- `frontend/lib/auth/useCan.ts`: `useCan(key | key[], mode = "all")` → boolean from
  `useAuth().user.permissions`; `<Can perm="…" fallback>` component; `hasAdminAccess(user)` =
  any non-customer permission.
- `frontend/lib/auth/useSessionRevalidation.ts`: on app mount and on admin shell mount, call
  `/auth/me`; on `null` clear the store; otherwise replace `user`. Also on any `403
  FORBIDDEN_PERMISSION` from the API client, refetch `/auth/me` once and show "Your access has
  changed". This closes the stale-role gap noted in §2.5.
- `frontend/app/admin/layout.tsx`: replace `STAFF_ROLES` with `hasAdminAccess`; `NAV[]` items
  declare `permission` instead of `roles`; the first visible item becomes the landing route
  (replaces the `CONTENT_EDITOR → /admin/content` special case).
- `frontend/app/admin/_components/require-permission.tsx`: page-level wrapper that renders a
  "You don't have access to this section" card instead of the page when `useCan` fails. Pages keep
  loading data only after the check so a user never sees a flash of a 403 toast.
- Buttons/forms: `pricing/page.tsx` `canEdit = useCan(["catalog:write","pricing:write"],"any")`;
  order detail actions wrapped in `<Can>` per action (`mark-paid` → `payments:mark_paid`, etc.).

## 4. Feature 1 — Customer account page

### 4.1 Data model

Covered by §3.4: `ActionToken` (email change + verification), `User.pendingEmail`,
`User.passwordChangedAt`, `User.lastLoginAt`, `RefreshToken.lastUsedAt/label`. `SavedDesign`
already exists. Add `User.emailVerifiedAt` usage (column exists, never written).

Optional `UserPreference` is **not** added; the two V1 settings (order-status emails on/off,
marketing emails on/off) go on `User` as `notifyOrderUpdates Boolean @default(true)`,
`notifyMarketing Boolean @default(false)`. `EmailService` consumers check `notifyOrderUpdates`
before sending status mail (transactional security mail always sends).

### 4.2 Backend endpoints

All authenticated, scoped to the caller; no permission required. New routes are added to
`docs/api.md` "Customer" table on implementation.

| Method | Path | Notes |
|---|---|---|
| GET / PATCH | `/users/me` | exists; response gains `permissions`, `roleKey`, `emailVerifiedAt`, `pendingEmail`, `notify*`, `createdAt` |
| GET / POST / PATCH / DELETE | `/users/me/addresses[/:id]` | exists |
| POST | `/users/me/password` | `{ currentPassword, newPassword }`; verify current; hash new; set `passwordChangedAt`; clear `mustChangePassword`; revoke every refresh token **except** the one presented (`{ keepRefreshToken? }`); audit `user.change_password`; rate bucket `auth` |
| POST | `/users/me/email` | `{ newEmail, currentPassword }`; `409 EMAIL_TAKEN` only after password check (no enumeration before auth); writes `pendingEmail` + `ActionToken(EMAIL_CHANGE)` (1 h); emails **new** address with token, **old** address with a notice; audit `user.email_change_requested` |
| POST | `/auth/confirm-email-change` | **public**, `{ token }`; swaps email, sets `emailVerifiedAt`, clears `pendingEmail`, revokes sessions; add to `EXPECTED_PUBLIC` in `app.security.spec.ts` |
| POST | `/users/me/email/resend-verification` | re-sends `EMAIL_VERIFY` token for the current address |
| POST | `/auth/verify-email` | **public**, `{ token }` → sets `emailVerifiedAt`; add to `EXPECTED_PUBLIC` |
| GET | `/users/me/sessions` | list refresh tokens (`id`, `createdAt`, `lastUsedAt`, `userAgent`, `ip` masked to /24, `current: boolean`) |
| DELETE | `/users/me/sessions/:id`, `DELETE /users/me/sessions` | revoke one / all other sessions |
| GET | `/users/me/rewards?page=` | `{ balanceCents, ledger: [{ id, deltaCents, reason, orderNumber?, createdAt }] }`; `createdBy` is never exposed (same rule as order events' `actor`) |
| PATCH | `/users/me/settings` | `{ notifyOrderUpdates?, notifyMarketing? }` |
| GET / POST | `/designs` | list / create `SavedDesign` (`name`, `productId`, `config`, `artworkFileId?`); config validated with the shared builder schema; max 50 per user (`409 DESIGN_QUOTA`) |
| GET / PATCH / DELETE | `/designs/:id` | owner-scoped; `PATCH` renames or replaces config |
| POST | `/designs/:id/quote` | re-prices the saved config through `PricingService` (like reorder) and returns a fresh quote for "Order this design" |

Existing `/orders*`, `/artwork*` are reused unchanged. **Blocked on email transport**
(backend-plan item 15): `/users/me/email`, `/auth/confirm-email-change`, `/auth/verify-email`,
resend. Ship the endpoints behind the same `EmailService` abstraction; until a transport exists the
UI hides "Change email" and shows "Contact support to change your email".

### 4.3 Frontend

New route group `frontend/app/(storefront)/account/` (storefront chrome, signed-in layout with a
left rail on `lg+` and a tab strip below; uses `components/ui/page-header.tsx` and
`SectionHeading level="sub"` per the storefront design rules). `/dashboard` becomes a redirect to
`/account` (keep the `/dashboard` reorder link in `siteNavigation.ts` working; update the label).

| Route | Content | API |
|---|---|---|
| `/account` | Overview: name, email (verified badge or "Verify" prompt), reward balance, last 3 orders, quick links; `mustChangePassword` banner | `/users/me`, `/orders`, `/users/me/rewards` |
| `/account/orders` | Full order list with status badges and tracking links (moves `components/orders/OrderList.tsx` here; `/orders` and `/orders/[id]` stay as canonical URLs so emailed links keep working) | `/orders` |
| `/account/designs` | Saved designs grid: thumbnail from artwork preview URL, name, product, "Order again" (→ quote → cart), rename, delete | `/designs*` |
| `/account/artwork` | Artwork library with folders (reuses `ImagePickerOverlay` internals as a page) | `/artwork/library`, `/artwork/folders` |
| `/account/rewards` | Balance + paginated ledger table; copy explains "$1 per $100, credited when payment is confirmed" | `/users/me/rewards` |
| `/account/profile` | Name, phone (react-hook-form + shared zod) | `PATCH /users/me` |
| `/account/addresses` | Address book CRUD, default toggle, `address/validate` on save | `/users/me/addresses*` |
| `/account/security` | Change password (`components/ui/password-field.tsx`), change email (hidden until transport), sessions list with "Sign out other devices" | `/users/me/password`, `/users/me/email`, `/users/me/sessions*` |
| `/account/settings` | Notification toggles; "Delete account" is **out of scope** (shows support contact) | `PATCH /users/me/settings` |

Components: `components/account/AccountNav.tsx`, `AccountShell.tsx`, `AddressForm.tsx`,
`SessionList.tsx`, `RewardLedgerTable.tsx`, `SavedDesignCard.tsx`. `packages/api-client/src/apiClient.ts`
gains the matching methods; `mocks/handlers.ts` and `mocks/fixtures.ts` gain `/users/me*`,
`/designs*` handlers so `NEXT_PUBLIC_ENABLE_MOCKS=1` e2e can cover the area.

### 4.4 Acceptance criteria

- A signed-out visit to any `/account/*` route shows `SignInPrompt` with `next` set; sign-in
  returns to the requested page (`lib/auth/return-url.ts`).
- Changing the password with a wrong current password returns 400 and does not revoke sessions;
  with the right one, every other session's refresh token is revoked and `audit_log` has
  `user.change_password` with `actorId = userId`.
- A user can never read or mutate another user's address, design, session or ledger row (404, not
  403 — matches `UsersService.assertOwnership`).
- Reward ledger totals equal `User.rewardPointsBalance` for the seeded fixtures (test asserts the
  invariant).
- Saved design → "Order again" produces a server-priced quote; a changed rate changes the price.
- Lighthouse/axe pass in `frontend/e2e/accessibility.spec.ts` for every new page; mobile layout has
  no horizontal scroll at 375 px.

## 5. Feature 2 — Admin panel

### 5.1 Data model

No new models beyond §3.4. `PromoCode`, `RewardLedger` and `OrderEvent` already carry what the
new endpoints need. Add the two composite indexes on `audit_log` from the security review §6 in
the same migration as the RBAC tables.

### 5.2 Backend endpoints

Existing admin routes keep their paths and bodies; only the guard decorator changes
(`@Roles` → `@RequirePermissions`, see §3.2 "Today's equivalent"). New routes:

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/admin/dashboard` | `orders:read` | Buckets + today's placed/paid/shipped counts + SLA breaches (wraps `AdminOrdersService.buckets()`) |
| POST | `/admin/orders/:id/note` | `orders:note` | `{ note }` → `OrdersService.logActivity` (same-status `order_event`, `emailed: false`) + audit `order.note` |
| GET | `/admin/customers?search=&page=` | `customers:read` | **Behaviour change:** returns `CUSTOMER`-kind users only; staff move to `/admin/users` |
| GET | `/admin/customers/:id` | `customers:read` | adds `status`, `suspendedAt`, `emailVerifiedAt`, `lastLoginAt`, reward balance |
| PATCH | `/admin/customers/:id` | `customers:update` | name/phone; audit `customer.update` |
| POST | `/admin/customers/:id/suspend`, `/reactivate` | `customers:suspend` | `{ reason }`; revokes sessions; audit `customer.suspend` / `customer.reactivate` |
| POST | `/admin/customers/:id/reset-password` | `customers:reset_password` | existing; target must be `CUSTOMER` kind |
| GET | `/admin/customers/:id/rewards` | `rewards:read` | ledger with `createdBy` email (staff may see staff) |
| POST | `/admin/customers/:id/rewards/adjust` | `rewards:adjust` | `{ deltaCents (±, ≠0, ≤ 50 000), reason (10–200 chars) }`; one transaction: ledger row (`ADJUSTMENT`, `createdBy`), `user.rewardPointsBalance` increment with a `>= 0` guard (`409 INSUFFICIENT_BALANCE`), audit `reward.adjust` |
| GET / POST / PATCH | `/admin/promos[/:id]` | `promos:read` / `promos:write` | PromoCode CRUD; delete = `active: false`; audit `promo_code.*`. (Checkout does not yet apply promo codes — note in §11 Q7) |
| GET | `/admin/audit?entityType=&entityId=&actorId=&action=&from=&to=&page=&pageSize=` | `audit:read` | Paginated, newest first, joins actor email; `diff` returned as stored. Query DTO with bounds (backend-plan item 20) |
| GET | `/admin/audit/actions` | `audit:read` | Distinct action names for the filter dropdown |
| GET | `/admin/users?search=&status=&roleId=&page=` | `users:read` | Non-customer accounts: id, email, name, role key/name, status, `lastLoginAt`, `invitedBy`, override count |
| GET | `/admin/users/:id` | `users:read` | + effective permissions (`rbac:read` not required to see one's own staff list entry? No: requires `users:read`; the permission breakdown block requires `rbac:read`) |
| POST | `/admin/users` | `users:create` | `{ email, firstName, lastName, roleId, mode: "invite" \| "temporary_password", temporaryPassword? }`. `invite`: creates user `INVITED`, random unusable hash, `ActionToken(STAFF_INVITE, 72 h)`, emails link. `temporary_password`: creates `ACTIVE` with `mustChangePassword: true` (the pre-email-transport path; password must pass `passwordProblem()` from `cli/reset-password.ts`). Role must be assignable by the actor (§3.6). Audit `user.create` |
| POST | `/admin/users/:id/invite/resend` | `users:create` | invalidates prior token |
| POST | `/auth/accept-invite` | **public** | `{ token, password }` → sets hash, `ACTIVE`, `emailVerifiedAt`; add to `EXPECTED_PUBLIC`; rate bucket `auth` |
| PATCH | `/admin/users/:id` | `users:update` | name/phone |
| POST | `/admin/users/:id/role` | `users:update` (+ `rbac:manage` for `admin` role) | `{ roleId }` → `RbacService.assignRole`; syncs `User.role`; revokes sessions; audit `rbac.user.role.assign` with `{ from, to }` |
| POST | `/admin/users/:id/suspend`, `/reactivate` | `users:suspend` | `{ reason }`; last-admin lock; revokes sessions; audit `user.suspend` / `user.reactivate` |
| POST | `/admin/users/:id/reset-password` | `users:reset_password` | admin-initiated reset for staff; never for `admin` kind unless self |
| GET | `/admin/users/:id/permissions` | `rbac:read` | `{ roleKey, rolePermissions[], overrides[], effective[] }` |
| PUT | `/admin/users/:id/permissions/:key` | `rbac:manage` | `{ effect, reason, expiresAt? }` upsert override; grant ceiling applies; audit `rbac.user.permission.set` |
| DELETE | `/admin/users/:id/permissions/:key` | `rbac:manage` | audit `rbac.user.permission.clear` |
| GET | `/admin/permissions` | `rbac:read` | catalog grouped by resource |
| GET | `/admin/roles` | `rbac:read` | roles + permission keys + member counts |
| POST | `/admin/roles` | `rbac:manage` | `{ key, name, description, legacyRole: "STAFF" \| "CONTENT_EDITOR", permissions[] }` (custom roles cannot map to `ADMIN` or `CUSTOMER`) |
| PATCH | `/admin/roles/:id` | `rbac:manage` | name/description; `403 ROLE_IMMUTABLE` for `admin`/`customer` |
| PUT | `/admin/roles/:id/permissions` | `rbac:manage` | full replacement list; grant ceiling; audit `rbac.role.permissions.set` with before/after |
| DELETE | `/admin/roles/:id` | `rbac:manage` | custom roles only, `409 ROLE_IN_USE` if any member |

### 5.3 Frontend

Admin shell (`frontend/app/admin/layout.tsx`) nav becomes permission-driven:

| Nav item | Route | Visible when |
|---|---|---|
| Dashboard | `/admin` | `orders:read` |
| Orders | `/admin/orders` (list moves here; `/admin` becomes the dashboard) | `orders:read` |
| Customers | `/admin/customers` | `customers:read` |
| Catalog & pricing | `/admin/pricing` | `catalog:read` |
| Promo codes | `/admin/promos` | `promos:read` |
| Content | `/admin/content` | `content:read` |
| Staff | `/admin/staff` | `users:read` |
| Roles & permissions | `/admin/roles` | `rbac:read` |
| Audit log | `/admin/audit` | `audit:read` |

New pages: `admin/orders/page.tsx` (current board), `admin/promos/page.tsx`, `admin/staff/page.tsx`
(list + "Add employee" dialog with invite/temporary-password modes), `admin/staff/[id]/page.tsx`
(profile, role select, status with suspend/reactivate + reason, override editor with reason and
expiry, effective-permission read-out, reset-password), `admin/roles/page.tsx` (role list, member
counts), `admin/roles/[id]/page.tsx` (permission checklist grouped by resource; elevated keys
flagged; disabled where the actor lacks the permission themselves, with an explanatory tooltip),
`admin/audit/page.tsx` (filter bar, table, expandable diff rendered as before/after). Existing
pages gain `<Can>`-gated actions: customer detail gets suspend/reactivate, edit, reward adjust
(dialog with reason), ledger; order detail gets "Add note". `admin/customers/page.tsx` drops the
client-side role filter (customers only now). `lib/admin/labels.ts` gains `permissionLabel()` and
`roleKeyLabel()`; raw keys are shown only in the roles editor next to their descriptions.

API client: `packages/api-client/src/admin.ts` grows the methods above; a new
`packages/api-client/src/rbac.ts` holds role/permission/user types shared with the frontend.

### 5.4 Acceptance criteria

- `permissions-coverage.spec.ts` passes: every `/admin/*` route declares a permission.
- `roles.guard.spec.ts`-style unit tests for `PermissionsGuard`: wildcard passes; listed key
  passes; missing key → 403 `FORBIDDEN_PERMISSION` with `required`; no metadata → pass.
- A `fulfillment` user can mark tracking but gets 403 on mark-paid, and the Mark-paid button is not
  rendered for them. A `support` user can adjust rewards; the adjustment appears in the customer's
  ledger and the balance invariant holds. A negative adjustment below balance is refused.
- Creating a staff account with a role the actor cannot grant fails with 403 `GRANT_CEILING` and
  writes no row. Assigning `admin` without `rbac:manage` fails. Suspending the last admin fails
  with 409. Changing one's own role fails with 403.
- Suspending a user revokes their refresh tokens and their next API call returns 401 within one
  request (guard re-read), not after token expiry.
- Every mutation in §5.2 produces exactly one `audit_log` row in the same transaction (test: force
  a failure after the write and assert no row).
- Audit viewer renders a role-permission change as two lists with additions/removals highlighted.

## 6. Feature 3 — RBAC delivery details

Schema, catalog, enforcement and escalation rules are in §3; endpoints in §5.2; here is what else
ships.

### 6.1 Seeding and catalog sync

- Migration SQL (phase 1) creates tables and inserts the four system roles and the three template
  roles with `ON CONFLICT DO NOTHING`, then backfills `user.roleId` from `user.role`.
- `RbacService.syncCatalog()` runs in `onModuleInit`: upserts every `PERMISSIONS` entry
  (description/elevated/sort may change; keys are stable), and for **system roles only** adds any
  *new* default permission introduced in code (never removes — admins may have pruned on purpose).
  Removing a permission from the catalog requires a migration that deletes the key (cascades) and a
  note in `docs/api.md`.
- `backend/prisma/seed.ts` sets the seed admin's `roleId` to the `admin` role (and continues to set
  `role: "ADMIN"`).

### 6.2 Backward compatibility (what keeps working, phase by phase)

| Phase | `@Roles` on admin controllers | `RolesGuard` | `User.role` enum | Frontend role checks |
|---|---|---|---|---|
| 1 (RBAC core) | still present, `@RequirePermissions` added beside them | active (both guards must pass) | written by `RbacService` only | replaced by `useCan` |
| 2–4 | removed from `/admin/*` | active for the few coarse uses (none expected under `/admin`) | derived | — |
| 5 (cleanup) — **done** | removed | kept for optional coarse gating of future routes; `ADMIN` bypass removed (admin passes because it holds `*`) | `roleId` NOT NULL; enum documented as derived | `role` field kept in the wire shape for the MSW fixtures |

### 6.3 Admin UX for RBAC

- **Roles & permissions screen:** grid of permissions by resource; system roles show a lock on
  immutable ones; a "Members (n)" link filters the staff list; "Duplicate role" to start a custom
  role from a template.
- **Create employee:** email, name, role select (only roles whose permissions the actor holds are
  enabled), mode toggle *Send invite* (disabled with a tooltip until email transport exists) /
  *Set temporary password* (requires re-typing the password; user must change it on first login —
  the storefront and admin shells both check `mustChangePassword` and route to
  `/account/security?reason=first-login`).
- **Per-user overrides:** on the staff detail page, a list of extra ALLOW/DENY rows with reason and
  optional expiry; the effective list is shown read-only underneath so the result of role + overrides
  is never ambiguous.
- **Suspend/reactivate:** confirm dialog (existing `admin/_components/confirm-dialog.tsx`) with a
  mandatory reason; status badge in lists; suspended users cannot sign in (`login()` already rejects
  non-`ACTIVE`).
- **Invite acceptance page:** `frontend/app/(account)/accept-invite/page.tsx`, same shell as
  `reset-password`; sets the password and signs the user in.

## 7. Migration and rollout plan

Each phase is independently deployable with `deploy/scripts/deploy.sh` (forward-only
`prisma migrate deploy`). No phase requires a data backfill after its own migration.

| Phase | Ships | Depends on | Risk |
|---|---|---|---|
| **0. Decisions** | Answers to §11; `docs/api.md`/`architecture.md` roles table updated to reference this plan | — | — |
| **1. RBAC core** | Migration `rbac_roles_permissions` (tables, enum value `INVITED`, audit indexes, seed roles, backfill `roleId`); `backend/src/rbac/*`; `JwtAuthGuard` resolution; `@RequirePermissions` added to every existing admin handler; `PermissionsGuard` as 4th `APP_GUARD`; coverage spec; `/auth/me` + login return `permissions`; shared `permissions.ts`; `useCan`, session revalidation, admin nav/pages gated; hard-coded role sets in `artwork.service.ts`, `customers-admin.service.ts`, `pricing/page.tsx` replaced | 0 | Low: additive schema, both guards active, existing behaviour preserved by seeding defaults equal to today's `@Roles` |
| **2. Staff & roles admin** | `/admin/users*`, `/admin/roles*`, `/admin/permissions`, `/admin/users/:id/permissions*`, `/auth/accept-invite`, temporary-password mode, `mustChangePassword` flow, staff/roles pages, `/admin/audit*` + page | 1 | Medium: first real use of escalation rules; mitigated by unit tests in §8 |
| **3. Customer account** | `/users/me/password`, sessions, rewards ledger, settings, `/designs*`, `(storefront)/account/*` pages, MSW handlers, `/dashboard` redirect; email-change/verify endpoints coded but UI-hidden until item 15 | 1 (for the `permissions` field in `/auth/me`; otherwise independent) | Low |
| **4. Admin panel extensions** | Reward adjust, customer suspend/update, promos CRUD, order notes, dashboard route, customers-only listing, `/admin/orders` move | 1, 2 | Low |
| **5. Cleanup** | Remove `@Roles` from admin controllers and the `ADMIN` bypass in `RolesGuard`; `roleId` NOT NULL migration; delete `STAFF_ROLES`/`NAV.roles`; docs rewritten | 2, 4 | Low |

Rollback: phases 1–4 are code-rollback-safe against their own schema (older code ignores the new
tables; `User.role` is still authoritative for old guards). Phase 5's NOT NULL migration is the
only one an older build would trip on, which is why it is last.

## 8. Testing strategy

**Backend unit (jest, `backend/src/**/*.spec.ts`):**
- `rbac/rbac.service.spec.ts`: `resolveEffective` (wildcard, union, deny wins, expired override
  ignored), `assertCanGrant` (ceiling, elevated, self, admin role), `assertNotLastAdmin`,
  `assignRole` syncs `User.role` and revokes tokens, catalog sync is idempotent.
- `rbac/permissions.guard.spec.ts`: as in §5.4.
- `rbac/permissions-coverage.spec.ts`: route scan (modelled on `app.security.spec.ts`).
- `app.security.spec.ts`: `EXPECTED_PUBLIC` extended with `POST /auth/accept-invite`,
  `POST /auth/verify-email`, `POST /auth/confirm-email-change`.
- `admin/staff-admin.service.spec.ts`, `rewards-admin.service.spec.ts`, `users/users.service.spec.ts`
  (change-password revocation, sessions), `designs/designs.service.spec.ts` (ownership, quota),
  `audit-admin.service.spec.ts` (filters, bounds).
- Transaction atomicity tests use the existing pattern from `admin-orders.service.spec.ts`
  (Prisma stub with `$transaction` capture).

**Backend integration (new, against real Postgres):** backend-plan item 22 calls for IDOR regression
tests; the RBAC escalation matrix (actor role × target role × action → expected status) is the
first suite to add there, driven from a table so adding a permission adds a row, not a test.

**Frontend unit (vitest):** `useCan` truth table; `hasAdminAccess`; `AccountNav` visibility;
`permissionLabel` fallbacks.

**Frontend e2e (Playwright + MSW):** seed helpers gain `seedStaffAuth(page, permissions[])`; specs:
admin nav shows/hides per permission, 403 from a stubbed endpoint triggers revalidation and the
"access changed" notice, account pages render and pass axe at mobile and desktop, saved-design
"Order again" reaches the cart. `frontend/e2e-real/commerce.spec.ts` gets a staff flow: create a
fulfillment user via temporary password, sign in, attach tracking, be refused mark-paid.

## 9. Conflicts with current code (must change)

| Where | Conflict | Resolution |
|---|---|---|
| `backend/src/common/roles.guard.ts` | `ADMIN` bypass and "open when no metadata" | Phase 1: leave; `PermissionsGuard` + coverage spec make `/admin/*` deny-by-default. Phase 5: drop the bypass. |
| `backend/src/admin/customers-admin.service.ts` `assertMayReset` | Hard-coded role hierarchy | Replace with permission + target-kind checks in `RbacService` (§3.6 rule 5). |
| `backend/src/artwork/artwork.service.ts` `ARTWORK_READER_ROLES` | Hard-coded set | `can(user, "artwork:read_any")`. |
| `backend/src/admin/pricing-admin.controller.ts` | Class-level STAFF read, ADMIN write | `catalog:read`; mutations split `catalog:write` (product/material/finishing create-update-deactivate) vs `pricing:write` (rate, flat price, multiplier, volume tiers). `PATCH products/:id/materials/:materialId` needs both when the patch touches both; the service inspects the DTO fields. |
| `backend/src/admin/content-customers.controller.ts` | One controller mixing CMS and customers; class `@Roles` lists three roles | Split into `content-admin.controller.ts` and `customers-admin.controller.ts` when adding the new customer routes. |
| `backend/src/common/jwt-auth.guard.ts` `AuthedUser` | No permissions field | Add `permissions`, `roleKey`. Every `Pick<AuthedUser, …>` call site compiles unchanged. |
| `backend/src/common/user.serializer.ts` / `packages/shared/src/user.ts` | No `permissions` in wire shape; `userSchema` is `.strict()` | Add `permissions`, `roleKey`, `emailVerifiedAt`, `pendingEmail`, `notify*`; update MSW fixtures (`mocks/fixtures.ts`) and `frontend/e2e/helpers/auth.ts`. |
| `frontend/app/admin/layout.tsx`, `admin/pricing/page.tsx` | Role-string checks | `useCan` / `hasAdminAccess`. |
| `frontend/lib/stores/auth.ts` + no `/auth/me` call | Stale role/permissions until re-login | Session revalidation hook (§3.7). |
| `GET /admin/customers` | Lists staff too | Customers only; staff via `/admin/users`. The customers page's role filter is removed. |
| `backend/src/app.security.spec.ts` | Pins public routes | Add the three new public routes. |
| `backend/prisma/schema.prisma` `UserStatus` | No invited state | Add `INVITED`; `login()` and `JwtAuthGuard` already reject non-`ACTIVE`. |
| `docs/backend-plan.md` item 19 | Duplicates this plan | Mark "superseded by accounts-admin-rbac-plan.md". |
| `docs/architecture.md` "Roles" table and `docs/api.md` "Admin" roles column | Role-based | Rewrite to permission keys after phase 1. |

## 10. Security considerations

- **Server is the only enforcer.** No permission data in the JWT (payload stays `sub` only, per
  backend-plan item 2); permissions are resolved from the database on every request, so revocation
  is immediate and tokens cannot be replayed with stale rights.
- **Deny by default** under `/admin` is enforced structurally by `permissions-coverage.spec.ts`;
  customer routes stay ownership-scoped (no change to today's IDOR posture, which the security
  review found sound).
- **Least privilege:** custom templates split money, fulfillment and access control; `elevated`
  permissions need `rbac:manage` to delegate; the grant ceiling blocks lateral escalation.
- **Super-admin protection:** immutable `admin` role, last-admin lock, no self-modification, admin
  password resets stay on the CLI (`backend/src/cli/reset-password.ts`).
- **Tokens:** invite/email tokens are 256-bit, sha256-hashed at rest, single-use, 72 h (invite) or
  1 h (email), only ever sent through `EmailService` (which redacts them in logs today). Accept
  endpoints sit in the `auth` throttle bucket and give neutral errors.
- **Enumeration:** `/users/me/email` checks the password before reporting `EMAIL_TAKEN`; staff
  creation reports a taken email only to `users:create` holders (acceptable: they can already list
  users).
- **Sessions:** all sensitive changes revoke refresh tokens; the customer sessions page shows
  masked IPs only. When backend-plan item 16 moves the refresh token to an httpOnly cookie, the
  sessions endpoints keep working (they key on `refresh_token.id`, not on where the token is
  stored); `keepRefreshToken` becomes "keep the current cookie".
- **MFA (item 18):** once TOTP lands, require it for any user whose effective set contains an
  elevated permission; the `elevated` flag was chosen with that rule in mind.
- **Audit completeness:** RBAC and account mutations use the in-transaction `AuditService.record(…, tx)`
  form; `diff` stores full before/after permission arrays. `audit:read` is elevated and the viewer
  never exposes token hashes or password hashes (the `diff` for password/email changes records only
  `{ passwordChanged: true }` / `{ email: { from, to } }`).
- **Rate limits:** new public routes join the `auth` bucket; `/admin/audit` and `/admin/users`
  stay under the 120/min default.
- **Input validation:** every new query/body gets a DTO with bounds (this is also backend-plan item
  20); permission keys are validated against the catalog; reasons are length-bounded.

## 11. Open questions and decisions for the user

> **Decided 2026-09-30 (items 1, 2, 4 locked):**
> 1. **Single role + per-user overrides.** No multi-role. The resolver union keeps multi-role
>    additive later if ever needed.
> 2. **Default `staff` is stripped of sensitive perms** — remove `payments:mark_paid` and
>    `customers:reset_password` from the default `staff` role; grant them only via custom roles
>    (e.g. Fulfillment, Support) or per-user overrides. Update the role matrix (§ catalog) and the
>    seed accordingly, and migrate any existing STAFF users onto templates that restore what they
>    actually need.
> 4. **Temporary-password staff creation ships now** (admin sets a temp password, `mustChangePassword`
>    forces a reset on first login); email-change UI stays hidden until transport (backend-plan item 15).

1. ~~Single role + overrides vs multiple roles per user.~~ **Decided: single role + overrides.**
2. ~~Should the default `staff` role keep `customers:reset_password` and `payments:mark_paid`?~~
   **Decided: strip both from default `staff`; grant via custom roles/overrides.**
3. **Sudo mode** (re-enter password within 5 min) for `rbac:manage` / `users:create` mutations: now,
   or together with MFA (backend-plan item 18)? Proposed: with MFA. **← still open**
4. ~~Temporary-password mode for creating staff before email exists.~~ **Decided: ship it.**
5. **Email change without a transport:** code the endpoints now (hidden) or defer entirely?
   Proposed: code now, hide the UI; it is small and keeps `ActionToken` design coherent.
6. **Fold `PasswordReset` into `ActionToken`** (`purpose = PASSWORD_RESET`)? Cleaner, but touches
   the CLI and `auth.service.ts`. Proposed: phase 5 or later.
7. **Promo codes:** checkout does not currently apply `PromoCode` (model only). Should promo CRUD
   wait until checkout honours codes, or ship as prep? Proposed: ship CRUD in phase 4; checkout
   integration is a separate feature.
8. **Customer account deletion / data export** (privacy requests): out of scope here; suggest a
   support-handled process until a self-service flow is designed.
9. **`/admin/customers` behaviour change** (customers only) — confirm no workflow relies on seeing
   staff there.
10. **Audit retention** (security review §7 suggests 2 years): fine for the viewer's pagination, but
    confirm whether the viewer should offer CSV export (`audit:read`) in V1. Proposed: no export in
    V1.

## 12. Sequenced task breakdown

Each task is one PR-sized unit. "Needs" lists hard dependencies.

### Phase 1 — RBAC core

| # | Task | Files | Needs |
|---|---|---|---|
| 1.1 | Permission catalog + shared types | `backend/src/rbac/permissions.ts`, `packages/shared/src/permissions.ts`, `packages/shared/src/index.ts` | — |
| 1.2 | Prisma migration: `AccessRole`, `Permission`, `RolePermission`, `UserPermission`, `ActionToken`, `User` columns, `UserStatus.INVITED`, `RefreshToken.lastUsedAt/label`, audit indexes; seed system + template roles; backfill `roleId` | `backend/prisma/schema.prisma`, `backend/prisma/migrations/<ts>_rbac_roles_permissions/migration.sql`, `backend/prisma/seed.ts` | 1.1 |
| 1.3 | `RbacService` (resolve, sync, assign, grant ceiling, last-admin) + spec | `backend/src/rbac/rbac.service.ts`, `rbac.module.ts`, `rbac.service.spec.ts` | 1.2 |
| 1.4 | Decorators + `PermissionsGuard` + spec; register as 4th `APP_GUARD`; extend `AuthedUser`; resolve in `JwtAuthGuard` | `backend/src/rbac/require-permissions.decorator.ts`, `permissions.guard.ts`, `permissions.guard.spec.ts`, `backend/src/common/jwt-auth.guard.ts`, `backend/src/app.module.ts` | 1.3 |
| 1.5 | Annotate every existing admin handler with `@RequirePermissions`; status-route permission mapping; replace `ARTWORK_READER_ROLES` and `assertMayReset`; coverage spec | `backend/src/admin/*.controller.ts`, `backend/src/artwork/artwork.service.ts`, `backend/src/admin/customers-admin.service.ts`, `backend/src/rbac/permissions-coverage.spec.ts` | 1.4 |
| 1.6 | Wire shape: `permissions`, `roleKey` in `SerializedUser`, `userSchema`, MSW fixtures, e2e auth helper | `backend/src/common/user.serializer.ts`, `packages/shared/src/user.ts`, `packages/api-client/src/mocks/fixtures.ts`, `frontend/e2e/helpers/auth.ts` | 1.4 |
| 1.7 | Frontend `useCan`, `<Can>`, `hasAdminAccess`, session revalidation (`/auth/me` on mount + on 403), admin layout/nav/pages gated, pricing `canEdit` | `frontend/lib/auth/useCan.ts`, `frontend/lib/auth/useSessionRevalidation.ts`, `frontend/app/providers.tsx`, `frontend/app/admin/layout.tsx`, `frontend/app/admin/_components/require-permission.tsx`, `frontend/app/admin/pricing/page.tsx`, `frontend/app/admin/orders/[id]/page.tsx` | 1.6 |
| 1.8 | Docs: `docs/api.md` admin table gains a "Permission" column; `docs/architecture.md` roles section; `docs/backend-plan.md` item 19 superseded | docs | 1.5 |

### Phase 2 — Staff, roles, audit

> **Implemented 2026-09-30 (2.1–2.6).** Deviations from the tables above, all deliberate:
> - `mustChangePassword` is enforced in `JwtAuthGuard`, not only in `login()`/`me()`: every
>   authenticated route answers `403 PASSWORD_CHANGE_REQUIRED` unless it carries
>   `@AllowPasswordChangeRequired()` (`POST /auth/logout`, `POST /users/me/password`).
> - `POST /users/me/password` (task 3.1) ships now, minimally, because the first-login flow needs
>   it; the sessions list/revoke endpoints stay in phase 3.
> - The first-login page is `frontend/app/(account)/change-password` (not
>   `/account/security?reason=first-login`, which does not exist until phase 3); the admin shell
>   blocks on `mustChangePassword` and the login page redirects there.
> - `/admin/customers` lists CUSTOMER-kind accounts only (pulled forward from 4.1); the page's
>   role filter is gone and shows account status instead.
> - Invite mode exists end to end on the API (`mode: "invite"`, `POST /auth/accept-invite`,
>   resend) but the "Send invite" option is disabled in the UI until an email transport exists.
> - Audit viewer has no CSV export (§11 Q10, as proposed).

| # | Task | Files | Needs |
|---|---|---|---|
| 2.1 | Roles/permissions admin API (`/admin/roles*`, `/admin/permissions`) + spec | `backend/src/rbac/rbac-admin.controller.ts`, `rbac-admin.dto.ts` | 1.5 |
| 2.2 | Staff accounts API (`/admin/users*`: list, detail, create with both modes, role, suspend/reactivate, reset-password, overrides) + `POST /auth/accept-invite` + `mustChangePassword` enforcement in `login()`/`me()` + specs; `EXPECTED_PUBLIC` update | `backend/src/admin/staff-admin.controller.ts`, `staff-admin.service.ts`, `staff-admin.service.spec.ts`, `backend/src/auth/auth.controller.ts`, `auth.service.ts`, `backend/src/app.security.spec.ts` | 2.1 |
| 2.3 | Audit read API + query DTO + spec | `backend/src/admin/audit-admin.controller.ts`, `audit-admin.service.ts`, spec | 1.2 |
| 2.4 | API client + types | `packages/api-client/src/rbac.ts`, `admin.ts`, `index.ts` | 2.1–2.3 |
| 2.5 | Admin pages: staff list/detail, roles list/editor, audit viewer, accept-invite page, first-login password change banner/route | `frontend/app/admin/staff/*`, `admin/roles/*`, `admin/audit/page.tsx`, `frontend/app/(account)/accept-invite/page.tsx`, `frontend/lib/admin/labels.ts` | 2.4, 1.7 |
| 2.6 | e2e: staff auth seed helper, nav visibility, 403 revalidation, staff flow in `e2e-real` | `frontend/e2e/helpers/auth.ts`, `frontend/e2e/admin-rbac.spec.ts`, `frontend/e2e-real/commerce.spec.ts` | 2.5 |

### Phase 3 — Customer account

> **Implemented 2026-10-01 (3.1–3.6).** Deviations from §4, all deliberate:
> - The access JWT now carries `sid` (the refresh-token row id) next to `sub`, so
>   `/users/me/sessions` can mark the current device and "sign out other devices" can keep it.
>   The guard still resolves everything about access from the database; `sid` grants nothing.
>   Session rows record `ip`/`userAgent` at issue time and `lastUsedAt` on issue and rotation.
> - `POST /users/me/addresses/:id/default` was added for the "make default" action (a `PATCH`
>   would need the full address body).
> - The two "email verified / change email" actions and the verification prompt are behind
>   `frontend/lib/config/features.ts` `EMAIL_TRANSPORT_CONFIGURED` (same gate as the phase 2
>   invite mode); the security page shows "contact support to change your email" until then.
> - No `POST /designs` call site exists in the builder yet: the API, client, MSW fixtures and the
>   `/account/designs` page (rename, delete, order again) ship; a "Save design" control in the
>   builder is a follow-up.
> - `/account/artwork` is a standalone page (folder CRUD, upload to root, previews) rather than a
>   refactor of `ImagePickerOverlay`; files are not deletable, matching the API.
> - `PATCH/DELETE /artwork/folders/:id` now answer `204` (they returned an empty `200`, which the
>   JSON client could not parse).
> - `/dashboard` is a server redirect to `/account`; every in-app link and the `safeReturnUrl`
>   fallback now point at `/account`.

| # | Task | Files | Needs |
|---|---|---|---|
| 3.1 | `POST /users/me/password`, sessions list/revoke, settings PATCH, rewards ledger GET + specs | `backend/src/users/users.controller.ts`, `users.service.ts`, `users.dto.ts`, `users.service.spec.ts` | 1.2 |
| 3.2 | `SavedDesign` module (`/designs*`, quota, re-quote) + spec | `backend/src/designs/designs.module.ts`, `designs.controller.ts`, `designs.service.ts`, `designs.dto.ts`, spec; `backend/src/app.module.ts` | — |
| 3.3 | Email change + verification endpoints (hidden in UI until transport) + `EXPECTED_PUBLIC` | `backend/src/auth/*`, `backend/src/users/*`, `backend/src/app.security.spec.ts` | 1.2 |
| 3.4 | API client methods + MSW handlers/fixtures for `/users/me*`, `/designs*` | `packages/api-client/src/apiClient.ts`, `types.ts`, `mocks/handlers.ts`, `mocks/fixtures.ts` | 3.1–3.3 |
| 3.5 | Account shell + pages; `/dashboard` redirect; nav label | `frontend/app/(storefront)/account/**`, `frontend/components/account/*`, `frontend/app/(storefront)/dashboard/page.tsx`, `frontend/components/nav/siteNavigation.ts` | 3.4 |
| 3.6 | e2e + axe for account pages (mocks), mobile check | `frontend/e2e/account.spec.ts`, `accessibility.spec.ts` | 3.5 |

### Phase 4 — Admin panel extensions

> **Implemented 2026-10-01 (4.1–4.5).** Deviations from §5, all deliberate:
> - `content-customers.controller.ts` became `content-admin.controller.ts` (`/admin/content*`,
>   `/content*`) and `customers-admin.controller.ts` (`/admin/customers*`); rewards live in a
>   separate `RewardsAdminService`. `GET /admin/customers/:id` now answers `404` for staff ids.
> - `GET /admin/dashboard` is served by `AdminDashboardController` (same service as the board) and
>   counts "today" from midnight in `America/New_York`, not the server's zone.
> - The reward adjustment's balance guard is a compare-and-set `updateMany` (`rewardPointsBalance >=
>   -deltaCents`), so two concurrent debits cannot both pass; the audit row carries the reason and
>   the before/after balance.
> - Promo `DELETE` is idempotent (no audit row when already inactive); `PATCH { active: true }`
>   reactivates. Promo values are accepted as numbers with ≤ 2 decimals and stored as `toFixed(2)`
>   strings into `Decimal(10,2)`, like the pricing admin. **Checkout still does not apply promo
>   codes** (§11 Q7) — the admin page says so.
> - The order detail's "Add note" posts to `/admin/orders/:id/note`; notes render on the timeline as
>   "Note · … (internal)" since `fromStatus === toStatus`.
> - MSW gained `admin-handlers.ts` (dashboard, board reads, note, customers, rewards, promos) and a
>   second seeded customer with an open order so the flows are testable without a checkout.

| # | Task | Files | Needs |
|---|---|---|---|
| 4.1 | Split `content-customers.controller.ts`; customers-only listing; customer update/suspend/reactivate; rewards ledger + adjust + specs | `backend/src/admin/customers-admin.controller.ts`, `customers-admin.service.ts`, `rewards-admin.service.ts`, specs | 1.5 |
| 4.2 | Order note + dashboard route | `backend/src/admin/admin-orders.controller.ts`, `admin-orders.service.ts` | 1.5 |
| 4.3 | Promo code CRUD + spec | `backend/src/admin/promos-admin.controller.ts`, `promos-admin.service.ts`, `promos-admin.dto.ts` | 1.5 |
| 4.4 | Admin client methods; pages: dashboard at `/admin`, orders board at `/admin/orders`, promos, customer detail actions, order note | `packages/api-client/src/admin.ts`, `frontend/app/admin/page.tsx`, `admin/orders/page.tsx`, `admin/promos/page.tsx`, `admin/customers/[id]/page.tsx`, `admin/customers/page.tsx`, `admin/orders/[id]/page.tsx` | 4.1–4.3 |
| 4.5 | `docs/api.md` + `architecture.md` updates | docs | 4.4 |

### Phase 5 — Cleanup

> **Implemented 2026-10-01 (5.1–5.3; 5.4 deferred).** Notes:
> - `@Roles` is gone from every `/admin/*` controller and `RolesGuard` has no ADMIN bypass; it stays
>   registered for optional coarse gating of future non-admin routes. `permissions-coverage.spec.ts`
>   now also fails on any `/admin` route that carries `@Roles` or `@Public`.
> - Migration `20261005000000_user_role_id_not_null` repeats the phase 1 backfill, sets
>   `user.roleId NOT NULL` and re-creates the FK as `RESTRICT`. Registration connects the `customer`
>   role; `assertNotLastAdmin` counts access roles only. `User.role` is documented as derived in the
>   schema and is read only for the wire shape, target-kind checks and staff password rules.
> - Frontend: no role-enum gating remains; `lib/admin/labels.ts` keys display names by role key, and
>   the enum shows only as the "kind" beside a role's key in the roles editor (`roleKindLabel`).
> - Hardening beyond the table: a `sensitive` rate bucket (20/min per IP) on staff creation, invite
>   resend, both admin password resets and reward adjustments.
> - Follow-ups closed: the builder's **Save design** control (`components/builder/PriceHero.tsx`)
>   posts the active sign to `POST /designs` (artwork attached when present) and links to
>   `/account/designs`; signed-out visitors get a sign-in link with `next`. The fixed-size
>   retractable page has no save control (it is not a builder; order it from the catalog).
>   `app-shell.spec.ts` now asserts the internal-mode strip on its rendered text, so the
>   mobile-webkit run is green.
> - e2e/a11y sweep: axe on staff, roles, audit, pricing, content, first-login and invite pages;
>   phone-width overflow checks on every account section and the data-heavy admin pages.
>   The sweep found one real defect: `sr-only` table headings escaped the admin tables'
>   `overflow-x-auto` cards (no positioned ancestor) and stretched the document at phone width;
>   every admin scroll container is now `relative`.
> - 5.4 (fold `PasswordReset` into `ActionToken`, §11 Q6) is deferred: it touches the CLI and
>   `auth.service.ts` for no functional gain, and `PasswordReset` already has the same hashing,
>   expiry and single-use properties.

| # | Task | Files | Needs |
|---|---|---|---|
| 5.1 | Remove `@Roles` from `/admin/*`; drop `ADMIN` bypass in `RolesGuard`; update `roles.guard.spec.ts` | `backend/src/admin/*.controller.ts`, `backend/src/common/roles.guard.ts`, spec | 2.x, 4.x |
| 5.2 | Migration `user.roleId` NOT NULL; mark `User.role` derived in schema comments | `backend/prisma/schema.prisma`, migration | 5.1 |
| 5.3 | Delete `STAFF_ROLES`/`NAV.roles` remnants; `lib/admin/labels.ts` role labels keyed by role key | frontend | 5.1 |
| 5.4 | Optional: fold `PasswordReset` into `ActionToken` (Q6) | `backend/src/auth/*`, `backend/src/cli/reset-password.ts`, migration | 5.2 |
