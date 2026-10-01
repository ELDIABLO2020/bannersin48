/**
 * Feature switches for surfaces that depend on infrastructure the backend
 * does not have yet (docs/accounts-admin-rbac-plan.md §4.2, §11).
 *
 * `EmailService` only logs until a real transport exists (backend-plan item
 * 15), so anything that needs an emailed link stays hidden: staff invites
 * (phase 2) and the customer's "change email" / "verify email" actions
 * (phase 3). The API endpoints exist and are tested; flipping this exposes
 * the UI without further code changes.
 */
export const EMAIL_TRANSPORT_CONFIGURED = false;
