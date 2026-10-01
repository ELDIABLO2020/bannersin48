/**
 * Admin API client — staff-facing endpoints (/admin/*). Same conventions as
 * apiClient.ts: bearer token from config, JSON bodies, ApiClientError on !ok.
 * Artwork/label uploads send FormData; file links come from `artworkDownloadUrl`.
 */

import type { SavedAddress, User } from "@bannersin48/shared";
import { HttpClient } from "./http";
import type { RewardLedgerEntry } from "./account";
import type {
  AdminRole,
  AuditEntry,
  AuditQuery,
  CreateRoleInput,
  CreateStaffInput,
  CreateStaffResponse,
  Paginated,
  PermissionCatalogEntry,
  SetOverrideInput,
  StaffUser,
  StaffUserDetail,
  UserPermissionBreakdown,
} from "./rbac";

function queryString(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") q.set(key, String(value));
  }
  return q.size ? `?${q}` : "";
}

export interface AdminOrderBucket {
  status: string;
  count: number;
  slaBreachedCount: number;
}

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalLabel: string;
  userEmail: string | null;
  firstLineLabel: string;
  placedAt: string | null;
  slaBreached: boolean;
}

export interface AdminOrderDetail extends Record<string, unknown> {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  shipping: number;
  total: number;
  shipTo: Record<string, unknown>;
  customer: { email: string; firstName?: string | null; lastName?: string | null; phone?: string | null };
  slaBreached: boolean;
  /** Each item's `artwork` (if any) carries a signed 5-minute `previewUrl`. */
  items: Array<Record<string, unknown>>;
  dropship: { externalRef: string; submittedAt: string; notes?: string | null } | null;
  shipment: {
    carrier: string;
    trackingNumber: string | null;
    /** Mint a link with `artworkDownloadUrl(labelFileId)`. */
    labelFileId: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
  events: Array<{ id: string; fromStatus: string | null; toStatus: string; actor: "customer" | "staff" | "system"; note: string | null; createdAt: string }>;
}

export interface AdminProductRow {
  id: string;
  code: string;
  slug: string;
  name: string;
  active: boolean;
  sizeMode: string;
  materials: Array<{
    id: string;
    code: string;
    name: string;
    ratePerSqft: string;
    flatPriceUsd: string | null;
    doubleSideMultiplier: string;
    active: boolean;
  }>;
}

export interface AdminContentBlock {
  key: string;
  blockType: string;
  payload: unknown;
  published: boolean;
  updatedAt: string;
}

/** `GET /admin/dashboard` */
export interface AdminDashboard {
  buckets: AdminOrderBucket[];
  /** Counts since the shop's local midnight (`since`). */
  today: { since: string; placed: number; paid: number; shipped: number };
  openOrders: number;
  slaBreachedCount: number;
  updatedAt: string;
}

/** `GET /admin/customers` row */
export interface AdminCustomerListItem {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  status: string;
  rewardsPoints: number;
  orderCount: number;
  createdAt: string;
}

/** `GET /admin/customers/:id` */
export interface AdminCustomerDetail {
  user: User;
  account: {
    status: string;
    suspendedAt: string | null;
    suspendedReason: string | null;
    emailVerifiedAt: string | null;
    lastLoginAt: string | null;
    /** Mirrors `user.rewardsPoints`; money as integer cents. */
    rewardBalanceCents: number;
    orderCount: number;
  };
  addresses: SavedAddress[];
  orders: Array<{ id: string; orderNumber: string; status: string; paymentStatus: string; totalLabel: string; createdAt: string; placedAt: string | null }>;
}

/** `GET /admin/customers/:id/rewards` row: unlike the customer's own view, staff see who adjusted. */
export interface AdminRewardLedgerEntry extends RewardLedgerEntry {
  createdBy: string | null;
  createdByEmail: string | null;
}

export interface AdminRewardsPage {
  balanceCents: number;
  page: number;
  pageSize: number;
  total: number;
  ledger: AdminRewardLedgerEntry[];
}

export interface RewardAdjustmentResult {
  balanceCents: number;
  entry: AdminRewardLedgerEntry;
}

/** `GET /admin/promos` row. Money / percentages are decimal strings, never floats. */
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

/** `POST /admin/promos` body (`PATCH` takes a partial). Instants are ISO strings; `null` clears a nullable field. */
export interface PromoCodeBody {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrder?: number;
  maxUses?: number | null;
  perUserLimit?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  active?: boolean;
}

export class AdminApiClient extends HttpClient {
  // --- Dashboard ----------------------------------------------------------------

