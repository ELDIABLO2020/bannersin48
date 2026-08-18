import { test, expect } from "@playwright/test";

async function waitForHub(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () => (window as unknown as { __BI48_MOCKS_READY__?: boolean }).__BI48_MOCKS_READY__ === true,
    null,
    { timeout: 20_000 },
  );
  await expect(page.getByTestId("hub-card-hd-banner")).toBeVisible({ timeout: 15_000 });
}

test.describe("BANNER order hub", () => {
  test("renders hub cards including stands", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order");
    await waitForHub(page);
    const cards = page.locator("[data-testid^='hub-card-']");
    await expect(cards).toHaveCount(7);
    await expect(page.getByTestId("hub-card-hd-banner")).toBeVisible();
    await expect(page.getByTestId("hub-card-hdpe")).toBeVisible();
    await expect(page.getByTestId("hub-card-canvas")).toBeVisible();
    await expect(page.getByTestId("hub-card-mesh")).toBeVisible();
    await expect(page.getByTestId("hub-card-poster")).toBeVisible();
    await expect(page.getByTestId("hub-card-no-curl")).toBeVisible();
    await expect(page.getByTestId("hub-card-econostand")).toBeVisible();
    await expect(page.getByTestId("hub-card-retractable")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /order a retractable banner/i })).toBeVisible();
  });

  test("mesh more info opens modal with webbing", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order");
    await waitForHub(page);
    await page.getByTestId("hub-more-info-mesh").click();
    await expect(page.getByTestId("hub-info-modal")).toBeVisible();
    await expect(page.getByTestId("hub-info-modal")).toContainText(/Webbing/i);
  });

  test("econostand has more info", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order");
    await waitForHub(page);
    await page.getByTestId("hub-more-info-econostand").click();
    await expect(page.getByTestId("hub-info-modal")).toBeVisible();
    await expect(page.getByTestId("hub-info-modal")).toContainText(/33\.5/);
  });

  test("contractor need filter shows mesh and HD Banner", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order?need=contractor");
    await waitForHub(page);
    await expect(page.getByTestId("hub-filter-label")).toContainText(/Contractor/);
    await expect(page.getByTestId("hub-card-mesh")).toBeVisible();
    await expect(page.getByTestId("hub-card-hd-banner")).toBeVisible();
    await expect(page.getByTestId("hub-card-canvas")).toHaveCount(0);
  });

  test("windy chip filters to mesh", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order");
    await waitForHub(page);
    await page.getByTestId("hub-filter-windy").click();
    await expect(page).toHaveURL(/need=windy/);
    await expect(page.getByTestId("hub-card-mesh")).toBeVisible();
    await expect(page.getByTestId("hub-card-poster")).toHaveCount(0);
  });

  test("poster order opens builder", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order");
    await waitForHub(page);
    await page.getByTestId("hub-order-poster").click();
    await expect(page).toHaveURL(/\/order\/poster/);
    await expect(page.getByTestId("builder-shell")).toBeVisible({ timeout: 30_000 });
  });

  test("legacy vinyl deep link redirects with size params", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order/vinyl?w=3&h=6");
    await expect(page).toHaveURL(/\/order\/hd-banner\?w=3&h=6/, { timeout: 15_000 });
    await expect(page.getByTestId("builder-stage")).toContainText("3′", { timeout: 15_000 });
  });

  test("unknown slug is 404", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/order/not-a-product");
    await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
  });
});
