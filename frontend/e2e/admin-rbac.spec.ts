import { test, expect, type Page } from "@playwright/test";
import { seedStaffAuth, setMockPermissions } from "./helpers/auth";
import { formatViolations, scanA11y } from "./helpers/axe";

/**
 * Phase 2 RBAC admin (docs/accounts-admin-rbac-plan.md §12 task 2.6):
 * permission-driven navigation, the 403 → revalidate → "access changed"
 * path, and the staff-management flow (temporary password → first-login
 * password change → role assignment → suspend) against the MSW backend.
 */

async function waitForMocks(page: Page) {
  await page.waitForFunction(
    () => (window as unknown as { __BI48_MOCKS_READY__?: boolean }).__BI48_MOCKS_READY__ === true,
    null,
    { timeout: 20_000 },
  );
}

const nav = (page: Page) => page.getByRole("navigation", { name: "Admin" });

test.describe("admin RBAC", () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Desktop nav; the mobile drawer is covered in accessibility.spec.ts");
  });

  test("navigation shows only the sections the signed-in user may see", async ({ page }) => {
    await seedStaffAuth(page, ["orders:read", "users:read"]);
    await page.goto("/admin");
    await waitForMocks(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(nav(page).getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(nav(page).getByRole("link", { name: "Orders" })).toBeVisible();
    await expect(nav(page).getByRole("link", { name: "Staff" })).toBeVisible();
    for (const hidden of ["Roles", "Audit log", "Pricing", "Promo codes", "Content", "Customers"]) {
      await expect(nav(page).getByRole("link", { name: hidden })).toHaveCount(0);
    }
    // Typing a URL for a hidden section lands on the access card, never on data.
    await page.goto("/admin/roles");
    await expect(page.getByText(/don.t have access to this section/i)).toBeVisible();
  });

  test("the first visible section becomes the landing route", async ({ page }) => {
    await seedStaffAuth(page, ["audit:read"]);
    await page.goto("/admin");
    await waitForMocks(page);
    await expect(page).toHaveURL(/\/admin\/audit$/);
    await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
    await expect(nav(page).getByRole("link")).toHaveCount(1);
  });

  test("a 403 from the API revalidates the session and announces the change", async ({ page }) => {
    await seedStaffAuth(page);
    await page.goto("/admin/staff");
    await waitForMocks(page);
    await expect(page.getByTestId("staff-table")).toBeVisible();

    // Access shrinks server-side while the shell still believes it is an admin.
    // (The audit section is not cached by the staff page, so its query really hits the API.)
    await setMockPermissions(page, "user_admin", ["orders:read"]);
    await nav(page).getByRole("link", { name: "Audit log" }).click();

    await expect(page.getByText(/your access has changed/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/don.t have access to this section/i)).toBeVisible();
    await expect(nav(page).getByRole("link", { name: "Audit log" })).toHaveCount(0);
    await expect(nav(page).getByRole("link", { name: "Staff" })).toHaveCount(0);
    await expect(nav(page).getByRole("link", { name: "Dashboard" })).toBeVisible();
  });

  test("staff management: temporary password, first-login change, role assignment, suspend", async ({ page }) => {
    test.slow();
    const email = `nia.hire+${Date.now()}@bannersin48.local`;
    const tempPassword = "Welcome-to-the-team-2026";

    await seedStaffAuth(page);
    await page.goto("/admin/staff");
    await waitForMocks(page);
    await expect(page.getByTestId("staff-table")).toContainText("Pat Picker");

    // 1. Add an employee with a temporary password; it is shown exactly once.
    await page.getByTestId("staff-add").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("First name").fill("Nia");
    await dialog.getByLabel("Last name").fill("Hire");
    await dialog.getByLabel("Work email").fill(email);
    await dialog.getByLabel("Role").selectOption({ label: "Fulfillment" });
    await expect(dialog.getByRole("radio", { name: /send an invite email/i })).toBeDisabled();
    await dialog.getByLabel("Temporary password", { exact: true }).fill(tempPassword);
    await dialog.getByLabel("Repeat password").fill(tempPassword);
    await page.getByTestId("staff-create-submit").click();
    await expect(page.getByTestId("staff-created")).toBeVisible();
    await expect(page.getByTestId("staff-temp-password")).toHaveText(tempPassword);
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByTestId("staff-table")).toContainText("Nia Hire");
    await expect(page.getByTestId("staff-table")).toContainText("Temp password");

    // 2. The new employee signs in and is held at the password screen until they set their own.
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Staff sign-in" })).toBeVisible();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(tempPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/change-password\?next=%2Fadmin/);
    await expect(page.getByRole("heading", { name: "Set your own password" })).toBeVisible();
    // Short staff passwords are refused client-side; a proper one goes through.
    await page.getByLabel("Temporary password").fill(tempPassword);
    await page.getByLabel("New password", { exact: true }).fill("My-own-password-2026");
    await page.getByLabel("Confirm new password").fill("My-own-password-2026");
    await page.getByRole("button", { name: "Save new password" }).click();
    await page.getByTestId("change-password-continue").click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    // Fulfillment holds no users:read, so the Staff section is gone for them.
    await expect(nav(page).getByRole("link", { name: "Staff" })).toHaveCount(0);

    // 3. Back as admin: assign Support, then suspend with a reason.
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.getByLabel("Email").fill("admin@bannersin48.local");
    await page.getByLabel("Password").fill("admin1234");
    await page.getByRole("button", { name: "Sign in" }).click();
    await nav(page).getByRole("link", { name: "Staff" }).click();
    await page.getByRole("link", { name: "Nia Hire" }).click();
    await expect(page.getByRole("heading", { name: "Nia Hire" })).toBeVisible();
    await expect(page.getByText("Temporary password", { exact: true })).toHaveCount(0);

    await page.getByTestId("staff-role-select").selectOption({ label: "Support" });
    await page.getByTestId("staff-role-save").click();
    await page.getByRole("button", { name: "Change role" }).last().click();
    await expect(page.getByTestId("staff-message")).toContainText(/role updated/i);
    await expect(page.getByTestId("effective-permissions")).toContainText("Reset customer passwords");

    await page.getByTestId("staff-suspend").click();
    await page.getByTestId("status-reason").fill("Contract ended");
    await page.getByTestId("status-confirm").click();
    await expect(page.getByTestId("staff-message")).toContainText(/suspended/i);
    await expect(page.getByText(/Suspended .*Contract ended/)).toBeVisible();
    await expect(page.getByTestId("staff-reactivate")).toBeVisible();

    // 4. The audit log shows the role change as added/removed permissions.
    await nav(page).getByRole("link", { name: "Audit log" }).click();
    await expect(page.getByTestId("audit-table")).toContainText("rbac.user.role.assign");
    await expect(page.getByTestId("audit-permission-diff").first()).toBeVisible();
  });

  test("roles editor: system roles are locked, custom roles take a permission set", async ({ page }) => {
    await seedStaffAuth(page);
    await page.goto("/admin/roles");
    await waitForMocks(page);
    await expect(page.getByTestId("roles-table")).toContainText("Fulfillment");
    await page.getByRole("link", { name: "Admin", exact: true }).click();
    await expect(page.getByText(/holds every permission and cannot be edited/i)).toBeVisible();
    await expect(page.getByTestId("role-save-permissions")).toHaveCount(0);

    await page.goto("/admin/roles");
    await page.getByTestId("role-create").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("Night shift");
    await expect(dialog.getByLabel("Key")).toHaveValue("night_shift");
    await page.getByTestId("role-create-submit").click();
    await expect(page.getByRole("heading", { name: "Night shift" })).toBeVisible();
    await page.getByLabel(/View orders/).check();
    await page.getByLabel(/Attach tracking/).check();
    await page.getByTestId("role-save-permissions").click();
    await expect(page.getByTestId("role-message")).toContainText(/permissions saved/i);
    await page.getByTestId("role-delete").click();
    await page.getByRole("button", { name: "Delete role" }).last().click();
    await expect(page).toHaveURL(/\/admin\/roles$/);
    await expect(page.getByTestId("roles-table")).not.toContainText("Night shift");
  });

  test("accept-invite activates an invited account and signs in", async ({ page }) => {
    await page.goto("/accept-invite?token=mock-invite-token-user_invited");
    await waitForMocks(page);
    await page.getByLabel("Password", { exact: true }).fill("Editor-password-2026");
    await page.getByLabel("Confirm password").fill("Editor-password-2026");
    await page.getByRole("button", { name: "Activate account" }).click();
    // A content editor lands on the first section they can see.
    await expect(page).toHaveURL(/\/admin\/content$/);
    await expect(nav(page).getByRole("link", { name: "Content" })).toBeVisible();
    await expect(nav(page).getByRole("link", { name: "Staff" })).toHaveCount(0);
  });
});