  dashboard() {
    return this.request<AdminDashboard>("GET", "/admin/dashboard");
  }

  // --- Orders / fulfillment ---------------------------------------------------

  buckets() {
    return this.request<{ buckets: AdminOrderBucket[]; updatedAt: string }>("GET", "/admin/orders/buckets");
  }

  listOrders(opts: { status?: string; page?: number; pageSize?: number } = {}) {
    const q = new URLSearchParams();
    if (opts.status) q.set("status", opts.status);
    if (opts.page) q.set("page", String(opts.page));
    if (opts.pageSize) q.set("pageSize", String(opts.pageSize));
    return this.request<{ items: AdminOrderListItem[]; page: number; pageSize: number; total: number }>(
      "GET",
      `/admin/orders${q.size ? `?${q}` : ""}`,
    );
  }

  orderDetail(id: string) {
    return this.request<AdminOrderDetail>("GET", `/admin/orders/${encodeURIComponent(id)}`);
  }

  markPaid(id: string) {
    return this.request<void>("POST", `/admin/orders/${encodeURIComponent(id)}/mark-paid`);
  }

  recordDropship(id: string, input: { externalRef: string; notes?: string }) {
    return this.request<void>("POST", `/admin/orders/${encodeURIComponent(id)}/dropship`, input);
  }

  attachTracking(id: string, input: { trackingNumber: string; label?: File }) {
    const form = new FormData();
    form.append("trackingNumber", input.trackingNumber);
    if (input.label) form.append("label", input.label);
    return this.request<AdminOrderDetail>("POST", `/admin/orders/${encodeURIComponent(id)}/tracking`, form);
  }

  transition(id: string, input: { status: string; reason?: string }) {
    return this.request<AdminOrderDetail>("POST", `/admin/orders/${encodeURIComponent(id)}/status`, input);
  }

  /** Internal note on the order timeline (`orders:note`); the customer is not emailed. */
  addOrderNote(id: string, note: string) {
    return this.request<AdminOrderDetail>("POST", `/admin/orders/${encodeURIComponent(id)}/note`, { note });
  }

  // --- Pricing control ----------------------------------------------------------

  products() {
    return this.request<AdminProductRow[]>("GET", "/admin/products");
  }

  updateProduct(id: string, patch: Record<string, unknown>) {
    return this.request<AdminProductRow>("PATCH", `/admin/products/${encodeURIComponent(id)}`, patch);
  }

  updateMaterial(productId: string, materialId: string, patch: Record<string, unknown>) {
    return this.request<unknown>(
      "PATCH",
      `/admin/products/${encodeURIComponent(productId)}/materials/${encodeURIComponent(materialId)}`,
      patch,
    );
  }

  finishingOptions() {
    return this.request<Array<{ id: string; code: string; name: string; priceModel: string; amount: string; active: boolean }>>(
      "GET",
      "/admin/finishing-options",
    );
  }

  updateFinishingOption(id: string, patch: Record<string, unknown>) {
    return this.request<unknown>("PATCH", `/admin/finishing-options/${encodeURIComponent(id)}`, patch);
  }

  volumeTiers() {
    return this.request<Array<{ id: string; productId: string | null; materialCode: string | null; minBillableSqft: string; rates: unknown; warningCopy: string | null }>>(
      "GET",
      "/admin/volume-tiers",
    );
  }

