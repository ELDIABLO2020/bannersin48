import type { Page } from "@playwright/test";

/**
 * Artwork endpoints are account-only in V1. Seed the demo account (from
 * packages/api-client/src/mocks/fixtures.ts) into localStorage before
 * navigation so builder/artwork flows work under MSW.
 *
 * Must be called before `page.goto(...)`. Await it (or reload after the first
 * navigation): registering the init script races the first navigation otherwise.
 */
export async function seedDemoAuth(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const user = {
      id: "user_demo",
      email: "demo@bannersin48.com",
      fullName: "Demo Customer",
      taxExempt: false,
      taxExemptApproved: false,
      rewardsPoints: 120,
      savedAddresses: [],
      role: "CUSTOMER",
      roleKey: "customer",
      permissions: [],
      mustChangePassword: false,
      createdAt: "2026-08-29T00:00:00.000Z",
    };
    window.localStorage.setItem("bi48.token", "mock-token-user_demo");
    window.localStorage.setItem(
      "bi48.auth",
      JSON.stringify({ state: { user, token: "mock-token-user_demo" }, version: 0 }),
    );
  });
}

/** The two staff fixtures the MSW backend knows (packages/api-client/src/mocks/fixtures.ts). */
const STAFF_FIXTURES = {
  admin: { id: "user_admin", email: "admin@bannersin48.local", fullName: "Site Admin", role: "ADMIN", roleKey: "admin" },
  staff: { id: "user_staff", email: "staff@bannersin48.local", fullName: "Pat Picker", role: "STAFF", roleKey: "fulfillment" },
} as const;

/**
 * Seed a staff session with the given effective permissions. `["*"]` is the
 * admin wildcard; pass a narrower list to exercise permission-gated navigation
 * and buttons. The same list is handed to the MSW backend through
 * `bi48.mock.permissions`, so `/auth/me` (session revalidation on mount) and
 * every `/admin/*` handler agree with what the shell was seeded with.
 *
 * Await it before `page.goto(...)`.
 */
export async function seedStaffAuth(page: Page, permissions: string[] = ["*"], who: keyof typeof STAFF_FIXTURES = "admin"): Promise<void> {
  const fixture = STAFF_FIXTURES[who];
  // Await it: registration races the first navigation otherwise.
  await page.addInitScript(
    ({ perms, fixture }: { perms: string[]; fixture: (typeof STAFF_FIXTURES)[keyof typeof STAFF_FIXTURES] }) => {
      const user = {
        ...fixture,
        taxExempt: false,
        taxExemptApproved: false,
        rewardsPoints: 0,
        savedAddresses: [],
        permissions: perms,
        mustChangePassword: false,
        createdAt: "2026-08-29T00:00:00.000Z",
      };
      window.localStorage.setItem("bi48.token", `mock-token-${fixture.id}`);
      window.localStorage.setItem("bi48.auth", JSON.stringify({ state: { user, token: `mock-token-${fixture.id}` }, version: 0 }));
      window.localStorage.setItem("bi48.mock.permissions", JSON.stringify({ [fixture.id]: perms }));
    },
    { perms: permissions, fixture },
  );
}

/**
 * Changes a mock user's live permissions server-side (MSW) without touching the
 * persisted session, so the next `/admin/*` call answers 403 and the shell has
 * to revalidate. Call after the page has loaded and the mock worker is ready.
 */
export async function setMockPermissions(page: Page, userId: string, permissions: string[]): Promise<void> {
  await page.evaluate(
    async ({ userId, permissions }) => {
      const res = await fetch("http://localhost:3001/__mock/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, permissions }),
      });
      if (!res.ok) throw new Error(`mock permissions update failed: ${res.status}`);
    },
    { userId, permissions },
  );
}
