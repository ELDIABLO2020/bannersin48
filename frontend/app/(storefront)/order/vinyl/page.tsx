"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

export default function VinylRedirect() {
  return (
    <Suspense fallback={null}>
      <Redirector />
    </Suspense>
  );
}

function Redirector() {
  const router = useRouter();
  const search = useSearchParams();
  useEffect(() => {
    const qs = search.toString();
    router.replace(`/order/hd-banner${qs ? `?${qs}` : ""}`);
  }, [router, search]);
  return null;
}
