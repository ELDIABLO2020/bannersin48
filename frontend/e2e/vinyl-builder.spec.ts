import { test, expect } from "@playwright/test";

test.describe("Vinyl builder", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.removeItem("bi48.builder");
      localStorage.removeItem("bi48.cart");
    });
    await page.goto("/order/vinyl");
    await expect(page.getByTestId("builder-shell")).toBeVisible({ timeout: 30_000 });
    await page.waitForFunction(
      () => (window as unknown as { __BI48_MOCKS_READY__?: boolean }).__BI48_MOCKS_READY__ === true,
      null,
      { timeout: 20_000 },
    );
  });

  test("opens one-screen builder shell with price", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop shell layout");
    await expect(page.getByTestId("builder-stage")).toBeVisible();
    await expect(page.getByTestId("control-dock")).toBeVisible();
    await expect(page.getByTestId("price-hero")).toBeVisible();
    await expect(page.getByTestId("item-rail")).toBeVisible();

    // Stage header: product title, live specs, green price, 48-hour production
    await expect(page.getByTestId("stage-header")).toBeVisible();
    await expect(page.getByTestId("stage-header")).toContainText(/HD Banner \(Vinyl\)/i);
    await expect(page.getByTestId("stage-header-specs")).toContainText(/Vinyl 13 oz Single Sided/i);
    await expect(page.getByTestId("stage-header-specs")).toContainText("4′");
    await expect(page.getByTestId("stage-header-specs")).not.toContainText('0" x 0"');
    await expect(page.getByTestId("stage-header")).toContainText(/48-hour production/i);
    // Default 4×8 13oz → $138 (header + PriceHero)
    await expect(page.getByTestId("stage-header-price")).toContainText("$138", { timeout: 10_000 });
    await expect(page.getByTestId("price-hero").getByTestId("price-total")).toContainText("$138");

    // Real rates (not competitor figures) in both matrices
    const matrices = page.getByTestId("rate-matrix");
    await expect(matrices).toHaveCount(2);
    await expect(matrices.first()).toContainText("$4.00");
    await expect(matrices.first()).toContainText("$7.50");
    await expect(matrices.first()).not.toContainText("$1.25");

    // Empty artwork CTA
    await expect(page.getByTestId("stage-empty-upload")).toBeVisible();
    await expect(page.getByTestId("stage-empty-upload")).toContainText(
      /Specify dimensions or click to select an image/i,
    );
    await expect(page.getByTestId("stage-empty-upload")).toContainText(
      /Upload or pick from your library/i,
    );

    const viewport = page.viewportSize();
    const stageSlot = page.getByTestId("builder-stage").locator("..");
    await expect(page.getByTestId("builder-creative")).toBeVisible();
    await expect(page.getByTestId("stage-ruler-h")).toBeVisible();
    await expect(page.getByTestId("stage-ruler-v")).toBeVisible();
    const stageBox = await page.getByTestId("builder-stage").boundingBox();
    const slotBox = await stageSlot.boundingBox();
    const creativeBox = await page.getByTestId("builder-creative").boundingBox();
    const dockBox = await page.getByTestId("control-dock").boundingBox();
    expect(viewport).toBeTruthy();
    expect(stageBox).toBeTruthy();
    expect(slotBox).toBeTruthy();
    expect(creativeBox).toBeTruthy();
    expect(dockBox).toBeTruthy();
    // Workspace fills the flex-1 stage slot
    expect(stageBox!.width).toBeGreaterThan(slotBox!.width - 2);
    expect(stageBox!.height).toBeGreaterThanOrEqual(280);
    expect(Math.abs(stageBox!.height - slotBox!.height)).toBeLessThan(2);
    // Default 4×8 creative keeps ~0.5 aspect and is larger than the old capped stage
    expect(creativeBox!.width / creativeBox!.height).toBeCloseTo(0.5, 1);
    expect(creativeBox!.height).toBeGreaterThan(200);
    expect(dockBox!.y).toBeLessThan(viewport!.height);
  });

  test("set size updates preview and keeps price > 0", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop dock");
    await page.getByTestId("dock-size").click();
    await expect(page.getByTestId("size-panel")).toBeVisible();
    await page.getByTestId("popular-size-3x6").click();
    await expect(page.getByTestId("builder-stage")).toContainText("3′");
    const total = page.getByTestId("price-hero").getByTestId("price-total");
    await expect(total).toBeVisible();
    const text = await total.innerText();
    const amount = Number(text.replace(/[^0-9.]/g, ""));
    expect(amount).toBeGreaterThan(0);
  });

  test("select library artwork auto-sizes banner", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop picker");
    await page.getByTestId("dock-images").click();
    await expect(page.getByTestId("image-picker")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("library-item-art_sample_1")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("library-item-art_sample_1").click();
    // 1800×3600 @ 150dpi → 1' × 2'
    await expect(page.getByTestId("builder-stage")).toContainText("1′", { timeout: 5_000 });
    await expect(page.getByTestId("builder-stage")).toContainText("2′");
  });

  test("wind slits gated by size; rope clears grommets path", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop dock");
    // 2×4 is outside wind band — hint explains why
    await page.getByTestId("dock-size").click();
    await page.getByTestId("popular-size-2x4").click();
    await page.getByTestId("dock-wind").click();
    await expect(page.getByTestId("dock-eligibility-hint")).toContainText(/Wind slits/i);

    // Back to 4×8 — wind enabled
    await page.getByTestId("dock-size").click();
    await page.getByTestId("popular-size-4x8").click();
    await page.getByTestId("dock-wind").click();
    await expect(page.getByTestId("dock-panel-wind")).toBeVisible();
    await page.getByTestId("wind-toggle").click();

    // Pockets clear grommets
    await page.getByTestId("dock-pockets").click();
    await page.getByTestId("pockets-toggle").click();
    await expect(page.getByTestId("pocket-indicator")).toBeVisible();
    await page.getByTestId("pocket-depth-3").click();

    // Turn pockets off → enable rope (also works when grommets would conflict)
    await page.getByTestId("pockets-toggle").click();
    await page.getByTestId("dock-grommets").click();
    await page.getByTestId("grommets-toggle").click();
    await expect(page.getByTestId("grommet-dot").first()).toBeVisible();
    await page.getByTestId("dock-rope").click();
    await page.getByTestId("rope-toggle").click();
    await expect(page.getByTestId("rope-indicator")).toBeVisible();
  });

  test("disabled print sides shows eligibility hint on 13 oz", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop dock");
    await page.getByTestId("dock-sides").click();
    await expect(page.getByTestId("dock-eligibility-hint")).toContainText(/18 oz/i);
  });
  test("custom grommet add and save", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop dock");
    await page.getByTestId("dock-grommets").click();
    await expect(page.getByTestId("grommet-editor")).toBeVisible();
    await page.getByTestId("grommet-preset-CUSTOM").click();
    const stage = page.getByTestId("grommet-click-stage");
    const box = await stage.boundingBox();
    expect(box).toBeTruthy();
    await stage.click({ position: { x: box!.width * 0.5, y: box!.height * 0.5 } });
    await page.getByTestId("grommet-save").click();
    await expect(page.getByTestId("grommet-dot").first()).toBeVisible();
  });

  test("color match modal saves PMS notes", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop rail");
    await page.getByTestId("open-color-match").click();
    await expect(page.getByTestId("color-match-modal")).toBeVisible();
    await page.getByTestId("color-match-notes").fill("PMS 186 C");
    await page.getByTestId("color-match-submit").click();
    await expect(page.getByTestId("color-match-modal")).toBeHidden();
    await expect(page.getByTestId("open-color-match")).toContainText(/PMS notes saved/i);
  });

  test("ADD SIGN then add to cart adds two lines", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop multi-sign");
    await page.getByTestId("add-sign").click();
    await expect(page.getByTestId("item-rail-select-1")).toBeVisible();
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByRole("dialog", { name: /your cart/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("dialog", { name: /your cart/i })).toContainText(/2 items/i);
  });

  test("mobile: show options dock and add to cart", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-webkit", "Mobile only");
    await expect(page.getByTestId("price-hero").getByTestId("rate-matrix")).toBeHidden();
    await expect(page.getByTestId("stage-header").getByTestId("rate-matrix")).toBeHidden();
    await expect(page.getByTestId("show-options")).toBeVisible();
    await page.getByTestId("show-options").click();
    await expect(page.getByTestId("dock-size")).toBeVisible();
    await page.getByTestId("dock-size").click();
    await page.getByTestId("popular-size-4x8").click();
    await page.getByTestId("add-to-cart").click();
    await expect(page.getByRole("dialog", { name: /your cart/i })).toBeVisible({ timeout: 15_000 });
  });
});

test("artwork route redirects into builder picker", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
  await page.goto("/order/artwork");
  await expect(page).toHaveURL(/\/order\/vinyl\?picker=1/, { timeout: 10_000 });
  await expect(page.getByTestId("image-picker")).toBeVisible({ timeout: 15_000 });
});
