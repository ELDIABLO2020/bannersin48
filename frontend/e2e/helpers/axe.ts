import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

/**
 * Shared axe helper for the Wave 11 accessibility gate.
 *
 * Impact gating is two-tier so the PR suite stays green while the release bar
 * remains strict:
 *
 * - default (`npm run e2e`): only CRITICAL violations fail the test; serious
 *   findings are logged as warnings for triage.
 * - `AXE_STRICT=1` (release gate): serious AND critical violations fail.
 */

export type AxeImpact = "critical" | "serious" | "moderate" | "minor";

export interface AxeScanOptions {
  /** Additional rules to disable for a specific route/state. */
  disableRules?: string[];
  /** Explicit gate impacts. Overrides the AXE_STRICT-derived default. */
  failOnImpact?: AxeImpact[];
}

export const SERIOUS_PLUS: AxeImpact[] = ["critical", "serious"];

function defaultGateImpacts(): AxeImpact[] {
  return process.env.AXE_STRICT === "1" ? ["critical", "serious"] : ["critical"];
}

/** Run a WCAG A/AA axe scan; returns gate-relevant violations + the full result. */
export async function scanA11y(page: Page, options: AxeScanOptions = {}) {
  const { disableRules = [], failOnImpact = defaultGateImpacts() } = options;
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  if (disableRules.length > 0) builder = builder.disableRules(disableRules);
  const results = await builder.analyze();
  const violations = results.violations.filter((v) => failOnImpact.includes(v.impact as AxeImpact));
  return { results, violations };
}

/** Compact, human-readable rendering of an axe violation list for assertion diffs. */
export function formatViolations(
  violations: Array<{ id: string; impact?: string | null; nodes: unknown[]; description: string }>,
): string {
  return violations
    .map(
      (v) =>
        `- [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node${v.nodes.length === 1 ? "" : "s"})`,
    )
    .join("\n");
}
