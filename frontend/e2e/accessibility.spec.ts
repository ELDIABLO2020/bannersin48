import { test, expect, type Page } from "@playwright/test";
import { scanA11y, formatViolations } from "./helpers/axe";
import { seedDemoAuth } from "./helpers/auth";

/**
 * Wave 11 accessibility gate.
 *
 * - axe (WCAG A/AA) on primary routes + states. PR gate fails on critical
 *   only and logs serious findings; `AXE_STRICT=1` fails on serious too.
 * - Keyboard interaction smoke for menus, dialogs, builder, cart, checkout, admin.
 * - 320 px reflow + 200% zoom screenshots with no horizontal overflow.
 * - Touch-target checks for critical controls.
 */

async function waitForMocks(page: Page) {
  await page.waitForFunction(
    () => (window as unknown as { __BI48_MOCKS_READY__?: boolean }).__BI48_MOCKS_READY__ === true,
    null,
    { timeout: 20_000 },
  );
}

async function expectNoSerious(page: Page, routeLabel: string, options?: { disableRules?: string[] }) {
  const { results, violations } = await scanA11y(page, options);
  if (process.env.AXE_STRICT !== "1") {
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    if (serious.length > 0) {
      console.warn(`axe (${routeLabel}) non-blocking serious/critical:\n${formatViolations(serious)}`);
    }
  }
  expect(violations, `axe (${routeLabel}):\n${formatViolations(violations) || "none"}`).toEqual([]);
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
  expect(
    overflow.scrollWidth,
    `page should not scroll horizontally (scrollWidth ${overflow.scrollWidth} > ${overflow.clientWidth})`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe("Wave 11: accessibility suite", () => {
  test.describe("axe scans on primary routes", () => {
    test.describe.configure({ mode: "serial" });

    const routes: Array<{ path: string; label: string; ready?: (p: Page) => Promise<void> }> = [
      { path: "/", label: "home" },
      { path: "/sizes", label: "sizes" },
      { path: "/how-it-works", label: "how-it-works" },
      { path: "/help", label: "help" },
      { path: "/login", label: "login" },
      { path: "/register", label: "register" },
      { path: "/cart", label: "cart (empty)" },
      { path: "/checkout", label: "checkout (empty)" },
      { path: "/orders", label: "orders (signed out)" },
      { path: "/dashboard", label: "dashboard (signed out)" },
      { path: "/admin", label: "admin (sign-in)" },
      {
        path: "/order",
        label: "order hub",
        ready: async (p) => {
          await waitForMocks(p);
          await expect(p.getByTestId("hub-card-hd-banner")).toBeVisible({ timeout: 15_000 });
        },
      },
      { path: "/not-a-real-route", label: "404" },
    ];

    for (const route of routes) {
      test(`${route.label} has no serious/critical axe violations`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== "desktop-chromium", "axe runs once on desktop");
        test.setTimeout(60_000);
        // Disable reveal/transition animations before navigation so axe
        // measures stable final colors instead of a mid-fade opacity artifact
        // (the GSAP reveals already respect reduced motion).
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(route.path);
        await route.ready?.(page);
        // Let client queries/hydration settle before scanning (networkidle can
        // hang on mock-backed pages that keep a service-worker connection).
        await page.waitForTimeout(500);
        await expectNoSerious(page, route.label);
      });
    }
  });

  test.describe("keyboard interactions", () => {
    test("skip link moves focus to main content", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
      await page.goto("/");
      await waitForMocks(page);
      await page.keyboard.press("Tab");
      await expect(page.locator(".skip-link")).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#main-content/);
      const focusedId = await page.evaluate(() => document.activeElement?.id);
      expect(focusedId).toBe("main-content");
    });

    test("mega menu opens on focus and product links are reachable", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Desktop mega menu");
      await page.goto("/");
      await page.getByRole("link", { name: "Banners", exact: true }).focus();
      await expect(page.getByText("Shop by need")).toBeVisible();
      const allBanners = page.getByRole("link", { name: "All banners", exact: true }).first();
      await allBanners.focus();
      await expect(allBanners).toBeFocused();
    });

    test("mobile menu drawer opens with Enter, traps focus, closes on Escape", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile-webkit", "Mobile menu");
      await page.goto("/");
      const trigger = page.getByRole("button", { name: /open menu/i });
      await trigger.focus();
      await page.keyboard.press("Enter");
      const drawer = page.getByRole("dialog", { name: /menu/i });
      await expect(drawer).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await expect(trigger).toBeFocused();
    });

    test("hub more-info dialog takes focus and closes on Escape", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
      await page.goto("/order");
      await waitForMocks(page);
      await expect(page.getByTestId("hub-card-hd-banner")).toBeVisible({ timeout: 15_000 });
      await page.getByTestId("hub-more-info-mesh").focus();
      await page.keyboard.press("Enter");
      const modal = page.getByTestId("hub-info-modal");
      await expect(modal).toBeVisible();
      await expect(modal).toContainText(/Webbing/i);
      // Focus moves into the dialog (Radix focus trap).
      const focusInside = await page.evaluate(
        () => !!document.activeElement?.closest('[data-testid="hub-info-modal"]'),
      );
      expect(focusInside).toBe(true);
      await page.keyboard.press("Escape");
      await expect(modal).toBeHidden();
    });

    test("cart drawer moves focus in, restores focus and scroll on Escape", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
      await page.goto("/");
      await waitForMocks(page);
      const trigger = page.getByRole("button", { name: /open cart/i });
      await trigger.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: /your cart/i });
      await expect(dialog).toBeVisible();
      await expect(page.getByRole("button", { name: /close cart/i })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    });

    test("builder image picker is keyboard-openable and its close button is reachable", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
      await page.addInitScript(() => sessionStorage.removeItem("bi48.builder"));
      seedDemoAuth(page);
      await page.goto("/order/hd-banner");
      await page.reload();
      await expect(page.getByTestId("builder-shell")).toBeVisible({ timeout: 30_000 });
      const trigger = page.getByTestId("dock-images");
      await trigger.focus();
      await page.keyboard.press("Enter");
      const picker = page.getByTestId("image-picker");
      await expect(picker).toBeVisible({ timeout: 10_000 });
      await expect(picker).toHaveAttribute("aria-modal", "true");
      await page.getByTestId("image-picker-close").focus();
      await page.keyboard.press("Enter");
      await expect(picker).toBeHidden();
    });

    test("builder quantity and dock controls are keyboard-operable", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
      await page.addInitScript(() => sessionStorage.removeItem("bi48.builder"));
      await page.goto("/order/mesh");
      await expect(page.getByTestId("builder-shell")).toBeVisible({ timeout: 30_000 });
      await page.getByTestId("qty-plus").focus();
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("qty-value")).toHaveText("2");
    });

    test("checkout empty state has an H1 and a keyboard-reachable CTA", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
      await page.goto("/checkout");
      await expect(page.getByRole("heading", { level: 1, name: /cart is empty/i })).toBeVisible();
      const cta = page.getByRole("link", { name: /start an order/i });
      await cta.focus();
      await expect(cta).toBeFocused();
    });

    test("admin sign-in shell is keyboard-navigable and gates non-staff accounts", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
      await page.goto("/admin");
      await page.getByLabel("Email").focus();
      await page.keyboard.type("demo@bannersin48.com");
      await page.keyboard.press("Tab");
      await page.keyboard.type("demo1234");
      await page.keyboard.press("Enter");
      // The demo customer account is not staff, so the gate message appears.
      await expect(page.getByText(/does not have staff access/i)).toBeVisible({ timeout: 15_000 });
    });

    test("admin mobile menu toggles and closes with Escape", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile-webkit", "Mobile admin menu");
      await page.addInitScript(() => {
        window.localStorage.setItem(
          "bi48.auth",
          JSON.stringify({
            state: {
              user: {
                id: "user_admin",
                email: "admin@bannersin48.local",
                fullName: "Site Admin",
                role: "ADMIN",
                taxExempt: false,
                taxExemptApproved: false,
                rewardsPoints: 0,
                savedAddresses: [],
                createdAt: "2026-08-29T00:00:00.000Z",
              },
              token: "mock-token-user_admin",
            },
            version: 0,
          }),
        );
      });
      await page.goto("/admin");
      await expect(page.getByRole("link", { name: "BI48 Ops" })).toBeVisible();
      const trigger = page.getByRole("button", { name: /open admin menu/i });
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("navigation", { name: /admin sections/i })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("navigation", { name: /admin sections/i })).toBeHidden();
      await expect(trigger).toBeFocused();
    });
  });

  test.describe("reflow and zoom", () => {
    test("320px reflow has no horizontal overflow", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Screenshot project");
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto("/");
      await assertNoHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath("reflow-320-home.png"), fullPage: false });
    });

    test("200% zoom proxy (640px) reflows without horizontal overflow", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Screenshot project");
      await page.setViewportSize({ width: 640, height: 480 });
      await page.goto("/");
      await assertNoHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath("zoom-200-home.png"), fullPage: false });
    });
  });

  test.describe("touch targets", () => {
    test("critical storefront controls meet 44px primary / 24px minimum", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "Desktop measurements");

      async function sizeOf(locator: import("@playwright/test").Locator) {
        const box = await locator.boundingBox();
        expect(
          box,
          `${await locator.evaluate((el) => (el as HTMLElement).outerHTML.slice(0, 120))} should be visible`,
        ).toBeTruthy();
        return box!;
      }

      await page.goto("/");
      await waitForMocks(page);

      for (const [name, locator] of [
        ["Order now", page.getByRole("link", { name: /order now/i }).first()],
        ["Open cart", page.getByRole("button", { name: /open cart/i })],
        ["Log in", page.getByRole("banner").getByRole("link", { name: "Log In" })],
      ] as const) {
        const box = await sizeOf(locator);
        expect(box.width, `${name} width`).toBeGreaterThanOrEqual(44);
        expect(box.height, `${name} height`).toBeGreaterThanOrEqual(44);
      }

      await page.goto("/order/mesh");
      await expect(page.getByTestId("builder-shell")).toBeVisible({ timeout: 30_000 });
      const addToCart = await sizeOf(page.getByTestId("add-to-cart"));
      expect(addToCart.height).toBeGreaterThanOrEqual(44);

      for (const [name, locator] of [
        ["quantity minus", page.getByTestId("qty-minus")],
        ["quantity plus", page.getByTestId("qty-plus")],
      ] as const) {
        const box = await sizeOf(locator);
        expect(box.width, `${name} width`).toBeGreaterThanOrEqual(24);
        expect(box.height, `${name} height`).toBeGreaterThanOrEqual(24);
      }
    });
  });
});
