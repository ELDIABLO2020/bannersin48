/**
 * MSW handlers for the admin panel extensions (plan §5.2, phase 4): dashboard,
 * order board reads + internal notes, the customer directory with edit /
 * suspend / rewards, and promo code management. Permission checks mirror the
 * backend's `PermissionsGuard` through `requirePermission`; mutations append
 * audit rows like the real services do.
 *
 * No node-only imports: these run in Vitest and in the browser service worker.
 */

import { http, HttpResponse } from "msw";
import { PRODUCTS, type Order, type SavedAddress, type User } from "@bannersin48/shared";
import { store } from "./fixtures";
import { record, requirePermission } from "./rbac-handlers";
import type { AdminCustomerDetail, AdminCustomerListItem, AdminOrderBucket, AdminPromoCode, AdminRewardLedgerEntry, PromoCodeBody } from "../admin";

const API = "http://localhost:3001";
const STATUSES = ["RECEIVED", "AWAITING_PAYMENT", "IN_PROCESSING", "ACCEPTED", "SHIPPED", "DELIVERED", "ON_HOLD", "CANCELLED"] as const;
const OPEN = new Set<string>(["RECEIVED", "AWAITING_PAYMENT", "IN_PROCESSING", "ACCEPTED", "ON_HOLD"]);
const PROMO_CODE_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;

const error = (status: number, code: string, message: string) => HttpResponse.json({ code, message }, { status });
const money = (n: number) => `$${n.toFixed(2)}`;

function customerById(id: string): User | null {
  for (const { user } of store.users.values()) if (user.id === id && user.role === "CUSTOMER") return user;
  return null;
}

function emailOf(userId: string): string | null {
  for (const { user } of store.users.values()) if (user.id === userId) return user.email;
  return null;
}

const accountOf = (userId: string) => store.customerAccounts.get(userId) ?? { status: "ACTIVE" as const, suspendedAt: null, suspendedReason: null, lastLoginAt: null };

const ordersOf = (userId: string): Order[] =>
  Array.from(store.orders.values())
    .map(({ order }) => order)
    .filter((o) => o.userId === userId);

// --- Orders -------------------------------------------------------------------------

function buckets(): AdminOrderBucket[] {
  const all = Array.from(store.orders.values()).map(({ order }) => order);
  return STATUSES.map((status) => ({ status, count: all.filter((o) => o.status === status).length, slaBreachedCount: 0 }));
}

function toListItem(o: Order) {
  const first = o.lines[0];
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    totalLabel: money(o.total),
    userEmail: o.userId ? emailOf(o.userId) : null,
    firstLineLabel: first ? `${first.billableDims.widthFt}' × ${first.billableDims.heightFt}'` : "—",
    placedAt: o.placedAt,
    slaBreached: false,
  };
}

/** Mirrors `AdminOrdersService.detail`: the customer-facing order plus staff-only blocks. */
function toAdminDetail(o: Order) {
  const customer = o.userId ? Array.from(store.users.values()).find((r) => r.user.id === o.userId)?.user : undefined;
  return {
    ...o,
    customer: { email: customer?.email ?? "unknown", firstName: customer?.firstName ?? null, lastName: customer?.lastName ?? null, phone: customer?.phone ?? null },
    slaBreached: false,
    items: o.lines.map((line) => {
      const art = line.artworkId ? store.artwork.get(line.artworkId) : undefined;
      return {
        ...line,
        productName: line.productId && line.productId in PRODUCTS ? PRODUCTS[line.productId as keyof typeof PRODUCTS].title : "Banner",
        configSnapshot: { material: line.material, dimensions: line.dimensions, finishing: line.finishing, quantity: line.quantity },
        artwork: art ? { id: art.id, filename: art.filename, mimeType: art.mime, sizeBytes: art.size, widthPx: art.widthPx ?? null, heightPx: art.heightPx ?? null, previewUrl: art.previewUrl } : null,
      };
    }),
    dropship: null,
    shipment: o.fedexTracking ? { carrier: "FEDEX", trackingNumber: o.fedexTracking.trackingNumber, labelFileId: o.fedexTracking.labelFileId, shippedAt: null, deliveredAt: null } : null,
  };
}

// --- Customers ------------------------------------------------------------------------

const customerAddresses = (userId: string): SavedAddress[] =>
  Array.from(store.addresses.values())
    .filter((a) => a.userId === userId)
    .map(({ userId: _u, ...address }) => address);

