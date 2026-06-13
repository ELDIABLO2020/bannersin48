/**
 * MSW browser setup. Imported only by client-side code during dev/E2E.
 */
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

export async function startMockWorker(): Promise<void> {
  if (typeof window === "undefined") return;
  await worker.start({
    onUnhandledRequest: "bypass",
    serviceWorker: { url: "/mockServiceWorker.js" },
  });
}
