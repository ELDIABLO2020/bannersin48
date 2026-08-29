"use client";

let workerStart: Promise<boolean> | null = null;

/**
 * Start MSW once and share readiness across Strict Mode effect replays.
 * Querying children must not render until this promise resolves.
 */
export function startMocks(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (process.env.NEXT_PUBLIC_ENABLE_MOCKS !== "1") return Promise.resolve(false);
  if ((window as unknown as { __BI48_MOCKS_READY__?: boolean }).__BI48_MOCKS_READY__) {
    return Promise.resolve(true);
  }
  if (workerStart) return workerStart;

  workerStart = import("@bannersin48/api-client/mocks/browser")
    .then(async ({ startMockWorker }) => {
      await startMockWorker();
      (window as unknown as { __BI48_MOCKS_READY__?: boolean }).__BI48_MOCKS_READY__ = true;
      return true;
    })
    .catch((error: unknown) => {
      console.error("[mocks] failed to start MSW worker", error);
      workerStart = null;
      return false;
    });

  return workerStart;
}
