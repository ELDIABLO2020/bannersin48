/**
 * MSW request handlers — mock backend for frontend development & E2E.
 * Run with `npm run mocks` (configured in frontend).
 *
 * Important: do NOT import node-only modules here. MSW handlers run in both
 * Node (Vitest) and the browser (via msw/browser + service worker).
 */

import { http, HttpResponse } from "msw";
import { computeNextCutoff, store } from "./fixtures";
import {
  priceOrder,
  type Order,
  ORDER_STATUS_LABELS,
  PRODUCTS,
  BANNER_HUB_ORDER,
  productBySlug,
  productIdForMaterial,
  type ProductId,
  type Material,
} from "@bannersin48/shared";

const uuid = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // Fallback (older runtimes)
  return "id-" + Math.random().toString(36).slice(2);
};

const API = "http://localhost:3001";

function authenticatedUserId(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer mock-token-")) return null;
  const id = auth.slice("Bearer mock-token-".length);
  return Array.from(store.users.values()).some(({ user }) => user.id === id) ? id : null;
}

function requireUser(request: Request): string | Response {
  const userId = authenticatedUserId(request);
  return userId ?? HttpResponse.json(
    { code: "UNAUTHORIZED", message: "Authentication is required." },
    { status: 401 },
  );
}

export const handlers = [
  // --- Delivery engine ---
  http.get(`${API}/delivery/next-cutoff`, () => {
    return HttpResponse.json(computeNextCutoff());
  }),

  // --- Pricing engine ---
  http.post(`${API}/pricing/quote`, async ({ request }) => {
    const body = (await request.json()) as {
      productId?: ProductId;
      material: Material;
      dimensions: any;
      finishing: any;
      quantity: number;
    };
    const productId = body.productId ?? productIdForMaterial(body.material);
    const config = PRODUCTS[productId];
    const finishing = {
      ...config.defaultFinishing,
      ...body.finishing,
    };
    const result = priceOrder([{ ...body, productId, finishing }]);
    const cutoff = computeNextCutoff();
    const quoteId = `quote_${store.quoteIdCounter++}`;
    const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    store.quotes.set(quoteId, {
      request: { ...body, productId, finishing },
      validUntil,
      total: result.total,
    });
    return HttpResponse.json({
      quoteId,
      validUntil,
      currency: "USD",
      lines: result.lines,
      subtotal: result.subtotal,
      shipping: result.shipping,
      tax: 0,
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

  http.get(`${API}/catalog/banner`, () =>
    HttpResponse.json(
      BANNER_HUB_ORDER.map((id) => {
        const p = PRODUCTS[id];
        return {
          id: p.id,
          slug: p.slug,
          title: p.title,
          subtitle: p.subtitle,
          hasMoreInfo: p.hasMoreInfo,
          route: `/order/${p.slug}`,
        };
      }),
    ),
  ),

  http.get(`${API}/catalog/banner/:slug`, ({ params }) => {
    const p = productBySlug(params["slug"] as string);
    if (!p || !p.hasMoreInfo) {
      return HttpResponse.json({ code: "NOT_FOUND", message: "Product not found." }, { status: 404 });
    }
    return HttpResponse.json({
      id: p.id,
      slug: p.slug,
      title: p.title,
      subtitle: p.subtitle,
      ...p.hubCopy,
    });
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

  // --- Artwork library ---
  http.get(`${API}/artwork/folders`, ({ request }) => {
    const auth = requireUser(request);
    if (typeof auth !== "string") return auth;
    return HttpResponse.json(store.artworkFolders);
  }),

  http.get(`${API}/artwork/library`, ({ request }) => {
    const auth = requireUser(request);
    if (typeof auth !== "string") return auth;
    const url = new URL(request.url);
    const folderId = url.searchParams.get("folderId") ?? "folder_home";
    const items = Array.from(store.artwork.values())
      .filter((a) => a.userId === auth && a.folderId === folderId)
      .map((a) => ({
        id: a.id,
        folderId: a.folderId,
        filename: a.filename,
        previewUrl: a.previewUrl,
        mimeType: a.mime,
        sizeBytes: a.size,
        widthPx: a.widthPx,
        heightPx: a.heightPx,
        dpi: a.dpi,
      }));
    return HttpResponse.json(items);
  }),

  // --- Artwork upload ---
  http.post(`${API}/artwork/upload`, async ({ request }) => {
    const auth = requireUser(request);
    if (typeof auth !== "string") return auth;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return HttpResponse.json({ code: "NO_FILE", message: "No file provided." }, { status: 400 });
    }
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (!allowed.includes(file.type)) {
      return HttpResponse.json(
        { code: "UNSUPPORTED_FILE_TYPE", message: "Only JPEG, PNG, and PDF files are supported." },
        { status: 400 },
      );
    }
    const widthPxRaw = form.get("widthPx");
    const heightPxRaw = form.get("heightPx");
    const dpiRaw = form.get("dpi");
    const widthPx = widthPxRaw ? Number(widthPxRaw) : undefined;
    const heightPx = heightPxRaw ? Number(heightPxRaw) : undefined;
    const dpi = dpiRaw ? Number(dpiRaw) : 150;
    const id = `art_${store.artworkIdCounter++}`;
    const previewUrl =
      file.type === "application/pdf"
        ? "/mock-artwork-landscape.svg"
        : typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
          ? URL.createObjectURL(file)
          : "/mock-artwork-landscape.svg";
    store.artwork.set(id, {
      id,
      userId: auth,
      folderId: "folder_home",
      filename: file.name,
      previewUrl,
      mime: file.type,
      size: file.size,
      widthPx: Number.isFinite(widthPx) ? widthPx : undefined,
      heightPx: Number.isFinite(heightPx) ? heightPx : undefined,
      dpi: Number.isFinite(dpi) ? dpi : 150,
    });
    return HttpResponse.json({
      artworkId: id,
      previewUrl,
      meta: {
        mimeType: file.type,
        sizeBytes: file.size,
        widthPx: Number.isFinite(widthPx) ? widthPx : undefined,
        heightPx: Number.isFinite(heightPx) ? heightPx : undefined,
        dpi: Number.isFinite(dpi) ? dpi : 150,
      },
    });
  }),

  // --- Address validation (deterministic mock) ---
  http.post(`${API}/address/validate`, async ({ request }) => {
    const auth = requireUser(request);
    if (typeof auth !== "string") return auth;
    const body = (await request.json()) as Record<string, any>;
    if (body.country !== "US") {
      return HttpResponse.json({ code: "USA_ONLY", message: "Only US shipping addresses are supported." }, { status: 400 });
    }
    const normalized = {
      ...body,
      fullName: String(body.fullName ?? "").trim().replace(/\s+/g, " "),
      street1: String(body.street1 ?? "").trim().replace(/\s+/g, " "),
      street2: String(body.street2 ?? "").trim().replace(/\s+/g, " "),
      city: String(body.city ?? "").trim().replace(/\s+/g, " "),
      region: String(body.region ?? "").trim().toUpperCase(),
      postalCode: String(body.postalCode ?? "").trim(),
      country: "US",
    };
    const validationToken = btoa(JSON.stringify(normalized));
    return HttpResponse.json({
      valid: false,
      verificationStatus: "unverified",
      normalized,
      suggested: normalized,
      validationToken,
      validationVersion: "us-syntax-v1-2026-08",
      requiresAcknowledgement: true,
      message: "Address syntax was normalized, but no external address provider is connected. Confirm the unverified-address risk before submitting.",
    });
  }),

  // --- Orders (authenticated; authoritative V1 status/payment model) ---
  http.get(`${API}/orders`, ({ request }) => {
    const auth = requireUser(request);
    if (typeof auth !== "string") return auth;
    const items = Array.from(store.orders.values())
      .map(({ order }) => order)
      .filter((order) => order.userId === auth)
      .map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.total,
        totalLabel: `$${order.total.toFixed(2)}`,
        createdAt: order.createdAt,
        placedAt: order.placedAt,
        firstLineLabel: order.lines[0] ? `${order.lines[0].billableDims.widthFt}' × ${order.lines[0].billableDims.heightFt}'` : "—",
        firstLineQty: order.lines[0]?.quantity ?? 0,
        guaranteedDeliveryDate: order.guaranteedDeliveryDate,
      }));
    items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return HttpResponse.json(items);
  }),

  http.get(`${API}/orders/:id`, ({ params, request }) => {
    const auth = requireUser(request);
    if (typeof auth !== "string") return auth;
    const rec = store.orders.get(params["id"] as string);
    if (!rec || rec.order.userId !== auth) return HttpResponse.json({ code: "NOT_FOUND", message: "Order not found." }, { status: 404 });
    return HttpResponse.json(rec.order);
  }),

  http.post(`${API}/orders`, async ({ request }) => {
    const auth = requireUser(request);
    if (typeof auth !== "string") return auth;
    const body = (await request.json()) as any;
    if (!Array.isArray(body.lines) || body.lines.some((line: any) => !line.artworkId)) {
      return HttpResponse.json({ code: "ARTWORK_REQUIRED", message: "Artwork is required for every order line." }, { status: 400 });
    }
    if (body.lines.some((line: any) => store.artwork.get(line.artworkId)?.userId !== auth)) {
      return HttpResponse.json({ code: "ARTWORK_INVALID", message: "Artwork does not exist in your library." }, { status: 400 });
    }
    if (!body.addressRiskAcknowledged || !body.addressValidationToken) {
      return HttpResponse.json({ code: "ADDRESS_RISK_ACKNOWLEDGEMENT_REQUIRED", message: "Confirm the unverified-address risk before submitting." }, { status: 400 });
    }
    let normalizedAddress: any;
    try {
      normalizedAddress = JSON.parse(atob(body.addressValidationToken));
    } catch {
      return HttpResponse.json({ code: "ADDRESS_VALIDATION_REQUIRED", message: "Validate the current shipping address again." }, { status: 400 });
    }
    if (JSON.stringify(normalizedAddress) !== JSON.stringify(body.shipTo)) {
      return HttpResponse.json({ code: "ADDRESS_VALIDATION_REQUIRED", message: "Validate the current shipping address again." }, { status: 400 });
    }
    const acknowledgements = Object.values(body.acknowledgements ?? {});
    if (acknowledgements.length !== 5 || !acknowledgements.every(Boolean)) {
      return HttpResponse.json({ code: "ACKNOWLEDGEMENTS_REQUIRED", message: "All acknowledgements must be confirmed." }, { status: 400 });
    }
    const quoteRecords = body.lines.map((line: any) => store.quotes.get(line.quoteId));
    if (quoteRecords.some((quote: any) => !quote || new Date(quote.validUntil) <= new Date())) {
      return HttpResponse.json({ code: "QUOTE_EXPIRED", message: "A quote expired. Request a new quote before submitting." }, { status: 409 });
    }
    const quoteMismatch = body.lines.some((line: any, index: number) => {
      const request = quoteRecords[index]?.request as any;
      return (
        request?.productId !== line.productId ||
        request?.material !== line.material ||
        request?.quantity !== line.quantity ||
        JSON.stringify(request?.dimensions) !== JSON.stringify(line.dimensions) ||
        JSON.stringify(request?.finishing) !== JSON.stringify(line.finishing)
      );
    });
    if (quoteMismatch) {
      return HttpResponse.json({ code: "QUOTE_MISMATCH", message: "A quote does not match the submitted configuration." }, { status: 400 });
    }
    const priced = priceOrder(body.lines);
    if (quoteRecords.some((quote: any, index: number) => quote.total !== priced.lines[index]?.totalBeforeTax)) {
      return HttpResponse.json({ code: "QUOTE_CHANGED", message: "Pricing changed. Review a replacement quote." }, { status: 409 });
    }
    const cutoff = computeNextCutoff();
    const id = `ord_${store.orderIdCounter++}`;
    const orderNumber = `BI48-${String(store.orderIdCounter).padStart(6, "0")}`;
    const now = new Date().toISOString();
    const order: Order = {
      id,
      userId: auth,
      orderNumber,
      lines: priced.lines.map((line, index) => ({
        id: `line_${index}_${uuid()}`,
        productId: body.lines[index].productId,
        material: body.lines[index].material,
        dimensions: body.lines[index].dimensions,
        finishing: body.lines[index].finishing,
        quantity: body.lines[index].quantity,
        artworkId: body.lines[index].artworkId,
        unitProduct: line.unitProduct,
        addons: line.addons,
        productSubtotal: line.productSubtotal,
        shipping: line.shipping,
        totalBeforeTax: line.totalBeforeTax,
        billableSqFt: line.billableSqFt,
        billableDims: line.billableDims,
      })),
      status: "RECEIVED",
      paymentStatus: "PENDING_PAYMENT",
      currency: "USD",
      subtotal: priced.subtotal,
      shipping: priced.shipping,
      tax: 0,
      rewardsDiscount: 0,
      total: priced.total,
      shipTo: normalizedAddress,
      artworkIds: body.lines.map((line: any) => line.artworkId),
      guaranteedDeliveryDate: cutoff.guaranteedDeliveryDate,
      guaranteedDeliveryDow: cutoff.guaranteedDeliveryDow,
      proofConfirmedAt: now,
      placedAt: now,
      createdAt: now,
      updatedAt: now,
      events: [{ id: `evt_${uuid()}`, fromStatus: null, toStatus: "RECEIVED", actorId: auth, note: "Order placed.", createdAt: now }],
    };
    store.orders.set(id, { order });
    return HttpResponse.json(order, { status: 201 });
  }),

  http.post(`${API}/orders/:id/cancel`, ({ params, request }) => {
    const auth = requireUser(request);
    if (typeof auth !== "string") return auth;
    const rec = store.orders.get(params["id"] as string);
    if (!rec || rec.order.userId !== auth) return HttpResponse.json({ code: "NOT_FOUND", message: "Order not found." }, { status: 404 });
    if (rec.order.paymentStatus !== "PENDING_PAYMENT" || !["RECEIVED", "AWAITING_PAYMENT", "ON_HOLD"].includes(rec.order.status)) {
      return HttpResponse.json({ code: "NOT_CANCELLABLE", message: "This order can no longer be cancelled online." }, { status: 400 });
    }
    const now = new Date().toISOString();
    const order: Order = {
      ...rec.order,
      status: "CANCELLED",
      updatedAt: now,
      events: [...rec.order.events, { id: `evt_${uuid()}`, fromStatus: rec.order.status, toStatus: "CANCELLED", actorId: auth, note: "Cancelled by customer.", createdAt: now }],
    };
    rec.order = order;
    return HttpResponse.json(order);
  }),

  // --- Reorder (owned artwork + current quotes; never creates an order) ---
  http.post(`${API}/orders/:id/reorder`, ({ params, request }) => {
    const auth = requireUser(request);
    if (typeof auth !== "string") return auth;
    const rec = store.orders.get(params["id"] as string);
    if (!rec || rec.order.userId !== auth) return HttpResponse.json({ code: "NOT_FOUND", message: "Order not found." }, { status: 404 });
    if (rec.order.lines.some((line) => !line.artworkId || store.artwork.get(line.artworkId)?.userId !== auth)) {
      return HttpResponse.json({ code: "ARTWORK_REPLACEMENT_REQUIRED", message: "Artwork is no longer available. Select a replacement before reordering." }, { status: 400 });
    }
    const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const lines = rec.order.lines.map((line) => {
      const pricingInput = {
        productId: line.productId as ProductId | undefined,
        material: line.material,
        dimensions: line.dimensions,
        finishing: line.finishing,
        quantity: line.quantity,
      };
      const priced = priceOrder([pricingInput]);
      const quoteId = `quote_${store.quoteIdCounter++}`;
      store.quotes.set(quoteId, { request: pricingInput, validUntil, total: priced.total });
      return {
        sourceOrderLineId: line.id,
        productId: line.productId ?? productIdForMaterial(line.material),
        material: line.material,
        dimensions: line.dimensions,
        finishing: line.finishing,
        quantity: line.quantity,
        artworkId: line.artworkId!,
        quote: {
          quoteId,
          validUntil,
          currency: "USD",
          lines: priced.lines,
          subtotal: priced.subtotal,
          shipping: priced.shipping,
          tax: 0,
          total: priced.total,
          eligible: true,
          ...computeNextCutoff(),
        },
      };
    });
    return HttpResponse.json({
      sourceOrderId: rec.order.id,
      lines,
      warnings: ["Current catalog rules and prices were applied. Review the cart before submitting."],
    });
  }),
];

export { ORDER_STATUS_LABELS };
