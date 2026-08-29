import { test, expect } from "@playwright/test";
import { seedDemoAuth } from "./helpers/auth";

async function waitForBuilder(page: import("@playwright/test").Page) {
  await page.reload(); // hydrate seeded demo auth (account-gated artwork picker)
  await expect(page.getByTestId("builder-shell")).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(
    () => (window as unknown as { __BI48_MOCKS_READY__?: boolean }).__BI48_MOCKS_READY__ === true,
    null,
    { timeout: 20_000 },
  );
}

test.describe("Econostand module", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.removeItem("bi48.builder");
      localStorage.removeItem("bi48.cart");
    });
    seedDemoAuth(page);
  });

  test("default $145; qty 2 is $290; no size tile; add to cart", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order/econostand");
    await waitForBuilder(page);

    await expect(page.getByTestId("dock-size")).toHaveCount(0);
    await expect(page.getByTestId("dock-images")).toBeVisible();
    await expect(page.getByTestId("fixed-size-label")).toContainText("33.5″ × 80″ · Front side");
    await expect(page.getByTestId("price-hero").getByTestId("price-total")).toContainText("$145", {
      timeout: 10_000,
    });
    await expect(page.getByTestId("qty-value")).toHaveText("1");

    await page.getByTestId("qty-plus").click();
    await expect(page.getByTestId("qty-value")).toHaveText("2");
    await expect(page.getByTestId("price-hero").getByTestId("price-total")).toContainText("$290");

    // Artwork is required before add-to-cart.
    await page.getByTestId("dock-images").click();
    await expect(page.getByTestId("image-picker")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("library-item-art_sample_2").click();

    await page.getByTestId("add-to-cart").click();
    await expect(page.getByRole("dialog", { name: /your cart/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("dialog", { name: /your cart/i })).toContainText(/Econostand/i);
  });

  test("retractable remains a separate $185 SKU", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order/retractable");
    await expect(page.getByRole("heading", { name: "Retractable banner", exact: true })).toBeVisible();
    await expect(page.getByText("$185.00").first()).toBeVisible();
  });
});
