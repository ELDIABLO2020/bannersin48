"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { priceLine, type Quantity } from "@bannersin48/shared";
import { useConfigurator } from "@/lib/stores/configurator";
import { getApiClient } from "@/lib/api/client";

/** Shared optimistic + debounced API quote for stage header and PriceHero. */
export function useBuilderQuote() {
  const productId = useConfigurator((s) => s.productId);
  const material = useConfigurator((s) => s.material);
  const size = useConfigurator((s) => s.size);
  const finishing = useConfigurator((s) => s.finishing);
  const quantity = useConfigurator((s) => s.quantity);

  const optimistic = useMemo(
    () =>
      priceLine({
        productId,
        material,
        dimensions: size,
        finishing,
        quantity: Math.max(1, Math.min(10, quantity)) as Quantity,
      }),
    [productId, material, size, finishing, quantity],
  );

  const [debounced, setDebounced] = useState({ productId, material, size, finishing, quantity });
  useEffect(() => {
    const id = setTimeout(() => setDebounced({ productId, material, size, finishing, quantity }), 250);
    return () => clearTimeout(id);
  }, [productId, material, size, finishing, quantity]);

  const { data, isFetching } = useQuery({
    queryKey: ["quote", debounced],
    queryFn: () =>
      getApiClient().quote({
        productId: debounced.productId,
        material: debounced.material,
        dimensions: debounced.size,
        finishing: debounced.finishing,
        quantity: debounced.quantity,
      }),
    enabled: true,
  });

  const displayTotal = data?.total ?? optimistic.totalBeforeTax;
  const eligible = data?.eligible ?? optimistic.eligible;
  const billableSqFt = data?.lines[0]?.billableSqFt ?? optimistic.billableSqFt;
  const ineligibilityReason = data?.lines[0]?.ineligibilityReason ?? optimistic.ineligibilityReason;

  return {
    material,
    size,
    displayTotal,
    eligible,
    billableSqFt,
    isFetching,
    optimistic,
    data,
    ineligibilityReason,
  };
}
