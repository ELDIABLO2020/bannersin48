import { test, expect } from "@playwright/test";

test.describe("M3: app shell", () => {
  test("desktop shows top nav, hides tab bar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop only");
    await page.goto("/");
    await expect(page.getByRole("banner", { name: /banners in 48 home/i })).toBeVisible();
    await expect(page.getByRole("navigation", { name: /primary mobile navigation/i })).toBeHidden();
    await expect(page.getByRole("link", { name: "Order now" }).first()).toBeVisible();
  });

  test("mobile shows bottom tab bar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-webkit", "Mobile only");
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: /primary mobile navigation/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /open menu/i })).toBeVisible();
  });

  test("manifest is served and references the PWA theme", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Banners In 48");
    expect(body.theme_color.toUpperCase()).toBe("#FFFFFF");
    expect(body.display).toBe("standalone");
  });

  test("primary accent surfaces use brand magenta (#CB1079)", async ({ page }) => {
    await page.goto("/");
    const accent = page.locator(".bg-strong-accent").locator("visible=true").first();
    await expect(accent).toBeVisible();
    const bg = await accent.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgb(203, 16, 121)");
  });

  test("internal mode is visibly non-production and noindex", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.getByText(/internal platform test.*manual payment/i).first()).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex.*nofollow/i,
    );

    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(/Disallow:\s*\/$/m);
  });

  test("customer shell has no unsupported payment or review claims", async ({ page }) => {
    await page.goto("/");
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/Visa|Mastercard|Apple Pay|PayPal/);
    await expect(page.getByRole("link", { name: /reviews|testimonials/i })).toHaveCount(0);
  });
});
