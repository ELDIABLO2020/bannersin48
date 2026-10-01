"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { formatUsd } from "@/lib/utils/format";
import { Card } from "@/components/ui/card";
import { RewardLedgerTable } from "@/components/account/RewardLedgerTable";

const PAGE_SIZE = 25;

export default function AccountRewardsPage() {
  const [page, setPage] = useState(1);
  const rewards = useQuery({ queryKey: ["account", "rewards", page], queryFn: () => getApiClient().getRewards(page, PAGE_SIZE) });

  if (rewards.isLoading) return <p className="text-ink-muted" role="status">Loading rewards…</p>;
  if (rewards.isError || !rewards.data) return <p className="text-danger" role="alert">{(rewards.error as Error | undefined)?.message ?? "Rewards are unavailable right now."}</p>;
  const data = rewards.data;
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="space-y-lg">
      <Card className="bg-surface">
        <h2 className="text-heading-h4 text-ink">Balance</h2>
        <p className="mt-xs font-display text-[clamp(28px,4vw,36px)] leading-none text-ink tabular-nums" data-testid="rewards-balance">
          {formatUsd(data.balanceCents / 100)}
        </p>
        <p className="mt-sm max-w-[60ch] text-body-sm text-ink-muted">
          You earn $1 of credit for every $100 you spend. Credit is added when we confirm payment on an order and is applied by our team when you ask us to use it.
        </p>
      </Card>

      <section>
        <h2 className="mb-md text-heading-h4 text-ink">History</h2>
        <RewardLedgerTable entries={data.ledger} />
        {pages > 1 && (
          <nav aria-label="Ledger pages" className="mt-md flex items-center justify-between text-body-sm text-ink-muted">
            <button type="button" className="text-link disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {data.page} of {pages}
            </span>
            <button type="button" className="text-link disabled:opacity-50" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </nav>
        )}
      </section>
    </div>
  );
}
