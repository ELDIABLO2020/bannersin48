import type { Page } from "@playwright/test";

/**
 * Artwork endpoints are account-only in V1. Seed the demo account (from
 * packages/api-client/src/mocks/fixtures.ts) into localStorage before
 * navigation so builder/artwork flows work under MSW.
 *
 * Must be called before `page.goto(...)`.
 */
export function seedDemoAuth(page: Page): void {
  void page.addInitScript(() => {
    const user = {
      id: "user_demo",
      email: "demo@bannersin48.com",
      fullName: "Demo Customer",
      taxExempt: false,
      taxExemptApproved: false,
      rewardsPoints: 120,
      savedAddresses: [],
      createdAt: "2026-08-29T00:00:00.000Z",
    };
    window.localStorage.setItem("bi48.token", "mock-token-user_demo");
    window.localStorage.setItem(
      "bi48.auth",
      JSON.stringify({ state: { user, token: "mock-token-user_demo" }, version: 0 }),
    );
  });
}
