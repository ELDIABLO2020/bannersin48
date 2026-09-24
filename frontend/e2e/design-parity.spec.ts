import { test, expect } from "@playwright/test";

test.describe("brand design", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("hero renders a product image", async ({ page }) => {
    const hero = page.getByRole("region", { name: /everything to print/i });
    await expect(hero.locator("img").first()).toBeVisible();
  });

  test("final CTA is a direct order action with no discarded email field", async ({ page }) => {
    // The homepage no longer collects (and then discards) an email.
    await expect(page.getByRole("textbox", { name: /email/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /start your order/i }).first()).toBeVisible();
  });

  test("homepage has multiple section images", async ({ page }) => {
    const images = page.locator("main img");
    await expect(images.first()).toBeVisible({ timeout: 10_000 });
    expect(await images.count()).toBeGreaterThanOrEqual(5);
  });

  test("product catalog cards render images and link to order", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    const catalog = page.getByRole("region", { name: /every banner we print/i });
    await expect(catalog.locator("img").first()).toBeVisible();
    await expect(catalog.getByRole("link", { name: /order hd banner/i })).toHaveAttribute(
      "href",
      "/order/hd-banner",
    );
  });

  test("help-me-choose need chips link to catalog filters", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    const chooser = page.getByRole("list", { name: "Choose by need" });
    await expect(chooser.getByRole("link", { name: "Windy" })).toHaveAttribute("href", "/order?need=windy");
  });

  test("display typography uses Bebas Neue on hero headline", async ({ page }) => {
    const h1 = page.getByRole("heading", { level: 1 });
    const fontFamily = await h1.evaluate((el) => getComputedStyle(el).fontFamily.toLowerCase());
    expect(fontFamily).toContain("bebas");
  });

  test("reduced motion keeps GSAP reveal content visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const reveals = page.locator("[data-gsap-reveal]");
    await expect(reveals.first()).toBeVisible({ timeout: 10_000 });
    expect(await reveals.count()).toBeGreaterThan(0);
    await expect(page.getByRole("heading", { name: /every banner we print/i })).toBeVisible();

    const hiddenRevealCount = await reveals.evaluateAll((elements) =>
      elements.filter((el) => {
        const style = getComputedStyle(el);
        return style.opacity === "0" || style.visibility === "hidden";
      }).length,
    );

    expect(hiddenRevealCount).toBe(0);
  });
});
