import Link from "next/link";
import type { RewardLedgerEntry, RewardReason } from "@bannersin48/api-client";
import { formatUsd } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const REASON_LABEL: Record<RewardReason, string> = {
  ORDER_EARN: "Earned on an order",
  ADJUSTMENT: "Adjustment by our team",
  REDEMPTION: "Applied to an order",
};

/** The customer's reward ledger, newest first. Amounts are cents on the wire. */
export function RewardLedgerTable({ entries }: { entries: RewardLedgerEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface p-xl">
        <p className="text-body text-ink">No reward activity yet. Credit appears here once payment on your first order is confirmed.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full text-body-sm" data-testid="reward-ledger">
        <thead>
          <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-ink-muted">
            <th scope="col" className="px-md py-sm">Date</th>
            <th scope="col" className="px-md py-sm">Activity</th>
            <th scope="col" className="px-md py-sm">Order</th>
            <th scope="col" className="px-md py-sm text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="px-md py-sm whitespace-nowrap text-ink">{new Date(entry.createdAt).toLocaleDateString()}</td>
              <td className="px-md py-sm text-ink">{REASON_LABEL[entry.reason] ?? entry.reason}</td>
              <td className="px-md py-sm">
                {entry.orderId && entry.orderNumber ? (
                  <Link href={`/orders/${entry.orderId}`} className="text-link">
                    {entry.orderNumber}
                  </Link>
                ) : (
                  <span className="text-ink-muted">—</span>
                )}
              </td>
              <td className={cn("px-md py-sm text-right font-bold tabular-nums", entry.deltaCents < 0 ? "text-ink-muted" : "text-ink")}>
                {entry.deltaCents < 0 ? "−" : "+"}
                {formatUsd(Math.abs(entry.deltaCents) / 100)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
