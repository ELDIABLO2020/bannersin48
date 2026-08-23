"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { startMocks } from "@/lib/mocks/init";

// Real APIs are the default in local development. Opt into MSW explicitly
// for isolated frontend/E2E work with NEXT_PUBLIC_ENABLE_MOCKS=1.
const USE_MOCKS = process.env.NEXT_PUBLIC_ENABLE_MOCKS === "1";

export function Providers({ children }: { children: React.ReactNode }) {
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
    startMocks().then((ok) => {
      if (!active || !ok) return;
      void queryClient.invalidateQueries();
    });
    return () => {
      active = false;
    };
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
