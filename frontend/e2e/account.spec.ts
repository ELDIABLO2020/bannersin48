import { test, expect, type Page } from "@playwright/test";
import { seedDemoAuth } from "./helpers/auth";
import { scanA11y, formatViolations } from "./helpers/axe";

/**
 * Phase 3 customer account (docs/accounts-admin-rbac-plan.md §4.3 / §12 task 3.6):
 * signed-out gating with `next`, the section nav, profile edit, address book,
 * saved designs, sessions, rewards ledger and settings against the MSW backend,
 * plus axe on every account page and a 375 px overflow check.
 */

async function waitForMocks(page: Page) {
  await page.waitForFunction(
    () => (window as unknown as { __BI48_MOCKS_READY__?: boolean }).__BI48_MOCKS_READY__ === true,
    null,
    { timeout: 20_000 },
  );
}

const SECTIONS = ["/account", "/account/orders", "/account/designs", "/account/artwork", "/account/rewards", "/account/profile", "/account/addresses", "/account/security", "/account/settings"];

test.describe("customer account", () => {
  test("a signed-out visit shows the sign-in prompt with the requested page as `next`", async ({ page }) => {
    await page.goto("/account/addresses");
    await waitForMocks(page);
    await expect(page.getByRole("heading", { level: 1, name: /log in to your account/i })).toBeVisible();
    await expect(page.locator("#main-content").getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login?next=%2Faccount%2Faddresses");
    // The old dashboard URL still lands in the account area.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/account$/);
  });

  test("overview shows identity, balance and the section nav; every section renders", async ({ page }, testInfo) => {
    test.slow();
    await seedDemoAuth(page);
    await page.goto("/account");
    await waitForMocks(page);
    await expect(page.getByRole("heading", { level: 1, name: "Your account" })).toBeVisible();
    await expect(page.getByTestId("account-identity")).toContainText("demo@bannersin48.com");
    await expect(page.getByTestId("account-identity")).toContainText("Email verified");
    await expect(page.getByTestId("account-rewards-summary")).toContainText("$1.20");
    const nav = page.getByRole("navigation", { name: "Account sections" });
    await expect(nav.getByRole("link")).toHaveCount(SECTIONS.length);
    for (const [label, path] of [
      ["Rewards", "/account/rewards"],
      ["Security", "/account/security"],
      ["Settings", "/account/settings"],
    ] as const) {
      await nav.getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("heading", { level: 1, name: label })).toBeVisible();
      await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
      if (testInfo.project.name === "mobile-webkit") {
        const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
        expect(overflow.scrollWidth, `${path} must not scroll horizontally on a phone`).toBeLessThanOrEqual(overflow.clientWidth + 1);
      }
    }
  });

  test("every account section fits a phone without horizontal scroll", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-webkit", "Phone viewport");
    test.slow();
    await seedDemoAuth(page);
    await page.goto("/account");
    await waitForMocks(page);
    const nav = page.getByRole("navigation", { name: "Account sections" });
    for (const path of SECTIONS) {
      // Client-side navigation keeps the mock store (and the seeded session) intact.
      await nav.locator(`a[href="${path}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}$`));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      expect(overflow.scrollWidth, `${path} must not scroll horizontally on a phone`).toBeLessThanOrEqual(overflow.clientWidth + 1);
    }
  });

  test("profile edits persist and update the signed-in name", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await seedDemoAuth(page);
    await page.goto("/account/profile");
    await waitForMocks(page);
    const form = page.getByTestId("profile-form");
    await expect(form.getByLabel("First name")).toHaveValue("Demo");
    await form.getByLabel("First name").fill("Dana");
    await form.getByLabel("Phone (optional)").fill("734-555-0199");
    await form.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByTestId("profile-message")).toContainText("Profile saved");
    // Client-side navigation: the seeded init script would re-seed the original session on a full load.
    await page.getByRole("navigation", { name: "Account sections" }).getByRole("link", { name: "Overview" }).click();
    await expect(page.getByTestId("account-identity")).toContainText("Dana Customer");
  });

  test("address book: add, make default, edit, remove", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await seedDemoAuth(page);
    await page.goto("/account/addresses");
    await waitForMocks(page);
    const list = page.getByTestId("address-list");
    await expect(list.getByRole("listitem")).toHaveCount(2);
    await expect(list.getByRole("listitem").first()).toContainText("Default");

    await page.getByTestId("address-add").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Street address").fill("  44  Depot St ");
    await dialog.getByLabel("City").fill("Dexter");
    await dialog.getByLabel("State").fill("mi");
    await dialog.getByLabel("ZIP").fill("48130");
    await page.getByTestId("address-submit").click();
    await expect(page.getByTestId("address-notice")).toContainText("Address added");
    await expect(list.getByRole("listitem")).toHaveCount(3);
    // Normalized before saving: collapsed whitespace, upper-case state.
    const added = list.getByRole("listitem").filter({ hasText: "44 Depot St" });
    await expect(added).toContainText("Dexter, MI 48130");

    await added.getByRole("button", { name: "Make default" }).click();
    await expect(page.getByTestId("address-notice")).toContainText("Default shipping address updated");
    await expect(list.getByRole("listitem").first()).toContainText("44 Depot St");
    await expect(list.getByText("Default", { exact: true })).toHaveCount(1);

    await list.getByRole("listitem").first().getByRole("button", { name: "Edit" }).click();
    await page.getByRole("dialog").getByLabel("Label (optional)").fill("Warehouse");
    await page.getByTestId("address-submit").click();
    await expect(page.getByTestId("address-notice")).toContainText("Address updated");
    await expect(list.getByRole("listitem").first()).toContainText("Warehouse");

    await list.getByRole("listitem").last().getByRole("button", { name: "Remove" }).click();
    await page.getByRole("button", { name: "Remove address" }).click();
    await expect(page.getByTestId("address-notice")).toContainText("Address removed");
    await expect(list.getByRole("listitem")).toHaveCount(2);
  });

  test("saved designs: rename, order again at today's price, delete", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await seedDemoAuth(page);
    await page.goto("/account/designs");
    await waitForMocks(page);
    const grid = page.getByTestId("design-grid");
    await expect(grid.getByTestId("saved-design")).toHaveCount(2);
    // Most recently updated first. Grab the card by position: once renaming starts, its
    // name lives in an input value, which a text filter would no longer match.
    const first = grid.getByTestId("saved-design").first();
    await expect(first).toContainText("Autumn sale mesh");
    await first.getByRole("button", { name: "Rename" }).click();
    await first.getByLabel("Design name").fill("Fall sale mesh");
    await first.getByRole("button", { name: "Save" }).click();
    await expect(page.getByTestId("design-message")).toContainText("Design renamed");
    await expect(grid.getByTestId("saved-design-name").filter({ hasText: "Fall sale mesh" })).toBeVisible();

    // A design with artwork lands in the cart as a server-priced line.
    const withArtwork = grid.getByTestId("saved-design").filter({ hasText: "Grand opening banner" });
    await withArtwork.getByTestId("saved-design-order").click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByText(/HD Banner/i).first()).toBeVisible();

    // Back through the header (client-side, so the mock store keeps the rename).
    await page.getByRole("banner").getByRole("link", { name: "Account" }).click();
    await page.getByRole("navigation", { name: "Account sections" }).getByRole("link", { name: "Saved designs" }).click();
    const target = page.getByTestId("saved-design").filter({ hasText: "Fall sale mesh" });
    await target.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete design" }).click();
    await expect(page.getByTestId("design-message")).toContainText("Design deleted");
    await expect(page.getByTestId("saved-design")).toHaveCount(1);
  });

  test("artwork library lists files and manages folders", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await seedDemoAuth(page);
    await page.goto("/account/artwork");
    await waitForMocks(page);
    await expect(page.getByTestId("artwork-grid").getByRole("listitem")).toHaveCount(2);
    await page.getByLabel("New folder name").fill("Trade shows");
    await page.getByTestId("folder-create").click();
    await expect(page.getByTestId("artwork-message")).toContainText('Folder "Trade shows" created');
    await page.getByTestId("artwork-folders").getByRole("button", { name: "Trade shows" }).click();
    await expect(page.getByText("No files here yet.")).toBeVisible();
    await page.getByRole("button", { name: "Delete folder" }).click();
    await page.getByRole("button", { name: "Delete folder" }).last().click();
    await expect(page.getByTestId("artwork-message")).toContainText("Folder removed");
    await expect(page.getByTestId("artwork-folders").getByRole("button", { name: "Trade shows" })).toHaveCount(0);
  });

  test("security: devices list, sign out others; email change stays hidden without a transport", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await seedDemoAuth(page);
    await page.goto("/account/security");
    await waitForMocks(page);
    await expect(page.getByRole("link", { name: "Change password" })).toHaveAttribute("href", "/change-password?next=%2Faccount%2Fsecurity");
    await expect(page.getByTestId("email-change-unavailable")).toBeVisible();
    await expect(page.getByTestId("email-change-form")).toHaveCount(0);
    const list = page.getByTestId("session-list");
    await expect(list.getByTestId("session-current")).toHaveCount(1);
    await expect(list.getByTestId("session-other")).toHaveCount(2);
    await list.getByTestId("session-other").first().getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByTestId("session-message")).toContainText("That device was signed out");
    await expect(list.getByTestId("session-other")).toHaveCount(1);
    await page.getByTestId("revoke-others").click();
    await page.getByRole("button", { name: "Sign out others" }).click();
    await expect(page.getByTestId("session-message")).toContainText("1 other device signed out");
    await expect(list.getByTestId("session-other")).toHaveCount(0);
    await expect(page.getByTestId("revoke-others")).toBeDisabled();
  });

  test("rewards ledger matches the balance and settings toggles persist", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    await seedDemoAuth(page);
    await page.goto("/account/rewards");
    await waitForMocks(page);
    await expect(page.getByTestId("rewards-balance")).toHaveText("$1.20");
    const rows = page.getByTestId("reward-ledger").locator("tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(rows.first()).toContainText("Applied to an order");
    await expect(rows.first()).toContainText("−$0.80");
    await expect(rows.last()).toContainText("BI48-000017");

    const nav = page.getByRole("navigation", { name: "Account sections" });
    await nav.getByRole("link", { name: "Settings" }).click();
    const marketing = page.getByLabel(/Offers and news/);
    await expect(marketing).not.toBeChecked();
    await marketing.check();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    // Leave and come back (client-side; a full load would re-seed the session and reset the mock store).
    await nav.getByRole("link", { name: "Overview" }).click();
    await nav.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByLabel(/Offers and news/)).toBeChecked();
  });

  test("the builder saves a design into the account; signed out it points at sign-in", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop");
    test.slow();
    // Signed out: the control is a sign-in link that returns to the builder.
    await page.addInitScript(() => sessionStorage.removeItem("bi48.builder"));
    await page.goto("/order/hd-banner");
    await waitForMocks(page);
    await expect(page.getByTestId("save-design-signin")).toHaveAttribute("href", "/login?next=%2Forder%2Fhd-banner");

    // Signed in: name it, save it, and find it first in the account grid (client-side
    // navigation keeps the mock store).
    await seedDemoAuth(page);
    await page.reload();
    await waitForMocks(page);
    await expect(page.getByTestId("price-hero").getByTestId("price-total")).toContainText("$", { timeout: 10_000 });
    await page.getByTestId("save-design-open").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Save this design" })).toBeVisible();
    await expect(dialog.getByTestId("save-design-name")).not.toHaveValue("");
    await dialog.getByTestId("save-design-name").fill("Trade show backdrop");
    await dialog.getByTestId("save-design-submit").click();
    await expect(page.getByTestId("save-design-notice")).toContainText("Trade show backdrop");
    await page.getByTestId("save-design-notice").getByRole("link", { name: "View saved designs" }).click();
    await expect(page).toHaveURL(/\/account\/designs$/);
    const grid = page.getByTestId("design-grid");
    await expect(grid.getByTestId("saved-design")).toHaveCount(3);
    await expect(grid.getByTestId("saved-design").first()).toContainText("Trade show backdrop");
    await expect(grid.getByTestId("saved-design").first()).toContainText(/HD Banner/i);
  });

  test.describe("accessibility", () => {
    for (const path of SECTIONS) {
      test(`${path} has no critical axe violations signed in`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== "desktop-chromium", "axe runs once on desktop");
        await page.emulateMedia({ reducedMotion: "reduce" });
        await seedDemoAuth(page);
        await page.goto(path);
        await waitForMocks(page);
        await expect(page.getByTestId("account-content")).toBeVisible();
        await page.waitForTimeout(500);
        const { results, violations } = await scanA11y(page);
        const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        if (serious.length > 0 && process.env.AXE_STRICT !== "1") console.warn(`axe (${path}) non-blocking serious/critical:\n${formatViolations(serious)}`);
        expect(violations, `axe (${path}):\n${formatViolations(violations) || "none"}`).toEqual([]);
      });
    }
  });
});
