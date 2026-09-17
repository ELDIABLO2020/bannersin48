/**
 * Typed API client for Banners In 48.
 *
 * Hand-written against @bannersin48/shared.
 */

import type {
  ApiClientConfig,
  QuoteResponse,
  ArtworkUploadResponse,
  CreateOrderInput,
  Order,
  OrderListItem,
  ReorderResponse,
  BannerCatalogCard,
  BannerCatalogInfo,
  ContentBlock,
} from "./types";
import { HttpClient } from "./http";
import type { DeliveryResponse, RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput, User, Address, AddressValidationResult } from "@bannersin48/shared";

export class ApiClient extends HttpClient {
  // --- Delivery engine ---
  getNextCutoff(): Promise<DeliveryResponse> {
    return this.request<DeliveryResponse>("GET", "/delivery/next-cutoff");
  }

  // --- Site content (published CMS blocks) ---
  listContent(): Promise<ContentBlock[]> {
    return this.request<ContentBlock[]>("GET", "/content");
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
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}