  createVolumeTier(input: { minBillableSqft: number; rates: Record<string, number>; warningCopy?: string }) {
    return this.request<unknown>("POST", "/admin/volume-tiers", input);
  }

  updateVolumeTier(id: string, input: { minBillableSqft: number; rates: Record<string, number>; warningCopy?: string }) {
    return this.request<unknown>("PUT", `/admin/volume-tiers/${encodeURIComponent(id)}`, input);
  }

  deleteVolumeTier(id: string) {
    return this.request<{ deleted: boolean }>("DELETE", `/admin/volume-tiers/${encodeURIComponent(id)}`);
  }

  // --- CMS content -----------------------------------------------------------------

  contentList() {
    return this.request<AdminContentBlock[]>("GET", "/admin/content");
  }

  contentUpsert(key: string, input: { blockType?: string; payload?: Record<string, unknown>; published?: boolean }) {
    return this.request<AdminContentBlock>("PUT", `/admin/content/${encodeURIComponent(key)}`, { ...input, key });
  }

  contentDelete(key: string) {
    return this.request<{ deleted: boolean }>("DELETE", `/admin/content/${encodeURIComponent(key)}`);
  }

  // --- Customers --------------------------------------------------------------------

  customers(opts: { search?: string; page?: number } = {}) {
    const q = new URLSearchParams();
    if (opts.search) q.set("search", opts.search);
    if (opts.page) q.set("page", String(opts.page));
    return this.request<{ page: number; pageSize: number; total: number; items: AdminCustomerListItem[] }>("GET", `/admin/customers${q.size ? `?${q}` : ""}`);
  }

  customerDetail(idOrEmail: string) {
    return this.request<AdminCustomerDetail>("GET", `/admin/customers/${encodeURIComponent(idOrEmail)}`);
  }

  updateCustomer(id: string, patch: { firstName?: string; lastName?: string; phone?: string | null }) {
    return this.request<AdminCustomerDetail>("PATCH", `/admin/customers/${encodeURIComponent(id)}`, patch);
  }

  suspendCustomer(id: string, reason: string) {
    return this.request<AdminCustomerDetail>("POST", `/admin/customers/${encodeURIComponent(id)}/suspend`, { reason });
  }

  reactivateCustomer(id: string, reason?: string) {
    return this.request<AdminCustomerDetail>("POST", `/admin/customers/${encodeURIComponent(id)}/reactivate`, reason ? { reason } : {});
  }

  adminResetPassword(id: string) {
    return this.request<{ ok: true }>("POST", `/admin/customers/${encodeURIComponent(id)}/reset-password`);
  }

  customerRewards(id: string, opts: { page?: number; pageSize?: number } = {}) {
    return this.request<AdminRewardsPage>("GET", `/admin/customers/${encodeURIComponent(id)}/rewards${queryString(opts)}`);
  }

  /** `deltaCents` is signed integer cents (credit > 0, debit < 0); a reason is mandatory and audited. */
  adjustCustomerRewards(id: string, input: { deltaCents: number; reason: string }) {
    return this.request<RewardAdjustmentResult>("POST", `/admin/customers/${encodeURIComponent(id)}/rewards/adjust`, input);
  }

  // --- Promo codes (promos:*) ------------------------------------------------------

  promos(opts: { search?: string; active?: "true" | "false"; page?: number; pageSize?: number } = {}) {
    return this.request<Paginated<AdminPromoCode>>("GET", `/admin/promos${queryString(opts)}`);
  }

  promo(id: string) {
    return this.request<AdminPromoCode>("GET", `/admin/promos/${encodeURIComponent(id)}`);
  }

  createPromo(input: PromoCodeBody) {
    return this.request<AdminPromoCode>("POST", "/admin/promos", input);
  }

  updatePromo(id: string, patch: Partial<PromoCodeBody>) {
    return this.request<AdminPromoCode>("PATCH", `/admin/promos/${encodeURIComponent(id)}`, patch);
  }

