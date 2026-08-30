/**
 * Typed API client for Banners In 48.
 *
 * Hand-written now against @bannersin48/shared (backend M1 not yet shipped).
 * When backend openapi.json is generated, replace the body of each method with
 * `openapi-fetch` calls and the call signatures stay the same.
 */

import type {
  ApiClientConfig,
  QuoteResponse,
  ArtworkUploadResponse,
  CreateOrderInput,
  Order,
  OrderListItem,
  ReorderResponse,
  ApiError,
  BannerCatalogCard,
  BannerCatalogInfo,
} from "./types";
import type { DeliveryResponse, PopularSize, RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput, User, Address, AddressValidationResult } from "@bannersin48/shared";
import { POPULAR_SIZES } from "@bannersin48/shared";

export class ApiClientError extends Error {
  status: number;
  payload: ApiError | null;
  constructor(message: string, status: number, payload: ApiError | null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
  }
}

export class ApiClient {
  private baseUrl: string;
  private getToken?: () => string | null;
  private fetchImpl: typeof fetch;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.getToken = config.getToken;
    // Bind fetch — unbound `fetch` throws "Illegal invocation" in browsers.
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    init?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    };
    const token = this.getToken?.();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let bodyPayload: BodyInit | undefined;
    if (body !== undefined) {
      if (body instanceof FormData) {
        bodyPayload = body;
      } else {
        headers["Content-Type"] = "application/json";
        bodyPayload = JSON.stringify(body);
      }
    }

    const res = await this.fetchImpl(url, {
      method,
      headers,
      body: bodyPayload,
      credentials: "include",
      ...init,
    });

    if (!res.ok) {
      let payload: ApiError | null = null;
      try {
        payload = (await res.json()) as ApiError;
      } catch {
        // ignore parse errors
      }
      throw new ApiClientError(
        payload?.message ?? `${method} ${path} failed with ${res.status}`,
        res.status,
        payload,
      );
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  // --- Delivery engine ---
  getNextCutoff(): Promise<DeliveryResponse> {
    return this.request<DeliveryResponse>("GET", "/delivery/next-cutoff");
  }

  // --- Pricing engine ---
  quote(input: {
    productId?: string;
    material: string;
    dimensions: { widthFt: number; widthIn: number; heightFt: number; heightIn: number };
    finishing: import("@bannersin48/shared").Finishing;
    quantity: number;
  }): Promise<QuoteResponse> {
    return this.request<QuoteResponse>("POST", "/pricing/quote", input);
  }

  // --- Catalog ---
  getBannerCatalog(): Promise<BannerCatalogCard[]> {
    return this.request<BannerCatalogCard[]>("GET", "/catalog/banner");
  }

  getBannerCatalogInfo(slug: string): Promise<BannerCatalogInfo> {
    return this.request<BannerCatalogInfo>("GET", `/catalog/banner/${encodeURIComponent(slug)}`);
  }

  // --- Catalog ---
  getPopularSizes(): Promise<PopularSize[]> {
    return this.request<PopularSize[]>("GET", "/sizes/popular");
  }

  // --- Auth ---
  register(input: RegisterInput): Promise<{ user: User; token: string }> {
    return this.request("POST", "/auth/register", input);
  }
  login(input: LoginInput): Promise<{ user: User; token: string }> {
    return this.request("POST", "/auth/login", input);
  }
  logout(): Promise<void> {
    return this.request<void>("POST", "/auth/logout");
  }
  me(): Promise<User | null> {
    return this.request<User | null>("GET", "/auth/me");
  }

  /**
   * Requests a password reset token. Always resolves (the backend never
   * reveals whether an account exists for the submitted email).
   */
  forgotPassword(input: ForgotPasswordInput): Promise<{ ok: true }> {
    return this.request<{ ok: true }>("POST", "/auth/forgot-password", input);
  }

  /**
   * Completes a password reset using the emailed token. Invalid/expired
   * tokens surface as a 400 `ApiClientError`.
   */
  resetPassword(input: ResetPasswordInput): Promise<{ ok: true }> {
    return this.request<{ ok: true }>("POST", "/auth/reset-password", input);
  }

  // --- Artwork ---
  uploadArtwork(
    file: File,
    meta?: { widthPx?: number; heightPx?: number; dpi?: number },
  ): Promise<ArtworkUploadResponse> {
    const form = new FormData();
    form.append("file", file);
    if (meta?.widthPx) form.append("widthPx", String(meta.widthPx));
    if (meta?.heightPx) form.append("heightPx", String(meta.heightPx));
    if (meta?.dpi) form.append("dpi", String(meta.dpi));
    return this.request<ArtworkUploadResponse>("POST", "/artwork/upload", form);
  }

  listArtworkFolders(): Promise<import("@bannersin48/shared").ArtworkFolder[]> {
    return this.request("GET", "/artwork/folders");
  }

  listArtwork(folderId?: string): Promise<import("@bannersin48/shared").ArtworkLibraryItem[]> {
    const q = folderId ? `?folderId=${encodeURIComponent(folderId)}` : "";
    return this.request("GET", `/artwork/library${q}`);
  }

  // --- Address ---
  validateAddress(address: Address): Promise<AddressValidationResult> {
    return this.request<AddressValidationResult>("POST", "/address/validate", address);
  }

  // --- Orders ---
  listOrders(): Promise<OrderListItem[]> {
    return this.request<OrderListItem[]>("GET", "/orders");
  }
  getOrder(id: string): Promise<Order> {
    return this.request<Order>("GET", `/orders/${encodeURIComponent(id)}`);
  }
  createOrder(input: CreateOrderInput): Promise<Order> {
    return this.request<Order>("POST", "/orders", input);
  }
  cancelOrder(id: string): Promise<Order> {
    return this.request<Order>("POST", `/orders/${encodeURIComponent(id)}/cancel`);
  }

  // --- Reorder ---
  reorder(id: string): Promise<ReorderResponse> {
    return this.request("POST", `/orders/${encodeURIComponent(id)}/reorder`);
  }

  // Convenience: pre-load popular sizes synchronously from shared constants
  // (used as a fallback before /sizes/popular responds).
  static popularSizesFallback(): PopularSize[] {
    return POPULAR_SIZES as PopularSize[];
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
