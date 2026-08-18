import { test, expect } from "@playwright/test";

test.describe("Category card surfaces", () => {
  test("homepage product cards use images and link to the builder", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/");
    const catalog = page.getByRole("region", { name: /every banner we print/i });
    await expect(catalog.locator("img").first()).toBeVisible();
    await catalog.getByRole("link", { name: /order hd banner/i }).click();
    await expect(page).toHaveURL(/\/order\/hd-banner/);
  });

  test("homepage industry cards link to catalog filters", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/");
    const industries = page.getByRole("region", { name: /customized banners for every use case/i });
    await expect(industries.locator("img").first()).toBeVisible();
    await industries.getByRole("link", { name: /shop contractor/i }).click();
    await expect(page).toHaveURL(/need=contractor/);
  });

  test("help which-banner cards keep destinations and show photos", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/help");
    const which = page.getByRole("region", { name: /which banner/i });
    await expect(which.locator("img").first()).toBeVisible();
    await which.getByRole("link", { name: /order windy or fence/i }).click();
    await expect(page).toHaveURL(/\/order\/mesh/);
  });

  test("sizes other products and stands keep price and photos", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await page.goto("/sizes");

    const other = page.getByRole("region", { name: /other banner products/i });
    await expect(other.locator("img").first()).toBeVisible();
    await expect(other.getByText(/\/ sq ft/i).first()).toBeVisible();

    const stands = page.getByRole("region", { name: /banner stands/i });
    await expect(stands.locator("img").first()).toBeVisible();
    await expect(stands.getByText(/\$\d+/).first()).toBeVisible();
  });
});
