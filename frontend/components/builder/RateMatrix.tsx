"use client";

import { MATERIAL_RATES, SHIPPING_FLAT_PER_UNIT_USD, type Material } from "@bannersin48/shared";
import { cn } from "@/lib/utils/cn";

const ROWS: { weight: string; single: Material; double: Material | null }[] = [
  { weight: "13 oz", single: "VINYL_13OZ_SINGLE", double: null },
  { weight: "15 oz", single: "VINYL_15OZ_SINGLE", double: null },
  { weight: "18 oz", single: "VINYL_18OZ_SINGLE", double: "VINYL_18OZ_DOUBLE" },
];

function rateFor(material: Material): number {
  return MATERIAL_RATES[material];
}

function Cell({
  value,
  active,
}: {
  value: number | null;
  active: boolean;
}) {
  if (value == null) {
    return <span className="tabular-nums text-ink-muted/40">—</span>;
  }
  return (
    <span
      className={cn(
        "tabular-nums",
        active ? "font-bold text-ink" : "text-ink-muted",
      )}
    >
      ${value.toFixed(2)}
    </span>
  );
}

export function RateMatrix({
  material,
  className,
  showShippingNote = false,
  title = "Pricing and shipping",
}: {
  material: Material;
  className?: string;
  showShippingNote?: boolean;
  title?: string;
}) {
  return (
    <div data-testid="rate-matrix" className={cn("text-[11px] text-ink-muted", className)}>
      <p className="font-bold text-ink uppercase tracking-wide text-[10px] mb-1.5 underline underline-offset-2 decoration-line">
        {title}
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-ink-muted">
            <th scope="col" className="pb-1 pr-2 text-left font-normal" />
            <th scope="col" className="pb-1 px-1 text-right font-normal">
              Single-sided
            </th>
            <th scope="col" className="pb-1 pl-1 text-right font-normal">
              Double-sided
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.weight}>
              <th scope="row" className="py-0.5 pr-2 text-left font-normal text-ink-muted">
                {row.weight}
              </th>
              <td className="py-0.5 px-1 text-right">
                <Cell value={rateFor(row.single)} active={material === row.single} />
              </td>
              <td className="py-0.5 pl-1 text-right">
                <Cell
                  value={row.double ? rateFor(row.double) : null}
                  active={row.double != null && material === row.double}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showShippingNote && (
        <p className="mt-1.5 text-[10px] text-ink-muted">
          Shipping ${SHIPPING_FLAT_PER_UNIT_USD.toFixed(0)} / banner
        </p>
      )}
    </div>
  );
}
