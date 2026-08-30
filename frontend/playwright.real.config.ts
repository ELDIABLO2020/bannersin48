import { defineConfig, devices } from "@playwright/test";

/**
 * Wave 11 release E2E — runs the canonical customer scenarios against the
 * REAL Nest + Postgres/Redis backend (no MSW). The orchestrator
 * (scripts/e2e-real.sh) owns the full service lifecycle; this config only
 * drives the browser against the already-running frontend/backend.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e-real",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  // The canonical journey mutates shared backend state, so run serially.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "real-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
});
