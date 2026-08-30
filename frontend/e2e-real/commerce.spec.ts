import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Wave 11 release suite — canonical customer scenarios against the real
 * Nest + Postgres/Redis backend.
 *
 * The first test drives the full storefront journey through the browser UI.
 * The remaining tests exercise server-enforced invariants (quote change
 * rejection, cancel rules, current-price reorder) directly against the API so
 * they are deterministic and independent of UI chrome.
 */

const API = process.env.REAL_API_BASE_URL ?? "http://localhost:3001";
const PASSWORD = "password123";

// 1×1 transparent PNG (valid magic bytes accepted by the artwork inspector).
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

const CONFIG = {
  productId: "HD_BANNER",
  material: "VINYL_13OZ_SINGLE",
  dimensions: { widthFt: 8, widthIn: 0, heightFt: 4, heightIn: 0 },
  finishing: { welding: true, grommets: true },
};

const ADDRESS = {
  fullName: "E2E Real Customer",
  street1: "123 Main St",
  city: "Ypsilanti",
  region: "MI",
  postalCode: "48197",
  country: "US",
  email: "",
};

let emailCounter = 0;
function uniqueEmail(): string {
  emailCounter += 1;
  return `e2e-real-${Date.now()}-${emailCounter}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function register(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/auth/register`, {
    data: { email, password: PASSWORD, fullName: "E2E Real Customer" },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as { user: Record<string, unknown>; token: string };
}

async function uploadArtwork(request: APIRequestContext, token: string) {
  const res = await request.post(`${API}/artwork/upload`, {
    headers: { Authorization: `Bearer ${token}` },
    multipart: { file: { name: "art.png", mimeType: "image/png", buffer: PNG_1x1 } },
  });
  expect(res.status(), await res.text()).toBe(201);
  const body = (await res.json()) as { artworkId: string };
  return body.artworkId;
}

async function quote(request: APIRequestContext, quantity: number) {
  const res = await request.post(`${API}/pricing/quote`, {
    data: { ...CONFIG, quantity },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as { quoteId: string; total: number; validUntil: string };
}

async function validateAddress(request: APIRequestContext, token: string) {
  const res = await request.post(`${API}/address/validate`, {
    headers: { Authorization: `Bearer ${token}` },
    data: ADDRESS,
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as {
    validationToken: string;
    normalized: Record<string, unknown>;
    requiresAcknowledgement: boolean;
  };
}

const ACKNOWLEDGEMENTS = {
  artworkCorrect: true,
  spellingColorsLayoutAccepted: true,
  printsAsUploaded: true,
  cancellationWindowUnderstood: true,
  deliveryDateAndAddressConfirmed: true,
};

async function createOrder(
  request: APIRequestContext,
  token: string,
  opts: { email: string; artworkId: string; quoteId: string; quantity: number; idempotencyKey?: string },
) {
  const validation = await validateAddress(request, token);
  return request.post(`${API}/orders`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      email: opts.email,
      ...(opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : {}),
      lines: [
        {
          productId: CONFIG.productId,
          material: CONFIG.material,
          dimensions: CONFIG.dimensions,
          finishing: CONFIG.finishing,
          quantity: opts.quantity,
          artworkId: opts.artworkId,
          quoteId: opts.quoteId,
        },
      ],
      shipTo: validation.normalized,
      addressValidationToken: validation.validationToken,
      addressRiskAcknowledged: true,
      acknowledgements: ACKNOWLEDGEMENTS,
    },
  });
}

test.describe("Wave 11 real-backend release suite", () => {
  test("canonical storefront journey: register→configure→artwork→cart→checkout→track", async ({
    page,
  }, testInfo) => {
    test.slow();
    test.setTimeout(180_000);

    // 1. Register returns to the intended builder route.
    const email = uniqueEmail();
    await page.goto(`/register?next=%2Forder%2Fhd-banner&email=${encodeURIComponent(email)}`);
    await page.locator('input[autocomplete="name"]').fill("E2E Real Customer");
    await page.locator("#register-password").fill(PASSWORD);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/order\/hd-banner/, { timeout: 30_000 });

    // 2. Configure the standard landscape size; axes are correct everywhere.
    await expect(page.getByTestId("builder-shell")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("dock-size").click();
    await page.getByTestId("popular-size-4x8").click();
    await expect(page.getByTestId("stage-dimension-label")).toContainText("8′ W × 4′ H");
    await expect(page.getByTestId("stage-dimension-label")).toContainText("Landscape");

    // 3. Upload real artwork (PNG) and see the actual preview.
    await page.getByTestId("dock-images").click();
    await expect(page.getByTestId("image-picker")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("image-picker-file").setInputFiles({
      name: "grand-opening.png",
      mimeType: "image/png",
      buffer: PNG_1x1,
    });
    await expect(page.getByTestId("image-picker")).toBeHidden({ timeout: 15_000 });
    // Re-apply the standard 8×4 landscape size: the 1×1 PNG fixture auto-sizes
    // the banner from the image's print dimensions (clamped to 1×1).
    await page.getByTestId("dock-size").click();
    await page.getByTestId("popular-size-4x8").click();
    await expect(page.getByTestId("stage-dimension-label")).toContainText("8′ W × 4′ H");
    await expect(page.getByTestId("add-to-cart")).toBeEnabled({ timeout: 15_000 });

    // 4. Add to cart, then quantity 1 → 2 re-quotes.
    await page.getByTestId("add-to-cart").click();
    const drawer = page.getByRole("dialog", { name: /your cart/i });
    await expect(drawer).toBeVisible({ timeout: 15_000 });
    await expect(drawer).toContainText("1 item");
    await drawer.getByRole("button", { name: /increase quantity/i }).click();
    await expect(drawer).toContainText("$276.00", { timeout: 15_000 });

    // 5. Close/reopen the drawer; scroll/focus recover.
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    await page.getByRole("button", { name: /open cart/i }).click();
    await expect(drawer).toBeVisible();

    // 6. Checkout with an unverified US address (the V1 provider-less branch).
    await drawer.getByRole("button", { name: /checkout/i }).click();
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible({ timeout: 30_000 });

    await page.getByLabel("Street address").fill("123 Main St");
    await page.getByLabel("City").fill("Ypsilanti");
    await page.getByLabel("State").selectOption("MI");
    await page.getByLabel("ZIP code").fill("48197");

    // Unverified-address acknowledgement (server + client both enforce this).
    const risk = page.getByRole("checkbox", { name: /accept the shipping risk/i });
    await expect(risk).toBeVisible({ timeout: 15_000 });
    await risk.check();

    for (const label of [
      /confirm the uploaded file and the configured dimensions/i,
      /accept the spelling, colors, and layout/i,
      /prints the uploaded file exactly as provided/i,
      /paid or in production cannot be cancelled online/i,
      /delivery timing begins only after order submission/i,
    ]) {
      await page.getByRole("checkbox", { name: label }).check();
    }

    // 7/8. Submit with idempotency + authoritative total; manual-payment state.
    const submit = page.getByRole("button", { name: /submit order/i });
    await expect(submit).toBeEnabled({ timeout: 30_000 });
    await expect(submit).toContainText("$276.00 USD");
    await submit.click();

    // Order detail: RECEIVED + PENDING_PAYMENT, qty 2, landscape dims, total.
    await expect(page).toHaveURL(/\/orders\//, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /order received · payment pending/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("8′ × 4′")).toBeVisible();
    await expect(page.getByText("Qty 2")).toBeVisible();
    await expect(page.getByText("$276.00").last()).toBeVisible();

    // 10. Track through the authenticated order list.
    await page.goto("/orders");
    await expect(page.getByRole("heading", { name: /your orders/i })).toBeVisible();
    await expect(page.getByText(/8′ × 4′/).first()).toBeVisible();

    await testInfo.attach("order-detail-url", { body: page.url() });
  });

  test("quote change before submit is rejected server-side (no silent price drift)", async ({
    request,
  }) => {
    const email = uniqueEmail();
    const { token } = await register(request, email);
    const artworkId = await uploadArtwork(request, token);
    const q1 = await quote(request, 1);

    // Quote for qty 1, submit qty 2 → 400 QUOTE_MISMATCH, no order created.
    const res = await createOrder(request, token, {
      email,
      artworkId,
      quoteId: q1.quoteId,
      quantity: 2,
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("QUOTE_MISMATCH");

    // No order was created for this account.
    const list = await request.get(`${API}/orders`, { headers: { Authorization: `Bearer ${token}` } });
    expect(await list.json()).toEqual([]);
  });

  test("cancel works in the valid state and is rejected once cancelled", async ({ request }) => {
    const email = uniqueEmail();
    const { token } = await register(request, email);
    const artworkId = await uploadArtwork(request, token);
    const q = await quote(request, 1);

    const created = await createOrder(request, token, { email, artworkId, quoteId: q.quoteId, quantity: 1 });
    expect(created.status(), await created.text()).toBe(201);
    const order = (await created.json()) as { id: string; status: string; paymentStatus: string };
    expect(order.status).toBe("RECEIVED");
    expect(order.paymentStatus).toBe("PENDING_PAYMENT");

    const cancelled = await request.post(`${API}/orders/${order.id}/cancel`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(cancelled.status(), await cancelled.text()).toBe(201);
    expect(((await cancelled.json()) as { status: string }).status).toBe("CANCELLED");

    const again = await request.post(`${API}/orders/${order.id}/cancel`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(again.status()).toBe(400);
  });

  test("reorder returns a fresh current-price quote and never creates an order", async ({ request }) => {
    const email = uniqueEmail();
    const { token } = await register(request, email);
    const artworkId = await uploadArtwork(request, token);
    const q = await quote(request, 1);

    const created = await createOrder(request, token, { email, artworkId, quoteId: q.quoteId, quantity: 1 });
    expect(created.status(), await created.text()).toBe(201);
    const order = (await created.json()) as { id: string };

    const reorder = await request.post(`${API}/orders/${order.id}/reorder`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(reorder.status(), await reorder.text()).toBe(201);
    const body = (await reorder.json()) as {
      sourceOrderId: string;
      lines: Array<{ artworkId: string; quantity: number; quote: { quoteId: string; total: number } }>;
    };
    expect(body.sourceOrderId).toBe(order.id);
    expect(body.lines).toHaveLength(1);
    expect(body.lines[0].quantity).toBe(1);
    expect(body.lines[0].artworkId).toBe(artworkId);
    expect(body.lines[0].quote.quoteId).toBeTruthy();
    expect(body.lines[0].quote.total).toBe(q.total); // current-price re-quote

    // Reorder routes to a reviewable cart — it must NOT create a second order.
    const list = await request.get(`${API}/orders`, { headers: { Authorization: `Bearer ${token}` } });
    expect(((await list.json()) as unknown[]).length).toBe(1);
  });

  test("idempotency key returns the same order on a duplicate submission", async ({ request }) => {
    const email = uniqueEmail();
    const { token } = await register(request, email);
    const artworkId = await uploadArtwork(request, token);
    const q = await quote(request, 1);
    const idempotencyKey = `e2e-real-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const first = await createOrder(request, token, {
      email,
      artworkId,
      quoteId: q.quoteId,
      quantity: 1,
      idempotencyKey,
    });
    expect(first.status(), await first.text()).toBe(201);
    const firstOrder = (await first.json()) as { id: string };

    const second = await createOrder(request, token, {
      email,
      artworkId,
      quoteId: q.quoteId,
      quantity: 1,
      idempotencyKey,
    });
    expect(second.status()).toBe(201);
    expect(((await second.json()) as { id: string }).id).toBe(firstOrder.id);
  });
});

// Re-exported for any future helper reuse.
export type { Page };
