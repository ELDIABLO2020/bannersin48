import { defineConfig, devices } from "@playwright/test";

/**
 * Wave 11 audit config — runs ONLY the console/network error assertion spec
 * against an already-running production server (started by scripts/audit-ci.sh).
 * No webServer here: the orchestrator owns the server lifecycle.
 */
const BASE_URL = process.env.AUDIT_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /console-errors\.spec\.ts/,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "audit-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
});
