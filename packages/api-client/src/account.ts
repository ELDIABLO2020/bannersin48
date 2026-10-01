/**
 * Customer account wire types (plan §4.2): sessions, reward ledger, saved
 * designs and the email-change flow. Mirrors backend/src/users/users.service.ts
 * and backend/src/designs/designs.service.ts; field names must not drift.
 */

import type { Finishing, PricingInput } from "@bannersin48/shared";
import type { QuoteResponse } from "./types";

/** `GET /users/me/sessions` row. Never carries the token itself. */
export interface SessionSummary {
  id: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  userAgent: string | null;
  /** Network only: IPv4 masked to /24, IPv6 to /64. */
  ip: string | null;
  /** The session that made the request. */
  current: boolean;
}

export type RewardReason = "ORDER_EARN" | "ADJUSTMENT" | "REDEMPTION";

export interface RewardLedgerEntry {
  id: string;
  /** Money as integer cents; negative for redemptions. */
  deltaCents: number;
  reason: RewardReason;
  orderId: string | null;
  orderNumber: string | null;
  createdAt: string;
}

/** `GET /users/me/rewards?page=&pageSize=` */
export interface RewardsPage {
  balanceCents: number;
  page: number;
  pageSize: number;
  total: number;
  ledger: RewardLedgerEntry[];
}

/** The builder configuration a saved design snapshots (the product is a separate field). */
export interface DesignConfig {
  material: string;
  dimensions: PricingInput["dimensions"];
  finishing: Finishing;
  quantity: number;
}

/** `GET /designs[/:id]` */
export interface SavedDesign {
  id: string;
  name: string;
  /** Catalog product code (`HD_BANNER`), as quotes and orders use it. */
  productId: string;
  productSlug: string;
  productName: string;
  config: DesignConfig;
  artworkFileId: string | null;
  /** Signed 5-minute preview link when artwork is attached; mint a fresh one with `artworkDownloadUrl`. */
  previewUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDesignInput {
  name: string;
  productId: string;
  config: DesignConfig;
  artworkFileId?: string;
}

export interface UpdateDesignInput {
  name?: string;
  config?: DesignConfig;
  /** `null` detaches the artwork. */
  artworkFileId?: string | null;
}

/** `POST /designs/:id/quote`: a cart-ready line priced at today's rates. */
export interface DesignQuoteResponse {
  designId: string;
  line: DesignConfig & { productId: string; artworkId: string | null };
  quote: QuoteResponse;
}

/** `POST /users/me/email` */
export interface EmailChangeResponse {
  ok: true;
  pendingEmail: string;
}
