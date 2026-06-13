/**
 * MSW request handlers — mock backend for frontend development & E2E.
 * Run with `npm run mocks` (configured in frontend).
 *
 * Important: do NOT import node-only modules here. MSW handlers run in both
 * Node (Vitest) and the browser (via msw/browser + service worker).
 */

import { http, HttpResponse } from "msw";
import { computeNextCutoff, store } from "./fixtures";
import { priceOrder, type Order, ORDER_STATUS_LABELS } from "@bannersin48/shared";

const uuid = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // Fallback (older runtimes)
  return "id-" + Math.random().toString(36).slice(2);
};

const API = "http://localhost:3001";

export const handlers = [
  // --- Delivery engine ---
  http.get(`${API}/delivery/next-cutoff`, () => {
    return HttpResponse.json(computeNextCutoff());
  }),

  // --- Pricing engine ---
  http.post(`${API}/pricing/quote`, async ({ request }) => {
    const body = (await request.json()) as {
      material: any;
      dimensions: any;
      finishing: any;
      quantity: number;
    };
    const result = priceOrder([body]);
    const cutoff = computeNextCutoff();
    return HttpResponse.json({
      lines: result.lines,
      subtotal: result.subtotal,
      shipping: result.shipping,
      total: result.total,
      eligible: result.lines.every((l) => l.eligible),
      guaranteedDeliveryDate: cutoff.guaranteedDeliveryDate,
      guaranteedDeliveryDow: cutoff.guaranteedDeliveryDow,
      cutoffInMs: cutoff.cutoffInMs,
      cutoffAtEt: cutoff.cutoffAtEt,
    });
  }),

  // --- Catalog ---
  http.get(`${API}/sizes/popular`, () => {
    return HttpResponse.json(store["popularSizes" as keyof typeof store] ?? []);
  }),

  // --- Auth ---
  http.post(`${API}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string; fullName: string };
    if (store.users.has(body.email)) {
      return HttpResponse.json({ code: "EMAIL_TAKEN", message: "An account with that email already exists." }, { status: 409 });
    }
    const user = {
      id: `user_${store.userIdCounter++}`,
      email: body.email,
      fullName: body.fullName,
      taxExempt: false,
      taxExemptApproved: false,
      rewardsPoints: 0,
      savedAddresses: [],
      createdAt: new Date().toISOString(),
    };
    store.users.set(body.email, { user, password: body.password });
    return HttpResponse.json({ user, token: `mock-token-${user.id}` }, { status: 201 });
  }),

  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    const record = store.users.get(body.email);
    if (!record || record.password !== body.password) {
      return HttpResponse.json({ code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." }, { status: 401 });
    }
    return HttpResponse.json({ user: record.user, token: `mock-token-${record.user.id}` });
  }),

  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),

  http.get(`${API}/auth/me`, ({ request }) => {
    const auth = request.headers.get("authorization") ?? "";
    if (!auth.startsWith("Bearer mock-token-")) {
      return HttpResponse.json(null, { status: 200 });
    }
    const id = auth.replace("Bearer mock-token-", "");
    for (const { user } of store.users.values()) {
      if (user.id === id) return HttpResponse.json(user);
    }
    return HttpResponse.json(null, { status: 200 });
  }),

  // --- Artwork upload ---
  http.post(`${API}/artwork/upload`, async ({ request }) => {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return HttpResponse.json({ code: "NO_FILE", message: "No file provided." }, { status: 400 });
    }
    const allowed = ["application/pdf", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      return HttpResponse.json(
        { code: "UNSUPPORTED_FILE_TYPE", message: "Only PDF, JPG, and JPEG files are accepted." },
        { status: 400 },
      );
    }
    const id = `art_${store.artworkIdCounter++}`;
    const previewUrl = file.type === "application/pdf" ? "/placeholder-pdf.png" : URL.createObjectURL(file);
    store.artwork.set(id, { id, filename: file.name, previewUrl, mime: file.type, size: file.size });
    return HttpResponse.json({
      artworkId: id,
      previewUrl,
      meta: {
        mimeType: file.type as "application/pdf" | "image/jpeg",
        sizeBytes: file.size,
      },
    });
  }),

  // --- Address validation (deterministic mock) ---
  http.post(`${API}/address/validate`, async ({ request }) => {
    const body = (await request.json()) as Record<string, any>;
    // Simulate a known-bad input → needs acknowledgement
    if (typeof body.postalCode === "string" && body.postalCode.startsWith("00000")) {
      return HttpResponse.json({
        valid: false,
        suggested: body,
        requiresAcknowledgement: true,
        message: "We could not verify this address. Unverified-address orders ship at customer risk and may not qualify for the delivery guarantee.",
      });
    }
    return HttpResponse.json({ valid: true, requiresAcknowledgement: false, suggested: body });
  }),

  // --- Orders ---
  http.get(`${API}/orders`, () => {
    const items = Array.from(store.orders.values()).map(({ order }) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      totalLabel: `$${order.total.toFixed(2)}`,
      createdAt: order.createdAt,
      firstLineLabel: order.lines[0] ? `${order.lines[0].billableDims.widthFt}' × ${order.lines[0].billableDims.heightFt}'` : "—",
      firstLineQty: order.lines[0]?.quantity ?? 0,
      guaranteedDeliveryDate: order.guaranteedDeliveryDate,
    }));
    // Sort newest first
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return HttpResponse.json(items);
  }),

  http.get(`${API}/orders/:id`, ({ params }) => {
    const rec = store.orders.get(params["id"] as string);
    if (!rec) return HttpResponse.json({ code: "NOT_FOUND", message: "Order not found." }, { status: 404 });
    return HttpResponse.json(rec.order);
  }),

  http.post(`${API}/orders`, async ({ request }) => {
    const body = (await request.json()) as any;
    const priced = priceOrder(body.lines);
    const cutoff = computeNextCutoff();
    const id = `ord_${store.orderIdCounter++}`;
    const orderNumber = `BI48-${String(store.orderIdCounter).padStart(6, "0")}`;
    const order: Order = {
      id,
      orderNumber,
      email: body.email,
      lines: priced.lines.map((l, i) => ({
        id: `line_${i}_${uuid()}`,
        material: body.lines[i].material,
        dimensions: body.lines[i].dimensions,
        finishing: body.lines[i].finishing,
        quantity: body.lines[i].quantity,
        artworkId: body.lines[i].artworkId,
        unitProduct: l.unitProduct,
        addons: l.addons,
        productSubtotal: l.productSubtotal,
        shipping: l.shipping,
        totalBeforeTax: l.totalBeforeTax,
        billableSqFt: l.billableSqFt,
        billableDims: l.billableDims,
      })),
      status: "AWAITING_PROOF_APPROVAL" as const,
      subtotal: priced.subtotal,
      shipping: priced.shipping,
      tax: 0,
      rewardsDiscount: 0,
      total: priced.total,
      shipTo: body.shipTo,
      artworkIds: body.lines.map((l: any) => l.artworkId).filter(Boolean),
      guaranteedDeliveryDate: cutoff.guaranteedDeliveryDate,
      guaranteedDeliveryDow: cutoff.guaranteedDeliveryDow,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.orders.set(id, { order });
    return HttpResponse.json(order, { status: 201 });
  }),

  http.post(`${API}/orders/:id/approve-proof`, async ({ params, request }) => {
    const rec = store.orders.get(params["id"] as string);
    if (!rec) return HttpResponse.json({ code: "NOT_FOUND", message: "Order not found." }, { status: 404 });
    const body = (await request.json()) as { acknowledgements: Record<string, boolean> };
    const allAcked = Object.values(body.acknowledgements).every(Boolean);
    if (!allAcked) {
      return HttpResponse.json(
        { code: "ACKNOWLEDGEMENTS_REQUIRED", message: "All acknowledgements must be confirmed." },
        { status: 400 },
      );
    }
    const now = new Date();
    const windowMs = store.cancellationWindowMs();
    const order = {
      ...rec.order,
      status: "CANCELLATION_WINDOW" as const,
      proofApprovedAt: now.toISOString(),
      cancellationWindowExpiresAt: new Date(now.getTime() + windowMs).toISOString(),
      updatedAt: now.toISOString(),
    };
    // Schedule the auto-advance
    if (rec.cancellationTimeoutId) clearTimeout(rec.cancellationTimeoutId);
    const timeoutId = setTimeout(() => {
      const current = store.orders.get(order.id);
      if (!current) return;
      const advanced: Order = {
        ...current.order,
        status: "READY_FOR_TRANSFER",
        updatedAt: new Date().toISOString(),
        productionPackage: { orderId: order.id, generatedAt: new Date().toISOString() },
      };
      store.orders.set(order.id, { order: advanced });
    }, windowMs);
    rec.cancellationTimeoutId = timeoutId;
    rec.order = order;
    return HttpResponse.json(order);
  }),

  http.post(`${API}/orders/:id/cancel`, ({ params }) => {
    const rec = store.orders.get(params["id"] as string);
    if (!rec) return HttpResponse.json({ code: "NOT_FOUND", message: "Order not found." }, { status: 404 });
    if (rec.order.status !== "CANCELLATION_WINDOW") {
      return HttpResponse.json(
        { code: "TOO_LATE", message: "The cancellation window has expired." },
        { status: 409 },
      );
    }
    if (rec.cancellationTimeoutId) clearTimeout(rec.cancellationTimeoutId);
    const order: Order = { ...rec.order, status: "CANCELLED" as const, updatedAt: new Date().toISOString() };
    rec.order = order;
    return HttpResponse.json(order);
  }),

  // --- Reorder (artwork-locked) ---
  http.post(`${API}/orders/:id/reorder`, ({ params }) => {
    const rec = store.orders.get(params["id"] as string);
    if (!rec) return HttpResponse.json({ code: "NOT_FOUND", message: "Order not found." }, { status: 404 });
    return HttpResponse.json({
      cartLineId: `cart_${uuid()}`,
      order: rec.order,
    });
  }),
];

export { ORDER_STATUS_LABELS };
