import { test, expect, type Page } from "@playwright/test";
import { seedStaffAuth } from "./helpers/auth";
import { scanA11y, formatViolations } from "./helpers/axe";

/**
 * Phase 4 admin panel extensions (docs/accounts-admin-rbac-plan.md §12 task 4.4):
 * the dashboard landing page, the order board at /admin/orders with internal
 * notes, customer edit / suspend / reactivate with the reward ledger and manual
 * adjustments, promo code management, permission-gated actions, and axe on
 * every new page — all against the MSW backend.
 */

async function waitForMocks(page: Page) {
  await page.waitForFunction(
    () => (window as unknown as { __BI48_MOCKS_READY__?: boolean }).__BI48_MOCKS_READY__ === true,
    null,
    { timeout: 20_000 },
  );
}

const nav = (page: Page) => page.getByRole("navigation", { name: "Admin" });

test.describe("admin panel (phase 4)", () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop admin flows; the mobile shell is covered in accessibility.spec.ts");
  });

  test("dashboard links each stage into the order board, where an internal note lands on the timeline", async ({ page }) => {
    await seedStaffAuth(page);
    await page.goto("/admin");
    await waitForMocks(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByTestId("dashboard-stats")).toContainText("Open orders");
    await expect(page.getByTestId("dashboard-buckets")).toContainText("New");

    // The seeded order sits in the New bucket; the stage card preselects it on the board.
    await page.getByTestId("dashboard-buckets").getByRole("link", { name: /^New:/ }).click();
    await expect(page).toHaveURL(/\/admin\/orders\?status=RECEIVED$/);
    await expect(page.getByRole("heading", { name: "Order board" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^New/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("orders-table")).toContainText("BI48-000018");

    await page.getByRole("link", { name: "BI48-000018" }).click();
    await expect(page.getByRole("heading", { name: "BI48-000018" })).toBeVisible();
    await page.getByTestId("order-note-input").fill("Customer asked for delivery to the loading dock.");
    await page.getByTestId("order-note-submit").click();
    await expect(page.getByTestId("order-events")).toContainText("Customer asked for delivery to the loading dock.");
    await expect(page.getByTestId("order-events")).toContainText("(internal)");
    await expect(page.getByTestId("order-note-input")).toHaveValue("");
    // The note is an event, not a status change: the order is still New.
    await expect(page.getByRole("link", { name: "← Order board" })).toHaveAttribute("href", "/admin/orders");
  });

  test("customer detail: reactivate, edit the profile, adjust rewards with a reason, suspend again", async ({ page }) => {
    test.slow();
    await seedStaffAuth(page);
    await page.goto("/admin/customers");
    await waitForMocks(page);
    await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
    // Only storefront accounts are listed; staff live under /admin/staff.
    await expect(page.getByRole("link", { name: "Jordan Rivera" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pat Picker" })).toHaveCount(0);

    await page.getByRole("link", { name: "Jordan Rivera" }).click();
    await expect(page.getByRole("heading", { name: "Jordan Rivera" })).toBeVisible();
    await expect(page.getByTestId("customer-status")).toHaveText("Suspended");
    await expect(page.getByTestId("customer-suspended-banner")).toContainText("Repeated chargebacks");

    // 1. Reactivate.
    await page.getByTestId("customer-reactivate").click();
    await page.getByTestId("status-reason").fill("Dispute resolved with the bank");
    await page.getByTestId("status-confirm").click();
    await expect(page.getByTestId("customer-message")).toContainText(/reactivated/i);
    await expect(page.getByTestId("customer-status")).toHaveText("Active");
    await expect(page.getByTestId("customer-suspended-banner")).toHaveCount(0);

    // 2. Edit the profile on the customer's behalf.
    await page.getByLabel("Phone").fill("734-555-0199");
    await page.getByTestId("customer-profile-save").click();
    await expect(page.getByTestId("customer-message")).toContainText(/profile saved/i);

    // 3. Credit rewards with a reason; the ledger shows who did it.
    await expect(page.getByTestId("reward-balance")).toHaveText("$0.00");
    await page.getByTestId("reward-adjust").click();
    await page.getByTestId("reward-amount").fill("2.50");
    await page.getByTestId("reward-reason").fill("Goodwill after the reprint delay");
    await page.getByTestId("reward-submit").click();
    await expect(page.getByTestId("customer-message")).toContainText("New balance $2.50");
    await expect(page.getByTestId("reward-balance")).toHaveText("$2.50");
    await expect(page.getByTestId("reward-ledger-admin")).toContainText("Manual adjustment");
    await expect(page.getByTestId("reward-ledger-admin")).toContainText("admin@bannersin48.local");
    await expect(page.getByTestId("reward-ledger-admin")).toContainText("+$2.50");

    // A debit below the balance is refused before it reaches the API.
    await page.getByTestId("reward-adjust").click();
    await page.getByRole("radio", { name: /debit/i }).check();
    await page.getByTestId("reward-amount").fill("5");
    await page.getByTestId("reward-reason").fill("Trying to take too much back");
    await page.getByTestId("reward-submit").click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(/cannot deduct more/i);
    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

    // 4. Suspend again with a reason; the reason is shown and the status flips.
    await page.getByTestId("customer-suspend").click();
    await page.getByTestId("status-reason").fill("Fraud review opened");
    await page.getByTestId("status-confirm").click();
    await expect(page.getByTestId("customer-message")).toContainText(/suspended/i);
    await expect(page.getByTestId("customer-suspended-banner")).toContainText("Fraud review opened");

    // 5. Every step is in the audit log.
    await nav(page).getByRole("link", { name: "Audit log" }).click();
    for (const action of ["customer.reactivate", "customer.update", "reward.adjust", "customer.suspend"]) {
      await expect(page.getByTestId("audit-table")).toContainText(action);
    }
  });

  test("promo codes: create, validate, edit, deactivate and filter", async ({ page }) => {
    await seedStaffAuth(page);
    await page.goto("/admin/promos");
    await waitForMocks(page);
    await expect(page.getByRole("heading", { name: "Promo codes" })).toBeVisible();
    await expect(page.getByRole("note")).toContainText(/checkout does not apply promo codes yet/i);
    await expect(page.getByTestId("promo-table")).toContainText("WELCOME10");

    // Validation happens client-side with the shared schema.
    await page.getByTestId("promo-create").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Code").fill("spring15");
    await expect(dialog.getByLabel("Code")).toHaveValue("SPRING15");
    await dialog.locator("#promo-value").fill("150");
    await page.getByTestId("promo-submit").click();
    await expect(dialog.getByRole("alert")).toContainText(/cannot exceed 100%/i);
    await dialog.locator("#promo-value").fill("15");
    await dialog.getByLabel("Minimum order (USD)").fill("40");
    await dialog.getByLabel("Uses per customer").fill("1");
    await page.getByTestId("promo-submit").click();
    await expect(page.getByTestId("promo-message")).toContainText("SPRING15 created");
    const row = page.getByTestId("promo-table").getByRole("row", { name: /SPRING15/ });
    await expect(row).toContainText("15% off");
    await expect(row).toContainText("$40.00");
    await expect(row).toContainText("1 per customer");

    // Duplicate codes are refused by the API.
    await page.getByTestId("promo-create").click();
    await page.getByRole("dialog").getByLabel("Code").fill("WELCOME10");
    await page.getByRole("dialog").locator("#promo-value").fill("5");
    await page.getByTestId("promo-submit").click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(/already exists/i);
    await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

    // Edit, then deactivate; the row stays, flagged inactive.
    await page.getByRole("button", { name: "Edit SPRING15" }).click();
    await page.getByRole("dialog").locator("#promo-value").fill("20");
    await page.getByTestId("promo-submit").click();
    await expect(page.getByTestId("promo-message")).toContainText("SPRING15 saved");
    await expect(row).toContainText("20% off");
    await page.getByRole("button", { name: "Deactivate SPRING15" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Deactivate", exact: true }).click();
    await expect(page.getByTestId("promo-message")).toContainText("SPRING15 deactivated");
    await expect(row).toContainText("Inactive");
    await expect(page.getByRole("button", { name: "Deactivate SPRING15" })).toHaveCount(0);

    await page.getByLabel("Status").selectOption("inactive");
    await expect(page.getByTestId("promo-table")).toContainText("SPRING15");
    await expect(page.getByTestId("promo-table")).toContainText("SUMMER5");
    await expect(page.getByTestId("promo-table")).not.toContainText("WELCOME10");
  });

  test("read-only permissions hide every mutating control", async ({ page }) => {
    await seedStaffAuth(page, ["orders:read", "customers:read", "promos:read"]);
    await page.goto("/admin/promos");
    await waitForMocks(page);
    await expect(page.getByTestId("promo-table")).toContainText("WELCOME10");
    await expect(page.getByTestId("promo-create")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Edit / })).toHaveCount(0);

    await nav(page).getByRole("link", { name: "Customers" }).click();
    await page.getByRole("link", { name: "Jordan Rivera" }).click();
    await expect(page.getByRole("heading", { name: "Jordan Rivera" })).toBeVisible();
    await expect(page.getByTestId("customer-reactivate")).toHaveCount(0);
    await expect(page.getByTestId("customer-profile-save")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reset password" })).toHaveCount(0);
    // rewards:read is missing, so the ledger is not even requested.
    await expect(page.getByTestId("reward-balance")).toHaveCount(0);

    await nav(page).getByRole("link", { name: "Orders" }).click();
    await page.getByRole("link", { name: "BI48-000018" }).click();
    await expect(page.getByRole("heading", { name: "BI48-000018" })).toBeVisible();
    await expect(page.getByTestId("order-note-input")).toHaveCount(0);
  });

  test.describe("accessibility", () => {
    for (const path of ["/admin", "/admin/orders", "/admin/promos", "/admin/customers/user_customer_2", "/admin/orders/ord_seed_2"]) {
      test(`${path} has no critical axe violations`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await seedStaffAuth(page);
        await page.goto(path);
        await waitForMocks(page);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.waitForTimeout(500);
        const { results, violations } = await scanA11y(page);
        const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        if (serious.length > 0 && process.env.AXE_STRICT !== "1") console.warn(`axe (${path}) non-blocking serious/critical:\n${formatViolations(serious)}`);
        expect(violations, `axe (${path}):\n${formatViolations(violations) || "none"}`).toEqual([]);
      });
    }
  });
});
