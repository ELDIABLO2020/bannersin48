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

test.describe("Paper modules", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.removeItem("bi48.builder");
      localStorage.removeItem("bi48.cart");
    });
    seedDemoAuth(page);
  });

  test("no-curl default $118; 3×6 errors; 2×6 recovers", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order/no-curl");
    await waitForBuilder(page);
    await expect(page.getByTestId("price-hero").getByTestId("price-total")).toContainText("$118", {
      timeout: 10_000,
    });
    await expect(page.getByTestId("popular-size-3x6")).toHaveCount(0);

    // Select artwork first so the add-to-cart gate reflects size eligibility alone.
    await page.getByTestId("dock-images").click();
    await expect(page.getByTestId("image-picker")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("library-item-art_sample_2").click();

    await page.getByTestId("dock-size").click();
    await page.getByTestId("aspect-lock").uncheck();
    await page.getByTestId("size-width-ft").fill("3");
    await page.getByTestId("size-height-ft").fill("6");
    await expect(page.getByTestId("size-error")).toContainText("35");
    await expect(page.getByTestId("add-to-cart")).toBeDisabled();

    await page.getByTestId("size-width-ft").fill("2");
    await expect(page.getByTestId("size-error")).toHaveCount(0);
    await expect(page.getByTestId("add-to-cart")).toBeEnabled();
  });

  test("poster dock is images+size and 3×6 is $118", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order/poster");
    await waitForBuilder(page);
    await expect(page.getByTestId("dock-images")).toBeVisible();
    await expect(page.getByTestId("dock-size")).toBeVisible();
    await expect(page.getByTestId("dock-material")).toHaveCount(0);
    await expect(page.getByTestId("dock-welding")).toHaveCount(0);
    await expect(page.getByTestId("dock-wind")).toHaveCount(0);
    await page.getByTestId("dock-size").click();
    await page.getByTestId("popular-size-3x6").click();
    await expect(page.getByTestId("price-hero").getByTestId("price-total")).toContainText("$118");
  });

  test("canvas 3×6 is $280", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order/canvas");
    await waitForBuilder(page);
    await page.getByTestId("dock-size").click();
    await page.getByTestId("popular-size-3x6").click();
    await expect(page.getByTestId("price-hero").getByTestId("price-total")).toContainText("$280");
  });

  test("hdpe 3×6 is $91", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order/hdpe");
    await waitForBuilder(page);
    await page.getByTestId("dock-size").click();
    await page.getByTestId("popular-size-3x6").click();
    await expect(page.getByTestId("price-hero").getByTestId("price-total")).toContainText("$91");
  });
});