function toCustomerItem(user: User): AdminCustomerListItem {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName || null,
    phone: user.phone ?? null,
    role: "CUSTOMER",
    status: accountOf(user.id).status,
    rewardsPoints: user.rewardsPoints,
    orderCount: ordersOf(user.id).length,
    createdAt: user.createdAt,
  };
}

function toCustomerDetail(user: User): AdminCustomerDetail {
  const account = accountOf(user.id);
  const orders = ordersOf(user.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return {
    user: { ...user, savedAddresses: customerAddresses(user.id) },
    account: {
      status: account.status,
      suspendedAt: account.suspendedAt,
      suspendedReason: account.suspendedReason,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      lastLoginAt: account.lastLoginAt,
      rewardBalanceCents: user.rewardsPoints,
      orderCount: orders.length,
    },
    addresses: customerAddresses(user.id),
    orders: orders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus, totalLabel: money(o.total), createdAt: o.createdAt, placedAt: o.placedAt })),
  };
}

const ledgerOf = (userId: string): AdminRewardLedgerEntry[] =>
  store.ledger
    .filter((r) => r.userId === userId)
    .map(({ userId: _u, ...entry }) => ({ ...entry, createdBy: entry.reason === "ADJUSTMENT" ? "user_admin" : null, createdByEmail: entry.reason === "ADJUSTMENT" ? "admin@bannersin48.local" : null }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

// --- Promo codes ----------------------------------------------------------------------

function promoRules(input: { type: string; value: number; startsAt: string | null; endsAt: string | null }): Response | null {
  if (input.type === "PERCENT" && input.value > 100) return error(400, "PROMO_VALUE_INVALID", "A percentage discount cannot exceed 100%.");
  if (input.startsAt && input.endsAt && new Date(input.endsAt).getTime() <= new Date(input.startsAt).getTime()) {
    return error(400, "PROMO_WINDOW_INVALID", "The end date must be after the start date.");
  }
  return null;
}

export const adminHandlers = [
  // --- Dashboard ---
  http.get(`${API}/admin/dashboard`, ({ request }) => {
    const actor = requirePermission(request, "orders:read");
    if (actor instanceof Response) return actor;
    const all = Array.from(store.orders.values()).map(({ order }) => order);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const b = buckets();
    return HttpResponse.json({
      buckets: b,
      today: {
        since: since.toISOString(),
        placed: all.filter((o) => o.placedAt && new Date(o.placedAt) >= since).length,
        paid: all.filter((o) => o.paymentStatus !== "PENDING_PAYMENT" && new Date(o.updatedAt) >= since).length,
        shipped: all.filter((o) => (o.status === "SHIPPED" || o.status === "DELIVERED") && new Date(o.updatedAt) >= since).length,
      },
      openOrders: b.filter((x) => OPEN.has(x.status)).reduce((sum, x) => sum + x.count, 0),
      slaBreachedCount: 0,
      updatedAt: new Date().toISOString(),
    });
  }),

  // --- Order board reads ---
  http.get(`${API}/admin/orders/buckets`, ({ request }) => {
    const actor = requirePermission(request, "orders:read");
    if (actor instanceof Response) return actor;
    return HttpResponse.json({ buckets: buckets(), updatedAt: new Date().toISOString() });
  }),

  http.get(`${API}/admin/orders`, ({ request }) => {
    const actor = requirePermission(request, "orders:read");
    if (actor instanceof Response) return actor;
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Math.min(100, Number(url.searchParams.get("pageSize") ?? 25));
    const rows = Array.from(store.orders.values())
      .map(({ order }) => order)
      .filter((o) => !status || o.status === status)
      .sort((a, b) => ((a.placedAt ?? a.createdAt) < (b.placedAt ?? b.createdAt) ? 1 : -1));
    return HttpResponse.json({ page, pageSize, total: rows.length, items: rows.slice((page - 1) * pageSize, page * pageSize).map(toListItem) });
  }),

  http.get(`${API}/admin/orders/:id`, ({ request, params }) => {
    const actor = requirePermission(request, "orders:read");
    if (actor instanceof Response) return actor;
    const rec = store.orders.get(String(params.id));
    if (!rec) return error(404, "NOT_FOUND", "Order not found.");
    return HttpResponse.json(toAdminDetail(rec.order));
  }),

  /** Internal note: a same-status event the customer is never emailed about, plus an audit row. */
  http.post(`${API}/admin/orders/:id/note`, async ({ request, params }) => {
    const actor = requirePermission(request, "orders:note");
    if (actor instanceof Response) return actor;
    const rec = store.orders.get(String(params.id));
    if (!rec) return error(404, "NOT_FOUND", "Order not found.");
    const body = (await request.json()) as { note?: string };
    const note = body.note?.trim() ?? "";
    if (!note || note.length > 1000) return error(400, "VALIDATION", "A note of 1–1000 characters is required.");
    const now = new Date().toISOString();
    rec.order = { ...rec.order, updatedAt: now, events: [...rec.order.events, { id: `evt_${store.auditIdCounter}`, fromStatus: rec.order.status, toStatus: rec.order.status, actor: "staff", note, createdAt: now }] };
    record(actor, "order.note", "order", rec.order.id, { note });
    return HttpResponse.json(toAdminDetail(rec.order), { status: 201 });
  }),

  // --- Customers (CUSTOMER-kind accounts only) ---
  http.get(`${API}/admin/customers`, ({ request }) => {
    const actor = requirePermission(request, "customers:read");
    if (actor instanceof Response) return actor;
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Math.min(100, Number(url.searchParams.get("pageSize") ?? 25));
    const rows = Array.from(store.users.values())
      .map(({ user }) => user)
      .filter((u) => u.role === "CUSTOMER")
      .filter((u) => !search || [u.email, u.fullName, u.firstName, u.lastName].some((v) => typeof v === "string" && v.toLowerCase().includes(search)))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return HttpResponse.json({ page, pageSize, total: rows.length, items: rows.slice((page - 1) * pageSize, page * pageSize).map(toCustomerItem) });
  }),

  http.get(`${API}/admin/customers/:id`, ({ request, params }) => {
    const actor = requirePermission(request, "customers:read");
    if (actor instanceof Response) return actor;
    const id = decodeURIComponent(String(params.id));
    const user = customerById(id) ?? Array.from(store.users.values()).find((r) => r.user.email === id.toLowerCase() && r.user.role === "CUSTOMER")?.user;
    if (!user) return error(404, "NOT_FOUND", "Customer not found.");
    return HttpResponse.json(toCustomerDetail(user));
  }),

  http.patch(`${API}/admin/customers/:id`, async ({ request, params }) => {
    const actor = requirePermission(request, "customers:update");
    if (actor instanceof Response) return actor;
    const user = customerById(String(params.id));
    if (!user) return error(404, "NOT_FOUND", "Customer not found.");
    const body = (await request.json()) as { firstName?: string; lastName?: string; phone?: string | null };
    const before = { firstName: user.firstName ?? null, lastName: user.lastName ?? null, phone: user.phone ?? null };
    if (body.firstName !== undefined) user.firstName = body.firstName.trim();
    if (body.lastName !== undefined) user.lastName = body.lastName.trim();
    if (body.phone !== undefined) user.phone = body.phone?.trim() || null;
    user.fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
    const after = { firstName: user.firstName ?? null, lastName: user.lastName ?? null, phone: user.phone ?? null };
    const diff = Object.fromEntries((Object.keys(after) as Array<keyof typeof after>).filter((k) => before[k] !== after[k]).map((k) => [k, { from: before[k], to: after[k] }]));
    record(actor, "customer.update", "user", user.id, diff);
    return HttpResponse.json(toCustomerDetail(user));
  }),

  http.post(`${API}/admin/customers/:id/suspend`, async ({ request, params }) => {
    const actor = requirePermission(request, "customers:suspend");
    if (actor instanceof Response) return actor;
    const user = customerById(String(params.id));
    if (!user) return error(404, "NOT_FOUND", "Customer not found.");
    const account = accountOf(user.id);
    if (account.status === "SUSPENDED") return error(409, "ALREADY_SUSPENDED", "This account is already suspended.");
    const body = (await request.json()) as { reason?: string };
    const reason = body.reason?.trim() ?? "";
    if (reason.length < 3 || reason.length > 200) return error(400, "VALIDATION", "Give a reason (3–200 characters).");
    store.customerAccounts.set(user.id, { ...account, status: "SUSPENDED", suspendedAt: new Date().toISOString(), suspendedReason: reason });
    record(actor, "customer.suspend", "user", user.id, { status: { from: "ACTIVE", to: "SUSPENDED" }, reason });
    return HttpResponse.json(toCustomerDetail(user), { status: 201 });
  }),

  http.post(`${API}/admin/customers/:id/reactivate`, async ({ request, params }) => {
    const actor = requirePermission(request, "customers:suspend");
    if (actor instanceof Response) return actor;
    const user = customerById(String(params.id));
    if (!user) return error(404, "NOT_FOUND", "Customer not found.");
    const account = accountOf(user.id);
    if (account.status !== "SUSPENDED") return error(409, "NOT_SUSPENDED", "This account is not suspended.");
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    store.customerAccounts.set(user.id, { ...account, status: "ACTIVE", suspendedAt: null, suspendedReason: null });
    record(actor, "customer.reactivate", "user", user.id, { status: { from: "SUSPENDED", to: "ACTIVE" }, previousReason: account.suspendedReason, reason: body.reason?.trim() || null });
    return HttpResponse.json(toCustomerDetail(user), { status: 201 });
  }),

  http.post(`${API}/admin/customers/:id/reset-password`, ({ request, params }) => {
    const actor = requirePermission(request, "customers:reset_password");
    if (actor instanceof Response) return actor;
    const user = customerById(String(params.id));
    if (!user) return error(404, "NOT_FOUND", "Customer not found.");
    record(actor, "customer.admin_password_reset", "user", user.id, { requestedBy: { from: null, to: actor.id }, targetRole: "CUSTOMER" });
    return HttpResponse.json({ ok: true }, { status: 201 });
  }),

  // --- Rewards ---
  http.get(`${API}/admin/customers/:id/rewards`, ({ request, params }) => {
    const actor = requirePermission(request, "rewards:read");
    if (actor instanceof Response) return actor;
    const user = customerById(String(params.id));
    if (!user) return error(404, "NOT_FOUND", "Customer not found.");
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Math.min(100, Number(url.searchParams.get("pageSize") ?? 25));
    const ledger = ledgerOf(user.id);
    return HttpResponse.json({ balanceCents: user.rewardsPoints, page, pageSize, total: ledger.length, ledger: ledger.slice((page - 1) * pageSize, page * pageSize) });
  }),

  /** One "transaction": the balance never goes below zero, and a refused debit writes nothing. */
  http.post(`${API}/admin/customers/:id/rewards/adjust`, async ({ request, params }) => {
    const actor = requirePermission(request, "rewards:adjust");
    if (actor instanceof Response) return actor;
    const user = customerById(String(params.id));
    if (!user) return error(404, "NOT_FOUND", "Customer not found.");
    const body = (await request.json()) as { deltaCents?: number; reason?: string };
    const delta = Number(body.deltaCents);
    const reason = body.reason?.trim() ?? "";
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 50_000) return error(400, "VALIDATION", "Amount must be whole, non-zero cents up to $500.");
    if (reason.length < 10 || reason.length > 200) return error(400, "VALIDATION", "Give a reason (10–200 characters).");
    if (user.rewardsPoints + delta < 0) return error(409, "INSUFFICIENT_BALANCE", "The customer's reward balance is lower than the amount to deduct.");
    const from = user.rewardsPoints;
    user.rewardsPoints += delta;
    const entry = { id: `rl_${store.auditIdCounter}_${Date.now()}`, userId: user.id, deltaCents: delta, reason: "ADJUSTMENT" as const, orderId: null, orderNumber: null, createdAt: new Date().toISOString() };
    store.ledger.unshift(entry);
    record(actor, "reward.adjust", "user", user.id, { ledgerId: entry.id, deltaCents: delta, reason, balanceCents: { from, to: user.rewardsPoints } });
    const { userId: _u, ...wire } = entry;
    return HttpResponse.json({ balanceCents: user.rewardsPoints, entry: { ...wire, createdBy: actor.id, createdByEmail: actor.email } }, { status: 201 });
  }),

  // --- Promo codes ---
  http.get(`${API}/admin/promos`, ({ request }) => {
    const actor = requirePermission(request, "promos:read");
    if (actor instanceof Response) return actor;
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").trim().toUpperCase();
    const active = url.searchParams.get("active");
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Math.min(100, Number(url.searchParams.get("pageSize") ?? 25));
    const rows = store.promos
      .filter((p) => (active === null || p.active === (active === "true")) && (!search || p.code.includes(search)))
      .sort((a, b) => Number(b.active) - Number(a.active) || (a.createdAt < b.createdAt ? 1 : -1));
    return HttpResponse.json({ page, pageSize, total: rows.length, items: rows.slice((page - 1) * pageSize, page * pageSize) });
  }),

  http.get(`${API}/admin/promos/:id`, ({ request, params }) => {
    const actor = requirePermission(request, "promos:read");
    if (actor instanceof Response) return actor;
    const promo = store.promos.find((p) => p.id === params.id);
    return promo ? HttpResponse.json(promo) : error(404, "NOT_FOUND", "Promo code not found.");
  }),

  http.post(`${API}/admin/promos`, async ({ request }) => {
    const actor = requirePermission(request, "promos:write");
    if (actor instanceof Response) return actor;
    const body = (await request.json()) as PromoCodeBody;
    if (typeof body.code !== "string" || !PROMO_CODE_PATTERN.test(body.code)) return error(400, "VALIDATION", "Codes are 3–40 letters, digits, dashes or underscores.");
    if (!["PERCENT", "FIXED"].includes(body.type) || !(Number(body.value) > 0)) return error(400, "VALIDATION", "Type and a positive value are required.");
    const code = body.code.trim().toUpperCase();
    if (store.promos.some((p) => p.code === code)) return error(409, "PROMO_CODE_TAKEN", `Promo code ${code} already exists.`);
    const invalid = promoRules({ type: body.type, value: Number(body.value), startsAt: body.startsAt ?? null, endsAt: body.endsAt ?? null });
    if (invalid) return invalid;
    const now = new Date().toISOString();
    const promo: AdminPromoCode = {
      id: `promo_${store.promoIdCounter++}`,
      code,
      type: body.type,
      value: Number(body.value).toFixed(2),
      minOrder: Number(body.minOrder ?? 0).toFixed(2),
      maxUses: body.maxUses ?? null,
      perUserLimit: body.perUserLimit ?? null,
      timesUsed: 0,
      startsAt: body.startsAt ?? null,
      endsAt: body.endsAt ?? null,
      active: body.active ?? true,
      createdAt: now,
      updatedAt: now,
    };
    store.promos.unshift(promo);
    record(actor, "promo_code.create", "promo_code", promo.id, { after: promo });
    return HttpResponse.json(promo, { status: 201 });
  }),

  http.patch(`${API}/admin/promos/:id`, async ({ request, params }) => {
    const actor = requirePermission(request, "promos:write");
    if (actor instanceof Response) return actor;
    const promo = store.promos.find((p) => p.id === params.id);
    if (!promo) return error(404, "NOT_FOUND", "Promo code not found.");
    const body = (await request.json()) as Partial<PromoCodeBody>;
    const next: AdminPromoCode = { ...promo };
    if (body.code !== undefined) {
      if (!PROMO_CODE_PATTERN.test(body.code)) return error(400, "VALIDATION", "Codes are 3–40 letters, digits, dashes or underscores.");
      next.code = body.code.trim().toUpperCase();
      if (store.promos.some((p) => p.id !== promo.id && p.code === next.code)) return error(409, "PROMO_CODE_TAKEN", `Promo code ${next.code} already exists.`);
    }
    if (body.type !== undefined) next.type = body.type;
    if (body.value !== undefined) next.value = Number(body.value).toFixed(2);
    if (body.minOrder !== undefined) next.minOrder = Number(body.minOrder).toFixed(2);
    if (body.maxUses !== undefined) next.maxUses = body.maxUses;
    if (body.perUserLimit !== undefined) next.perUserLimit = body.perUserLimit;
    if (body.startsAt !== undefined) next.startsAt = body.startsAt;
    if (body.endsAt !== undefined) next.endsAt = body.endsAt;
    if (body.active !== undefined) next.active = body.active;
    const invalid = promoRules({ type: next.type, value: Number(next.value), startsAt: next.startsAt, endsAt: next.endsAt });
    if (invalid) return invalid;
    next.updatedAt = new Date().toISOString();
    const diff = Object.fromEntries((Object.keys(next) as Array<keyof AdminPromoCode>).filter((k) => k !== "updatedAt" && promo[k] !== next[k]).map((k) => [k, { from: promo[k], to: next[k] }]));
    Object.assign(promo, next);
    record(actor, "promo_code.update", "promo_code", promo.id, diff);
    return HttpResponse.json(promo);
  }),

  http.delete(`${API}/admin/promos/:id`, ({ request, params }) => {
    const actor = requirePermission(request, "promos:write");
    if (actor instanceof Response) return actor;
    const promo = store.promos.find((p) => p.id === params.id);
    if (!promo) return error(404, "NOT_FOUND", "Promo code not found.");
    if (promo.active) {
      promo.active = false;
      promo.updatedAt = new Date().toISOString();
      record(actor, "promo_code.deactivate", "promo_code", promo.id, { active: { from: true, to: false } });
    }
    return HttpResponse.json(promo);
  }),
];
