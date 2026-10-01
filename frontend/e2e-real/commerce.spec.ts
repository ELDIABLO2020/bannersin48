import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Release suite — canonical customer scenarios against the real
 * Nest + Postgres backend.
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

test.describe("real-backend release suite", () => {
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

/**
 * Staff flow (plan §8, phase 2): an admin creates a fulfillment employee with
 * a temporary password; the employee is held until they change it, can then
 * attach tracking, is refused mark-paid, and loses access the moment they are
 * suspended. Uses the seed admin (ADMIN_EMAIL / ADMIN_PASSWORD, local defaults
 * from backend/src/config/seed-admin.ts).
 */
test.describe("real-backend staff flow", () => {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@bannersin48.local";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";

  async function login(request: APIRequestContext, email: string, password: string) {
    const res = await request.post(`${API}/auth/login`, { data: { email, password } });
    expect(res.status(), await res.text()).toBe(201);
    return (await res.json()) as { user: { id: string; permissions: string[]; mustChangePassword: boolean }; token: string; refreshToken: string };
  }

  test("temporary-password employee: forced change, tracking allowed, mark-paid refused, suspension immediate", async ({ request }) => {
    test.setTimeout(120_000);
    const admin = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD);
    const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

    // A paid order for the employee to work on, plus an unpaid one they must not touch.
    const customerEmail = uniqueEmail();
    const { token: customerToken } = await register(request, customerEmail);
    const artworkId = await uploadArtwork(request, customerToken);
    const [paid, unpaid] = await Promise.all(
      [1, 1].map(async () => {
        const q = await quote(request, 1);
        const created = await createOrder(request, customerToken, { email: customerEmail, artworkId, quoteId: q.quoteId, quantity: 1 });
        expect(created.status(), await created.text()).toBe(201);
        return (await created.json()) as { id: string };
      }),
    );
    const markPaid = await request.post(`${API}/admin/orders/${paid!.id}/mark-paid`, { headers: auth(admin.token) });
    expect(markPaid.status(), await markPaid.text()).toBe(201);

    // 1. Admin creates the employee with a temporary password (never echoed back).
    const roles = (await (await request.get(`${API}/admin/roles`, { headers: auth(admin.token) })).json()) as Array<{ id: string; key: string }>;
    const fulfillment = roles.find((r) => r.key === "fulfillment")!;
    const staffEmail = `e2e-staff-${Date.now()}@example.com`;
    const tempPassword = "Temp-password-for-e2e-1";
    const created = await request.post(`${API}/admin/users`, {
      headers: auth(admin.token),
      data: { email: staffEmail, firstName: "E2E", lastName: "Picker", roleId: fulfillment.id, mode: "temporary_password", temporaryPassword: tempPassword },
    });
    expect(created.status(), await created.text()).toBe(201);
    const createdBody = (await created.json()) as { user: { id: string; status: string; mustChangePassword: boolean } };
    expect(createdBody.user).toMatchObject({ status: "ACTIVE", mustChangePassword: true });
    expect(await created.text()).not.toContain(tempPassword);

    // 2. First sign-in works but everything except the password change is refused.
    const first = await login(request, staffEmail, tempPassword);
    expect(first.user.mustChangePassword).toBe(true);
    const blocked = await request.get(`${API}/admin/orders`, { headers: auth(first.token) });
    expect(blocked.status()).toBe(403);
    expect(((await blocked.json()) as { code: string }).code).toBe("PASSWORD_CHANGE_REQUIRED");

    const weak = await request.post(`${API}/users/me/password`, { headers: auth(first.token), data: { currentPassword: tempPassword, newPassword: "short-one" } });
    expect(weak.status()).toBe(400);
    const changed = await request.post(`${API}/users/me/password`, {
      headers: auth(first.token),
      data: { currentPassword: tempPassword, newPassword: "A-real-staff-password-1", keepRefreshToken: first.refreshToken },
    });
    expect(changed.status(), await changed.text()).toBe(201);

    // 3. Fulfillment may attach tracking, but not mark paid.
    const staff = await login(request, staffEmail, "A-real-staff-password-1");
    expect(staff.user.mustChangePassword).toBe(false);
    expect(staff.user.permissions).toContain("orders:tracking");
    expect(staff.user.permissions).not.toContain("payments:mark_paid");

    const tracking = await request.post(`${API}/admin/orders/${paid!.id}/tracking`, { headers: auth(staff.token), multipart: { trackingNumber: "794644790132" } });
    expect(tracking.status(), await tracking.text()).toBe(201);
    expect(((await tracking.json()) as { status: string }).status).toBe("ACCEPTED");

    const refused = await request.post(`${API}/admin/orders/${unpaid!.id}/mark-paid`, { headers: auth(staff.token) });
    expect(refused.status()).toBe(403);
    expect((await refused.json()) as object).toMatchObject({ code: "FORBIDDEN_PERMISSION", required: ["payments:mark_paid"] });

    // 4. Staff cannot see the staff directory; the admin can, and the audit log has the trail.
    const directory = await request.get(`${API}/admin/users`, { headers: auth(staff.token) });
    expect(directory.status()).toBe(403);
    const audit = await request.get(`${API}/admin/audit?entityId=${createdBody.user.id}`, { headers: auth(admin.token) });
    expect(audit.status(), await audit.text()).toBe(200);
    const actions = ((await audit.json()) as { items: Array<{ action: string }> }).items.map((i) => i.action);
    expect(actions).toEqual(expect.arrayContaining(["user.create", "user.change_password"]));

    // 5. Suspension takes effect on the very next request, without waiting for the token to expire.
    const suspended = await request.post(`${API}/admin/users/${createdBody.user.id}/suspend`, { headers: auth(admin.token), data: { reason: "E2E cleanup" } });
    expect(suspended.status(), await suspended.text()).toBe(201);
    const afterSuspend = await request.get(`${API}/admin/orders`, { headers: auth(staff.token) });
    expect(afterSuspend.status()).toBe(401);
    const refresh = await request.post(`${API}/auth/refresh`, { data: { refreshToken: staff.refreshToken } });
    expect(refresh.status()).toBe(401);

    // An admin can never demote or suspend themselves, and the last admin is locked.
    const self = await request.post(`${API}/admin/users/${admin.user.id}/suspend`, { headers: auth(admin.token), data: { reason: "nope" } });
    expect(self.status()).toBe(403);
  });
});

// Re-exported for any future helper reuse.
export type { Page };
