"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { priceLine, type Quantity } from "@bannersin48/shared";
import { useConfigurator } from "@/lib/stores/configurator";
import { getApiClient } from "@/lib/api/client";

/** Shared optimistic + debounced API quote for stage header and PriceHero. */
export function useBuilderQuote() {
  const product = useConfigurator((s) => s.product);
  const material = useConfigurator((s) => s.material);
  const size = useConfigurator((s) => s.size);
  const finishing = useConfigurator((s) => s.finishing);
  const quantity = useConfigurator((s) => s.quantity);

  const optimistic = useMemo(
    () =>
      priceLine({
        material,
        dimensions: size,
        finishing,
        quantity: Math.max(1, Math.min(10, quantity)) as Quantity,
      }),
    [material, size, finishing, quantity],
  );

  const [debounced, setDebounced] = useState({ material, size, finishing, quantity });
  useEffect(() => {
    const id = setTimeout(() => setDebounced({ material, size, finishing, quantity }), 250);
    return () => clearTimeout(id);
  }, [material, size, finishing, quantity]);

  const { data, isFetching } = useQuery({
    queryKey: ["quote", debounced],
    queryFn: () =>
      getApiClient().quote({
        material: debounced.material,
        dimensions: debounced.size,
        finishing: debounced.finishing,
        quantity: debounced.quantity,
      }),
    enabled: !(product === "retractable" && debounced.size.widthFt === 0),
  });

  const displayTotal = data?.total ?? optimistic.totalBeforeTax;
  const eligible = data?.eligible ?? optimistic.eligible;
  const billableSqFt = data?.lines[0]?.billableSqFt ?? optimistic.billableSqFt;

  return {
    material,
    size,
    displayTotal,
    eligible,
    billableSqFt,
    isFetching,
    optimistic,
    data,
  };
}
