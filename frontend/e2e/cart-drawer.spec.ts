import { test, expect } from "@playwright/test";

/**
 * P0-02 regression: opening the cart drawer must not leave `body { overflow:
 * hidden }` behind after it closes, whichever way it closes. This was a
 * checkout-blocking bug (the checkout page became unscrollable).
 */
async function bodyOverflow(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(() => document.body.style.overflow);
}

async function openDrawer(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /open cart/i }).click();
  await expect(page.getByRole("dialog", { name: /your cart/i })).toBeVisible();
}

test.describe("Cart drawer scroll restoration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /open cart/i })).toBeVisible();
  });

  test("close button restores body scroll", async ({ page }) => {
    await openDrawer(page);
    await expect.poll(() => bodyOverflow(page)).toBe("hidden");

    await page.getByRole("button", { name: /close cart/i }).click();
    await expect(page.getByRole("dialog", { name: /your cart/i })).toBeHidden();
    await expect.poll(() => bodyOverflow(page)).toBe("");
  });

  test("Escape restores body scroll", async ({ page }) => {
    await openDrawer(page);
    await expect.poll(() => bodyOverflow(page)).toBe("hidden");

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /your cart/i })).toBeHidden();
    await expect.poll(() => bodyOverflow(page)).toBe("");
  });

  test("backdrop click restores body scroll", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Drawer is full-width on mobile; no visible backdrop.");
    await openDrawer(page);
    await expect.poll(() => bodyOverflow(page)).toBe("hidden");

    await page.getByTestId("cart-drawer-backdrop").click({ position: { x: 20, y: 20 } });
    await expect(page.getByRole("dialog", { name: /your cart/i })).toBeHidden();
    await expect.poll(() => bodyOverflow(page)).toBe("");
  });

  test("reopening after close keeps the page scrollable", async ({ page }) => {
    await openDrawer(page);
    await page.getByRole("button", { name: /close cart/i }).click();
    await expect.poll(() => bodyOverflow(page)).toBe("");

    // The second open/close cycle must behave the same.
    await openDrawer(page);
    await expect.poll(() => bodyOverflow(page)).toBe("hidden");
    await page.keyboard.press("Escape");
    await expect.poll(() => bodyOverflow(page)).toBe("");
  });
});
