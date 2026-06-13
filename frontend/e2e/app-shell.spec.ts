import { test, expect } from "@playwright/test";

test.describe("M3: app shell", () => {
  test("desktop shows top nav, hides tab bar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner", { name: /banners in 48 home/i })).toBeVisible();
    await expect(page.getByRole("navigation", { name: /primary mobile navigation/i })).toBeHidden();
    await expect(page.getByRole("link", { name: "Order a Banner" }).first()).toBeVisible();
  });

  test("mobile shows bottom tab bar, hides top nav links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: /primary mobile navigation/i })).toBeVisible();
    // Top nav center links are hidden < lg
    const orderButton = page.getByRole("link", { name: "Order a Banner" });
    await expect(orderButton).toBeVisible();
  });

  test("manifest is served and references the PWA theme", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Banners In 48");
    expect(body.theme_color.toUpperCase()).toBe("#13191E");
    expect(body.display).toBe("standalone");
  });

  test("robots.txt is served and disallows /api/ and /admin/", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/Disallow:\s*\/api\//);
    expect(text).toMatch(/Disallow:\s*\/admin\//);
  });
});