/**
 * Phase 5 sweep: axe on every RBAC-era admin surface (staff, roles, audit,
 * pricing, content, first-login and invite pages), and a phone-width check
 * that the data-heavy admin pages never scroll the document horizontally.
 */
test.describe("admin RBAC surfaces: accessibility", () => {
  const PAGES: Array<{ path: string; label: string; ready: RegExp }> = [
    { path: "/admin/staff", label: "staff list", ready: /Staff/ },
    { path: "/admin/staff/user_staff", label: "staff detail", ready: /Pat Picker/ },
    { path: "/admin/roles", label: "roles list", ready: /Roles/ },
    { path: "/admin/roles/role_fulfillment", label: "role editor", ready: /Fulfillment/ },
    { path: "/admin/audit", label: "audit log", ready: /Audit log/ },
    { path: "/admin/pricing", label: "pricing", ready: /Products and rates/ },
    { path: "/admin/content", label: "content", ready: /Site content/ },
  ];

  for (const entry of PAGES) {
    test(`${entry.label} has no critical axe violations`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-chromium", "axe runs once on desktop");
      test.setTimeout(60_000);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await seedStaffAuth(page);
      await page.goto(entry.path);
      await waitForMocks(page);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(entry.ready, { timeout: 15_000 });
      await page.waitForTimeout(500);
      const { violations } = await scanA11y(page);
      expect(violations, `axe (${entry.label}):\n${formatViolations(violations) || "none"}`).toEqual([]);
    });
  }

  test("first-login password page and invite acceptance pass axe", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "axe runs once on desktop");
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedStaffAuth(page, ["orders:read"], "staff");
    await page.goto("/change-password?next=%2Fadmin");
    await waitForMocks(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    let scan = await scanA11y(page);
    expect(scan.violations, `axe (change-password):\n${formatViolations(scan.violations) || "none"}`).toEqual([]);

    await page.goto("/accept-invite?token=mock-invite-token-user_invited");
    await waitForMocks(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    scan = await scanA11y(page);
    expect(scan.violations, `axe (accept-invite):\n${formatViolations(scan.violations) || "none"}`).toEqual([]);
  });

  test("admin pages fit a phone without horizontal document scroll", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-webkit", "Phone viewport");
    test.slow();
    await seedStaffAuth(page);
    await page.goto("/admin");
    await waitForMocks(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    for (const path of ["/admin/orders", "/admin/customers", "/admin/promos", "/admin/staff", "/admin/staff/user_staff", "/admin/roles", "/admin/roles/role_fulfillment", "/admin/audit"]) {
      // Read-only pages, so a full load is fine: the init script re-seeds the session on every navigation.
      await page.goto(path);
      await waitForMocks(page);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      expect(overflow.scrollWidth, `${path} must not scroll horizontally on a phone`).toBeLessThanOrEqual(overflow.clientWidth + 1);
    }
  });
});
