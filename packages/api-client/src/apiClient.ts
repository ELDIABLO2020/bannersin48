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
import type {
  CreateDesignInput,
  DesignQuoteResponse,
  EmailChangeResponse,
  RewardsPage,
  SavedDesign,
  SessionSummary,
  UpdateDesignInput,
} from "./account";
import type {
  AcceptInviteInput,
  AccountSettingsInput,
  ChangePasswordInput,
  DeliveryResponse,
  EmailChangeInput,
  ProfileUpdateInput,
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  SavedAddress,
  SavedAddressInput,
  User,
  Address,
  AddressValidationResult,
} from "@bannersin48/shared";

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

  /** Redeems a staff invite token: sets the first password and signs in. Bad tokens surface as 400 `INVITE_INVALID`. */
  acceptInvite(input: AcceptInviteInput): Promise<{ user: User; token: string }> {
    return this.request("POST", "/auth/accept-invite", input);
  }

  /**
   * Signed-in password change. The only mutation an account with
   * `mustChangePassword` may perform; every other session is revoked.
   */
  changePassword(input: ChangePasswordInput): Promise<{ ok: true }> {
    return this.request<{ ok: true }>("POST", "/users/me/password", input);
  }

  /** Public: redeems the link emailed to the new address. Bad tokens surface as 400 `TOKEN_INVALID`. */
  confirmEmailChange(token: string): Promise<{ ok: true; email: string }> {
    return this.request("POST", "/auth/confirm-email-change", { token });
  }

  /** Public: redeems an email-verification link. */
  verifyEmail(token: string): Promise<{ ok: true }> {
    return this.request("POST", "/auth/verify-email", { token });
  }

  // --- Account (the signed-in customer's own data; owner-scoped) ---
  getProfile(): Promise<User> {
    return this.request<User>("GET", "/users/me");
  }

  updateProfile(input: ProfileUpdateInput): Promise<User> {
    return this.request<User>("PATCH", "/users/me", input);
  }

  updateSettings(input: AccountSettingsInput): Promise<User> {
    return this.request<User>("PATCH", "/users/me/settings", input);
  }

  /** Starts an email change; the confirmation link goes to the new address. Wrong password → 400 `INVALID_CURRENT_PASSWORD`; taken → 409 `EMAIL_TAKEN`. */
  requestEmailChange(input: EmailChangeInput): Promise<EmailChangeResponse> {
    return this.request<EmailChangeResponse>("POST", "/users/me/email", input);
  }

  resendVerification(): Promise<{ ok: true }> {
    return this.request<{ ok: true }>("POST", "/users/me/email/resend-verification");
  }

  listAddresses(): Promise<SavedAddress[]> {
    return this.request<SavedAddress[]>("GET", "/users/me/addresses");
  }

  createAddress(input: SavedAddressInput): Promise<SavedAddress> {
    return this.request<SavedAddress>("POST", "/users/me/addresses", input);
  }

  updateAddress(id: string, input: SavedAddressInput): Promise<SavedAddress> {
    return this.request<SavedAddress>("PATCH", `/users/me/addresses/${encodeURIComponent(id)}`, input);
  }

  setDefaultAddress(id: string): Promise<SavedAddress> {
    return this.request<SavedAddress>("POST", `/users/me/addresses/${encodeURIComponent(id)}/default`);
  }

  deleteAddress(id: string): Promise<void> {
    return this.request<void>("DELETE", `/users/me/addresses/${encodeURIComponent(id)}`);
  }

  listSessions(): Promise<SessionSummary[]> {
    return this.request<SessionSummary[]>("GET", "/users/me/sessions");
  }

  revokeSession(id: string): Promise<{ ok: true }> {
    return this.request<{ ok: true }>("DELETE", `/users/me/sessions/${encodeURIComponent(id)}`);
  }

  /** Signs out every device except this one. */
  revokeOtherSessions(): Promise<{ revoked: number }> {
    return this.request<{ revoked: number }>("DELETE", "/users/me/sessions");
  }

  getRewards(page = 1, pageSize = 25): Promise<RewardsPage> {
    return this.request<RewardsPage>("GET", `/users/me/rewards?page=${page}&pageSize=${pageSize}`);
  }

  // --- Saved designs ---
  listDesigns(): Promise<SavedDesign[]> {
    return this.request<SavedDesign[]>("GET", "/designs");
  }

  createDesign(input: CreateDesignInput): Promise<SavedDesign> {
    return this.request<SavedDesign>("POST", "/designs", input);
  }

  updateDesign(id: string, input: UpdateDesignInput): Promise<SavedDesign> {
    return this.request<SavedDesign>("PATCH", `/designs/${encodeURIComponent(id)}`, input);
  }

  deleteDesign(id: string): Promise<void> {
    return this.request<void>("DELETE", `/designs/${encodeURIComponent(id)}`);
  }

  /** Re-prices a saved design at current rates. Never creates an order. */
  quoteDesign(id: string): Promise<DesignQuoteResponse> {
    return this.request<DesignQuoteResponse>("POST", `/designs/${encodeURIComponent(id)}/quote`);
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

  createArtworkFolder(name: string): Promise<import("@bannersin48/shared").ArtworkFolder> {
    return this.request("POST", "/artwork/folders", { name });
  }

  renameArtworkFolder(id: string, name: string): Promise<void> {
    return this.request<void>("PATCH", `/artwork/folders/${encodeURIComponent(id)}`, { name });
  }

  /** Deleting a folder moves its files to the library root. */
  deleteArtworkFolder(id: string): Promise<void> {
    return this.request<void>("DELETE", `/artwork/folders/${encodeURIComponent(id)}`);
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
