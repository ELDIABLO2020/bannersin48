/**
 * MSW handlers for the customer account surface (plan §4.2): profile,
 * settings, address book, sessions, reward ledger, saved designs, the email
 * change / verification flow and artwork folder CRUD. Every handler is scoped
 * to the bearer token's user, like the backend: another user's row answers
 * 404, never 403.
 *
 * No node-only imports: these run in Vitest and in the browser service worker.
 */

import { http, HttpResponse } from "msw";
import { PRODUCTS, computeNextCutoff, priceOrder, productIdForMaterial, type Material, type ProductId, type SavedAddress, type User } from "@bannersin48/shared";
import { store } from "./fixtures";
import type { DesignConfig, SavedDesign } from "../account";

const API = "http://localhost:3001";

const error = (status: number, code: string, message: string) => HttpResponse.json({ code, message }, { status });

function loginRecord(request: Request): { user: User; password: string } | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer mock-token-")) return null;
  const id = auth.slice("Bearer mock-token-".length);
  for (const record of store.users.values()) if (record.user.id === id) return record;
  return null;
}

/** 401 without a token, 403 PASSWORD_CHANGE_REQUIRED for temp-password accounts (mirrors JwtAuthGuard). */
function requireUser(request: Request, allowPasswordChangeRequired = false): { user: User; password: string } | Response {
  const record = loginRecord(request);
  if (!record) return error(401, "UNAUTHORIZED", "Authentication is required.");
  if (record.user.mustChangePassword && !allowPasswordChangeRequired) {
    return error(403, "PASSWORD_CHANGE_REQUIRED", "Set a new password before continuing.");
  }
  return record;
}

const myAddresses = (userId: string): SavedAddress[] =>
  Array.from(store.addresses.values())
    .filter((a) => a.userId === userId)
    .sort((a, b) => Number(b.isDefaultShipping) - Number(a.isDefaultShipping))
    .map(({ userId: _u, ...address }) => address);

/** `/users/me` answers the profile with the address book attached, like the real API. */
function profileOf(user: User): User {
  return { ...user, savedAddresses: myAddresses(user.id) };
}

/** The mock session that stands in for "this device" (the real API matches the token's `sid`). */
const currentSessionId = (userId: string) => (userId === "user_demo" ? "sess_demo_current" : `sess_${userId}_current`);

const publicDesign = ({ userId: _u, ...design }: SavedDesign & { userId: string }): SavedDesign => design;

function normalizeAddress(body: Record<string, unknown>) {
  const text = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ");
  return {
    label: text(body.label) || null,
    line1: text(body.line1),
    line2: text(body.line2) || null,
    city: text(body.city),
    state: text(body.state).toUpperCase(),
    zip: text(body.zip),
    country: (text(body.country) || "US").toUpperCase(),
  };
}

function validateAddress(body: Record<string, unknown>): string | null {
  const a = normalizeAddress(body);
  if (a.line1.length < 3) return "Street address is required.";
  if (a.city.length < 2) return "City is required.";
  if (a.state.length !== 2) return "Use the two-letter state code.";
  if (!/^\d{5}(?:-\d{4})?$/.test(a.zip)) return "Enter a valid ZIP code.";
  return null;
}

