"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { startMocks } from "@/lib/mocks/init";

export function Providers({ children }: { children: React.ReactNode }) {
  const [mocksReady, setMocksReady] = useState(false);

  useEffect(() => {
    let active = true;
    startMocks().then((ok) => {
      if (active) setMocksReady(ok);
    });
    return () => {
      active = false;
    };
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Don't fire until mocks are ready (or production / non-mock mode)
            enabled: mocksReady || process.env.NODE_ENV === "production",
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
