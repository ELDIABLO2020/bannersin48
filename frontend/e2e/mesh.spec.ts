import { test, expect } from "@playwright/test";

async function waitForBuilder(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("builder-shell")).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(
    () => (window as unknown as { __BI48_MOCKS_READY__?: boolean }).__BI48_MOCKS_READY__ === true,
    null,
    { timeout: 20_000 },
  );
}

test.describe("Mesh module", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.removeItem("bi48.builder");
      localStorage.removeItem("bi48.cart");
    });
  });

  test("3×6 default $140.50; webbing $164.50; no wind slits", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order/mesh");
    await waitForBuilder(page);

    await expect(page.getByTestId("dock-webbing")).toBeVisible();
    await expect(page.getByTestId("dock-wind")).toHaveCount(0);
    await expect(page.getByTestId("dock-material")).toHaveCount(0);
    await expect(page.getByTestId("dock-sides")).toHaveCount(0);

    await page.getByTestId("dock-size").click();
    await page.getByTestId("popular-size-3x6").click();
    await expect(page.getByTestId("price-hero").getByTestId("price-total")).toContainText("$140.50");

    await page.getByTestId("dock-webbing").click();
    await page.getByTestId("webbing-toggle").click();
    await expect(page.getByTestId("dock-panel-webbing")).toContainText(
      "Webbing reinforces the top and bottom welds. Recommended for mesh banners wider than 8 ft.",
    );
    await expect(page.getByTestId("price-hero").getByTestId("price-total")).toContainText("$164.50");
  });

  test("rope still clears grommets", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order/mesh");
    await waitForBuilder(page);

    await page.getByTestId("dock-grommets").click();
    await expect(page.getByTestId("grommet-dot").first()).toBeVisible();
    await page.getByTestId("dock-rope").click();
    await page.getByTestId("rope-toggle").click();
    await expect(page.getByTestId("rope-indicator")).toBeVisible();
  });
});