  /** Deactivates (`active: false`); codes are never deleted because orders reference them. */
  deactivatePromo(id: string) {
    return this.request<AdminPromoCode>("DELETE", `/admin/promos/${encodeURIComponent(id)}`);
  }

  // --- Staff accounts (users:*) --------------------------------------------------------

  staff(opts: { search?: string; status?: string; roleId?: string; page?: number; pageSize?: number } = {}) {
    return this.request<Paginated<StaffUser>>("GET", `/admin/users${queryString(opts)}`);
  }

  staffDetail(id: string) {
    return this.request<StaffUserDetail>("GET", `/admin/users/${encodeURIComponent(id)}`);
  }

  createStaff(input: CreateStaffInput) {
    return this.request<CreateStaffResponse>("POST", "/admin/users", input);
  }

  resendStaffInvite(id: string) {
    return this.request<{ ok: true; inviteExpiresAt: string }>("POST", `/admin/users/${encodeURIComponent(id)}/invite/resend`);
  }

  updateStaff(id: string, patch: { firstName?: string; lastName?: string; phone?: string | null }) {
    return this.request<StaffUserDetail>("PATCH", `/admin/users/${encodeURIComponent(id)}`, patch);
  }

  assignStaffRole(id: string, roleId: string) {
    return this.request<StaffUserDetail>("POST", `/admin/users/${encodeURIComponent(id)}/role`, { roleId });
  }

  suspendStaff(id: string, reason: string) {
    return this.request<StaffUserDetail>("POST", `/admin/users/${encodeURIComponent(id)}/suspend`, { reason });
  }

  reactivateStaff(id: string, reason?: string) {
    return this.request<StaffUserDetail>("POST", `/admin/users/${encodeURIComponent(id)}/reactivate`, reason ? { reason } : {});
  }

  resetStaffPassword(id: string) {
    return this.request<{ ok: true }>("POST", `/admin/users/${encodeURIComponent(id)}/reset-password`);
  }

  // --- Roles, catalog, overrides (rbac:*) ---------------------------------------------

  permissions() {
    return this.request<PermissionCatalogEntry[]>("GET", "/admin/permissions");
  }

  roles() {
    return this.request<AdminRole[]>("GET", "/admin/roles");
  }

  role(id: string) {
    return this.request<AdminRole>("GET", `/admin/roles/${encodeURIComponent(id)}`);
  }

  createRole(input: CreateRoleInput) {
    return this.request<AdminRole>("POST", "/admin/roles", input);
  }

  updateRole(id: string, patch: { name?: string; description?: string | null }) {
    return this.request<AdminRole>("PATCH", `/admin/roles/${encodeURIComponent(id)}`, patch);
  }

  setRolePermissions(id: string, permissions: string[]) {
    return this.request<{ permissions: string[] }>("PUT", `/admin/roles/${encodeURIComponent(id)}/permissions`, { permissions });
  }

  deleteRole(id: string) {
    return this.request<{ deleted: true }>("DELETE", `/admin/roles/${encodeURIComponent(id)}`);
  }

  userPermissions(userId: string) {
    return this.request<UserPermissionBreakdown>("GET", `/admin/users/${encodeURIComponent(userId)}/permissions`);
  }

  setUserOverride(userId: string, permissionKey: string, input: SetOverrideInput) {
    return this.request<{ permissions: string[] }>("PUT", `/admin/users/${encodeURIComponent(userId)}/permissions/${encodeURIComponent(permissionKey)}`, input);
  }

  clearUserOverride(userId: string, permissionKey: string) {
    return this.request<{ permissions: string[] }>("DELETE", `/admin/users/${encodeURIComponent(userId)}/permissions/${encodeURIComponent(permissionKey)}`);
  }

  // --- Audit log (audit:read) -----------------------------------------------------------

  audit(query: AuditQuery = {}) {
    return this.request<Paginated<AuditEntry>>("GET", `/admin/audit${queryString({ ...query })}`);
  }

  auditActions() {
    return this.request<string[]>("GET", "/admin/audit/actions");
  }
}
