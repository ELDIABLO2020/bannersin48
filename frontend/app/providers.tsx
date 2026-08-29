"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { startMocks } from "@/lib/mocks/init";

// Real APIs are the default in local development. Opt into MSW explicitly
// for isolated frontend/E2E work with NEXT_PUBLIC_ENABLE_MOCKS=1.
const USE_MOCKS = process.env.NEXT_PUBLIC_ENABLE_MOCKS === "1";

export function Providers({ children }: { children: React.ReactNode }) {
  const [mockState, setMockState] = useState<"starting" | "ready" | "error">(
    USE_MOCKS ? "starting" : "ready",
  );
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 2,
          },
        },
      }),
  );

  useEffect(() => {
    if (!USE_MOCKS) return;
    let active = true;
    void startMocks().then((ok) => {
      if (!active) return;
      setMockState(ok ? "ready" : "error");
    });
    return () => {
      active = false;
    };
  }, []);

  if (mockState === "starting") {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-md" role="status">
        <p className="text-body-sm text-ink-muted">Starting local test services…</p>
      </div>
    );
  }

  if (mockState === "error") {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-md" role="alert">
        <p className="text-body text-ink">Local test services could not start. Reload to retry.</p>
      </div>
    );
  }

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
