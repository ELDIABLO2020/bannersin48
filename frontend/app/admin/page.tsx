"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { RequirePermission } from "./_components/require-permission";
import { bucketLabel } from "@/lib/admin/labels";

/** Staff landing page (plan §5.3): today's throughput, the SLA picture and every bucket, each linking into the board. */
export default function AdminDashboardPage() {
  return (
    <RequirePermission perm="orders:read">
      <Dashboard />
    </RequirePermission>
  );
}

function Dashboard() {
  const dashboard = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => getAdminApiClient().dashboard(), refetchInterval: 30_000 });
  const data = dashboard.data;

  return (
    <div className="space-y-xl">
      <PageHeader
        title="Dashboard"
        intro="What came in, what got paid and what shipped today, plus every order by stage."
        className="mb-0"
        actions={<Link href="/admin/orders" className="text-body-sm text-link no-underline hover:underline">Open the order board</Link>}
      />

      {dashboard.isError && <div role="alert" className="rounded-feature bg-badge-error-bg text-danger p-md text-body-sm">{(dashboard.error as Error).message}</div>}

      <section aria-labelledby="dashboard-today">
        <h2 id="dashboard-today" className="sr-only">Today</h2>
        <dl className="grid grid-cols-2 md:grid-cols-5 gap-md" data-testid="dashboard-stats">
          <Stat label="Open orders" value={data?.openOrders} hint="Not yet delivered or cancelled" />
          <Stat label="Placed today" value={data?.today.placed} />
          <Stat label="Paid today" value={data?.today.paid} />
          <Stat label="Shipped today" value={data?.today.shipped} />
          <Stat label="Past SLA" value={data?.slaBreachedCount} tone={data && data.slaBreachedCount > 0 ? "danger" : "default"} hint="Past the 48-business-hour promise" />
        </dl>
        {data && (
          <p className="text-xs text-ink-muted mt-sm">
            Counting since {new Date(data.today.since).toLocaleString()} · refreshed {new Date(data.updatedAt).toLocaleTimeString()}
          </p>
        )}
      </section>

      <section aria-labelledby="dashboard-buckets-heading">
        <h2 id="dashboard-buckets-heading" className="text-heading-h4 text-ink mb-md">Orders by stage</h2>
        {dashboard.isLoading ? (
          <p className="text-ink-muted" role="status">Loading…</p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-md list-none m-0 p-0" data-testid="dashboard-buckets">
            {(data?.buckets ?? []).map((bucket) => (
              <li key={bucket.status}>
                <Link href={`/admin/orders?status=${bucket.status}`} className="block no-underline h-full" aria-label={`${bucketLabel(bucket.status)}: ${bucket.count} orders`}>
                  <Card className="h-full bg-surface p-md border border-line-subtle hover:border-link">
                    <div className="flex items-start justify-between gap-sm">
                      <span className="font-bold text-ink">{bucketLabel(bucket.status)}</span>
                      <span className="font-display text-heading-h3 text-ink tabular-nums">{bucket.count}</span>
                    </div>
                    {bucket.slaBreachedCount > 0 && <p className="mt-sm text-xs font-bold text-danger">{bucket.slaBreachedCount} past SLA</p>}
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint, tone = "default" }: { label: string; value: number | undefined; hint?: string; tone?: "default" | "danger" }) {
  return (
    <Card className="bg-surface p-md">
      <dt className="text-body-sm text-ink-muted">{label}</dt>
      <dd className={`font-display text-heading-h2 tabular-nums mt-xs ${tone === "danger" ? "text-danger" : "text-ink"}`}>{value ?? "—"}</dd>
      {hint && <dd className="text-xs text-ink-muted mt-xs">{hint}</dd>}
    </Card>
  );
}
