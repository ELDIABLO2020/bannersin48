import { test, expect } from "@playwright/test";

const MOCK_STRINGS = [
  "YOUR BANNER HERE",
  "Product UI preview",
  "Customer story",
  "Storefront banner",
  "Mobile order view",
];

test.describe("M4: HCP design parity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("hero renders a product image", async ({ page }) => {
    const hero = page.getByRole("region", { name: /everything to print/i });
    await expect(hero.locator("img").first()).toBeVisible();
  });

  test("primary accent surfaces use live HCP gold (#FF9B24)", async ({ page }) => {
    const accent = page.locator(".bg-strong-accent").first();
    await expect(accent).toBeVisible();
    const bg = await accent.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgb(255, 155, 36)");
  });

  test("email CTA uses attached pill form styling", async ({ page }) => {
    const input = page.getByRole("textbox", { name: /email/i }).first();
    await expect(input).toBeVisible();
    const inputRadius = await input.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
    expect(parseFloat(inputRadius)).toBeGreaterThan(40);

    const submit = page.getByRole("button", { name: /start your order/i }).first();
    const btnRadius = await submit.evaluate((el) => getComputedStyle(el).borderTopRightRadius);
    expect(parseFloat(btnRadius)).toBeGreaterThan(40);
  });

  test("featured testimonial and carousel sections render", async ({ page }) => {
    await expect(page.locator("#featured-testimonial-h")).toBeVisible();
    await expect(page.getByRole("heading", { name: /hear from banners in 48 customers/i })).toBeVisible();
  });

  test("no blank CSS mock placeholder strings on homepage", async ({ page }) => {
    const bodyText = await page.locator("body").innerText();
    for (const mock of MOCK_STRINGS) {
      expect(bodyText).not.toContain(mock);
    }
  });

  test("homepage has multiple section images", async ({ page }) => {
    const images = page.locator("main img");
    await expect(images).toHaveCount(await images.count());
    expect(await images.count()).toBeGreaterThanOrEqual(8);
  });

  test("display typography uses Bebas Neue on hero headline", async ({ page }) => {
    const h1 = page.getByRole("heading", { level: 1 });
    const fontFamily = await h1.evaluate((el) => getComputedStyle(el).fontFamily.toLowerCase());
    expect(fontFamily).toContain("bebas");
  });

  test("reduced motion keeps GSAP reveal content visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const reveals = page.locator("[data-gsap-reveal]");
    expect(await reveals.count()).toBeGreaterThan(0);
    await expect(page.getByRole("heading", { name: /popular sizes/i })).toBeVisible();

    const hiddenRevealCount = await reveals.evaluateAll((elements) =>
      elements.filter((el) => {
        const style = getComputedStyle(el);
        return style.opacity === "0" || style.visibility === "hidden";
      }).length,
    );

    expect(hiddenRevealCount).toBe(0);
  });
});