export const accountHandlers = [
  // --- Profile & settings ---
  http.get(`${API}/users/me`, ({ request }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    return HttpResponse.json(profileOf(record.user));
  }),

  http.patch(`${API}/users/me`, async ({ request }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const body = (await request.json()) as { firstName?: string; lastName?: string; phone?: string };
    const user = record.user;
    if (body.firstName !== undefined) user.firstName = body.firstName.trim();
    if (body.lastName !== undefined) user.lastName = body.lastName.trim();
    if (body.phone !== undefined) user.phone = body.phone.trim() || null;
    user.fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
    return HttpResponse.json(profileOf(user));
  }),

  http.patch(`${API}/users/me/settings`, async ({ request }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const body = (await request.json()) as { notifyOrderUpdates?: boolean; notifyMarketing?: boolean };
    if (body.notifyOrderUpdates !== undefined) record.user.notifyOrderUpdates = body.notifyOrderUpdates;
    if (body.notifyMarketing !== undefined) record.user.notifyMarketing = body.notifyMarketing;
    return HttpResponse.json(profileOf(record.user));
  }),

  // --- Email change & verification (links only ever reach the email transport; the mock keeps raw tokens) ---
  http.post(`${API}/users/me/email`, async ({ request }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const body = (await request.json()) as { newEmail: string; currentPassword: string };
    if (record.password !== body.currentPassword) return error(400, "INVALID_CURRENT_PASSWORD", "Your current password is incorrect.");
    const newEmail = body.newEmail.trim().toLowerCase();
    if (newEmail === record.user.email) return error(400, "EMAIL_UNCHANGED", "That is already the email on this account.");
    if (store.users.has(newEmail)) return error(409, "EMAIL_TAKEN", "An account with that email already exists.");
    record.user.pendingEmail = newEmail;
    for (const [token, t] of store.actionTokens) if (t.userId === record.user.id && t.purpose === "EMAIL_CHANGE") store.actionTokens.delete(token);
    store.actionTokens.set(`mock-email-change-${record.user.id}`, { userId: record.user.id, purpose: "EMAIL_CHANGE", payload: { newEmail } });
    return HttpResponse.json({ ok: true, pendingEmail: newEmail }, { status: 201 });
  }),

  http.post(`${API}/users/me/email/resend-verification`, ({ request }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    if (record.user.emailVerifiedAt) return error(409, "ALREADY_VERIFIED", "This email is already verified.");
    store.actionTokens.set(`mock-verify-${record.user.id}`, { userId: record.user.id, purpose: "EMAIL_VERIFY", payload: { email: record.user.email } });
    return HttpResponse.json({ ok: true }, { status: 201 });
  }),

  http.post(`${API}/auth/confirm-email-change`, async ({ request }) => {
    const body = (await request.json()) as { token: string };
    const token = store.actionTokens.get(body.token);
    if (!token || token.purpose !== "EMAIL_CHANGE") return error(400, "TOKEN_INVALID", "This link is invalid or has expired.");
    const newEmail = token.payload.newEmail!;
    if (store.users.has(newEmail)) return error(409, "EMAIL_TAKEN", "An account with that email already exists.");
    store.actionTokens.delete(body.token);
    for (const [email, record] of store.users) {
      if (record.user.id !== token.userId) continue;
      store.users.delete(email);
      record.user.email = newEmail;
      record.user.emailVerifiedAt = new Date().toISOString();
      record.user.pendingEmail = null;
      store.users.set(newEmail, record);
      for (const s of store.sessions) if (s.userId === token.userId) s.revoked = true;
      break;
    }
    return HttpResponse.json({ ok: true, email: newEmail }, { status: 201 });
  }),

  http.post(`${API}/auth/verify-email`, async ({ request }) => {
    const body = (await request.json()) as { token: string };
    const token = store.actionTokens.get(body.token);
    if (!token || token.purpose !== "EMAIL_VERIFY") return error(400, "TOKEN_INVALID", "This link is invalid or has expired.");
    for (const record of store.users.values()) {
      if (record.user.id !== token.userId) continue;
      if (record.user.email !== token.payload.email) return error(400, "TOKEN_INVALID", "This link is invalid or has expired.");
      record.user.emailVerifiedAt = new Date().toISOString();
    }
    store.actionTokens.delete(body.token);
    return HttpResponse.json({ ok: true }, { status: 201 });
  }),

  // --- Address book ---
  http.get(`${API}/users/me/addresses`, ({ request }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    return HttpResponse.json(myAddresses(record.user.id));
  }),

  http.post(`${API}/users/me/addresses`, async ({ request }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const body = (await request.json()) as Record<string, unknown>;
    const problem = validateAddress(body);
    if (problem) return error(400, "VALIDATION", problem);
    const userId = record.user.id;
    const mine = myAddresses(userId);
    const isDefault = body.isDefaultShipping === true || mine.length === 0;
    if (isDefault) for (const a of store.addresses.values()) if (a.userId === userId) a.isDefaultShipping = false;
    const address = { id: `addr_${store.addressIdCounter++}`, userId, ...normalizeAddress(body), isDefaultShipping: isDefault };
    store.addresses.set(address.id, address);
    const { userId: _u, ...out } = address;
    return HttpResponse.json(out, { status: 201 });
  }),

  http.patch(`${API}/users/me/addresses/:id`, async ({ request, params }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const address = store.addresses.get(String(params.id));
    if (!address || address.userId !== record.user.id) return error(404, "NOT_FOUND", "Address not found.");
    const body = (await request.json()) as Record<string, unknown>;
    const problem = validateAddress(body);
    if (problem) return error(400, "VALIDATION", problem);
    if (body.isDefaultShipping === true) for (const a of store.addresses.values()) if (a.userId === record.user.id) a.isDefaultShipping = false;
    Object.assign(address, normalizeAddress(body), body.isDefaultShipping !== undefined ? { isDefaultShipping: body.isDefaultShipping === true } : {});
    const { userId: _u, ...out } = address;
    return HttpResponse.json(out);
  }),

  http.post(`${API}/users/me/addresses/:id/default`, ({ request, params }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const address = store.addresses.get(String(params.id));
    if (!address || address.userId !== record.user.id) return error(404, "NOT_FOUND", "Address not found.");
    for (const a of store.addresses.values()) if (a.userId === record.user.id) a.isDefaultShipping = a.id === address.id;
    const { userId: _u, ...out } = address;
    return HttpResponse.json(out);
  }),

  http.delete(`${API}/users/me/addresses/:id`, ({ request, params }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const address = store.addresses.get(String(params.id));
    if (!address || address.userId !== record.user.id) return error(404, "NOT_FOUND", "Address not found.");
    store.addresses.delete(address.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Sessions ---
  http.get(`${API}/users/me/sessions`, ({ request }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const current = currentSessionId(record.user.id);
    const sessions = store.sessions.filter((s) => s.userId === record.user.id && !s.revoked);
    // The mock token itself is one live session even when the fixtures hold none for this user.
    if (!sessions.some((s) => s.id === current)) {
      const now = new Date();
      sessions.unshift({ id: current, userId: record.user.id, createdAt: now.toISOString(), lastUsedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 30 * 86_400_000).toISOString(), userAgent: "Mozilla/5.0 (mock)", ip: "127.0.0.0/24", revoked: false });
      store.sessions.push(sessions[0]!);
    }
    return HttpResponse.json(sessions.map(({ userId: _u, revoked: _r, ...s }) => ({ ...s, current: s.id === current })));
  }),

  http.delete(`${API}/users/me/sessions`, ({ request }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const current = currentSessionId(record.user.id);
    let revoked = 0;
    for (const s of store.sessions) {
      if (s.userId === record.user.id && !s.revoked && s.id !== current) {
        s.revoked = true;
        revoked++;
      }
    }
    return HttpResponse.json({ revoked });
  }),

  http.delete(`${API}/users/me/sessions/:id`, ({ request, params }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const session = store.sessions.find((s) => s.id === params.id);
    if (!session || session.userId !== record.user.id) return error(404, "NOT_FOUND", "Session not found.");
    session.revoked = true;
    return HttpResponse.json({ ok: true });
  }),

  // --- Rewards (read-only) ---
  http.get(`${API}/users/me/rewards`, ({ request }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 25)));
    const all = store.ledger.filter((r) => r.userId === record.user.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return HttpResponse.json({
      balanceCents: record.user.rewardsPoints,
      page,
      pageSize,
      total: all.length,
      ledger: all.slice((page - 1) * pageSize, page * pageSize).map(({ userId: _u, ...row }) => row),
    });
  }),

  // --- Saved designs ---
  http.get(`${API}/designs`, ({ request }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const mine = Array.from(store.designs.values())
      .filter((d) => d.userId === record.user.id)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .map(publicDesign);
    return HttpResponse.json(mine);
  }),

  http.post(`${API}/designs`, async ({ request }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const body = (await request.json()) as { name: string; productId: string; config: DesignConfig; artworkFileId?: string };
    const product = PRODUCTS[body.productId as ProductId];
    if (!product) return error(404, "NOT_FOUND", "Product not found.");
    if (Array.from(store.designs.values()).filter((d) => d.userId === record.user.id).length >= 50) {
      return error(409, "DESIGN_QUOTA", "You can keep up to 50 saved designs. Delete one you no longer need.");
    }
    const artwork = body.artworkFileId ? store.artwork.get(body.artworkFileId) : undefined;
    if (body.artworkFileId && artwork?.userId !== record.user.id) return error(400, "ARTWORK_INVALID", "Artwork does not exist in your library.");
    const now = new Date().toISOString();
    const design: SavedDesign & { userId: string } = {
      id: `design_${store.designIdCounter++}`,
      userId: record.user.id,
      name: body.name.trim(),
      productId: product.id,
      productSlug: product.slug,
      productName: product.title,
      config: { ...body.config, finishing: { ...product.defaultFinishing, ...body.config.finishing } },
      artworkFileId: artwork?.id ?? null,
      previewUrl: artwork?.previewUrl ?? null,
      createdAt: now,
      updatedAt: now,
    };
    store.designs.set(design.id, design);
    return HttpResponse.json(publicDesign(design), { status: 201 });
  }),

  http.get(`${API}/designs/:id`, ({ request, params }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const design = store.designs.get(String(params.id));
    if (!design || design.userId !== record.user.id) return error(404, "NOT_FOUND", "Design not found.");
    return HttpResponse.json(publicDesign(design));
  }),

  http.patch(`${API}/designs/:id`, async ({ request, params }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const design = store.designs.get(String(params.id));
    if (!design || design.userId !== record.user.id) return error(404, "NOT_FOUND", "Design not found.");
    const body = (await request.json()) as { name?: string; config?: DesignConfig; artworkFileId?: string | null };
    if (body.name !== undefined) {
      if (!body.name.trim()) return error(400, "VALIDATION", "Give the design a name.");
      design.name = body.name.trim();
    }
    if (body.config !== undefined) design.config = body.config;
    if (body.artworkFileId !== undefined) {
      if (body.artworkFileId === null) {
        design.artworkFileId = null;
        design.previewUrl = null;
      } else {
        const artwork = store.artwork.get(body.artworkFileId);
        if (artwork?.userId !== record.user.id) return error(400, "ARTWORK_INVALID", "Artwork does not exist in your library.");
        design.artworkFileId = artwork.id;
        design.previewUrl = artwork.previewUrl;
      }
    }
    design.updatedAt = new Date().toISOString();
    return HttpResponse.json(publicDesign(design));
  }),

  http.delete(`${API}/designs/:id`, ({ request, params }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const design = store.designs.get(String(params.id));
    if (!design || design.userId !== record.user.id) return error(404, "NOT_FOUND", "Design not found.");
    store.designs.delete(design.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/designs/:id/quote`, ({ request, params }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const design = store.designs.get(String(params.id));
    if (!design || design.userId !== record.user.id) return error(404, "NOT_FOUND", "Design not found.");
    const pricingInput = {
      productId: design.productId as ProductId,
      material: design.config.material as Material,
      dimensions: design.config.dimensions,
      finishing: design.config.finishing,
      quantity: design.config.quantity,
    };
    const priced = priceOrder([pricingInput]);
    const quoteId = `quote_${store.quoteIdCounter++}`;
    const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    store.quotes.set(quoteId, { request: pricingInput, validUntil, total: priced.total });
    const artworkId = design.artworkFileId && store.artwork.get(design.artworkFileId)?.userId === record.user.id ? design.artworkFileId : null;
    return HttpResponse.json(
      {
        designId: design.id,
        line: { productId: design.productId ?? productIdForMaterial(pricingInput.material), ...design.config, artworkId },
        quote: {
          quoteId,
          validUntil,
          currency: "USD",
          lines: priced.lines,
          subtotal: priced.subtotal,
          shipping: priced.shipping,
          tax: 0,
          total: priced.total,
          eligible: priced.lines.every((l) => l.eligible),
          ...computeNextCutoff(),
        },
      },
      { status: 201 },
    );
  }),

  // --- Artwork folders (the library and upload handlers live in handlers.ts) ---
  http.post(`${API}/artwork/folders`, async ({ request }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const body = (await request.json()) as { name: string };
    const name = body.name.trim().slice(0, 80);
    if (!name) return error(400, "VALIDATION", "Folder name is required.");
    const folder = { id: `folder_${store.artworkFolders.length + 1}_${Date.now().toString(36)}`, name, parentId: null };
    store.artworkFolders.push(folder);
    return HttpResponse.json(folder, { status: 201 });
  }),

  http.patch(`${API}/artwork/folders/:id`, async ({ request, params }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const folder = store.artworkFolders.find((f) => f.id === params.id);
    if (!folder || folder.id === "folder_home") return error(404, "NOT_FOUND", "Folder not found.");
    const body = (await request.json()) as { name: string };
    const name = body.name.trim().slice(0, 80);
    if (!name) return error(400, "VALIDATION", "Folder name is required.");
    folder.name = name;
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${API}/artwork/folders/:id`, ({ request, params }) => {
    const record = requireUser(request);
    if (record instanceof Response) return record;
    const index = store.artworkFolders.findIndex((f) => f.id === params.id);
    if (index < 0 || store.artworkFolders[index]!.id === "folder_home") return error(404, "NOT_FOUND", "Folder not found.");
    for (const art of store.artwork.values()) if (art.folderId === params.id) art.folderId = "folder_home";
    store.artworkFolders.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
