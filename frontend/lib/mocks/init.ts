"use client";

/**
 * Lazy-starts the MSW mock worker in the browser during development.
 * In production, this is a no-op (and the file is not bundled).
 */
export async function startMocks(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_ENABLE_MOCKS) {
    return false;
  }
  try {
    const { startMockWorker } = await import("@bannersin48/api-client/mocks/browser");
    await startMockWorker();
    return true;
  } catch (err) {
    console.warn("[mocks] failed to start MSW worker", err);
    return false;
  }
}
