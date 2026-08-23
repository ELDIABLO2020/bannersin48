/**
 * Admin API client — staff-facing endpoints (/admin/*). Same conventions as
 * apiClient.ts: bearer token from config, JSON bodies, ApiClientError on !ok.
 * Artwork/label uploads send FormData.
 */

import type { ApiClientConfig, ApiError } from "./types";

export class AdminApiError extends Error {
  status: number;
  payload: ApiError | null;
  constructor(message: string, status: number, payload: ApiError | null) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.payload = payload;
  }
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
  items: Array<Record<string, unknown>>;
  dropship: { externalRef: string; submittedAt: string; notes?: string | null } | null;
  shipment: {
    carrier: string;
    trackingNumber: string | null;
    labelDownloadUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
  events: Array<{ id: string; fromStatus: string | null; toStatus: string; note: string | null; createdAt: string }>;
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

export class AdminApiClient {
  private baseUrl: string;
  private getToken?: () => string | null;
  private fetchImpl: typeof fetch;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.getToken = config.getToken;
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  private async request<T>(method: string, path: string, body?: unknown, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json", ...(init?.headers as Record<string, string>) };
    const token = this.getToken?.();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    let payload: BodyInit | undefined;
    if (body !== undefined) {
      if (body instanceof FormData) {
        payload = body;
      } else {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
      }
    }
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, { method, headers, body: payload, ...init });
    if (!res.ok) {
      let parsed: ApiError | null = null;
      try {
        parsed = (await res.json()) as ApiError;
      } catch {
        /* ignore */
      }
      throw new AdminApiError(parsed?.message ?? `${method} ${path} failed with ${res.status}`, res.status, parsed);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
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
    return this.request<{
      total: number;
      items: Array<{ id: string; email: string; fullName: string | null; role: string; status: string; rewardsPoints: number; orderCount: number; createdAt: string }>;
    }>("GET", `/admin/customers${q.size ? `?${q}` : ""}`);
  }

  customerDetail(idOrEmail: string) {
    return this.request<{
      user: { id: string; email: string; fullName: string; rewardsPoints: number; role?: string };
      addresses: Array<Record<string, string>>;
      orders: Array<{ id: string; orderNumber: string; status: string; paymentStatus: string; totalLabel: string; createdAt: string }>;
    }>("GET", `/admin/customers/${encodeURIComponent(idOrEmail)}`);
  }

  adminResetPassword(id: string) {
    return this.request<{ ok: true }>("POST", `/admin/customers/${encodeURIComponent(id)}/reset-password`);
  }
}
