"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";
import { formatUsd } from "@/lib/utils/format";
import { OrderList } from "@/components/orders/OrderList";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";

/** Overview (plan §4.3): who you are, your balance, the last three orders and quick links. */
export default function AccountOverviewPage() {
  const user = useAuth((s) => s.user)!;
  const profile = useQuery({ queryKey: ["account", "profile"], queryFn: () => getApiClient().getProfile() });
  const rewards = useQuery({ queryKey: ["account", "rewards", 1], queryFn: () => getApiClient().getRewards(1, 5) });
  const me = profile.data ?? user;
  const balance = rewards.data?.balanceCents ?? me.rewardsPoints;

  return (
    <div className="space-y-xl">
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <Card className="bg-surface" data-testid="account-identity">
          <h2 className="text-heading-h4 text-ink">{me.fullName}</h2>
          <p className="mt-xs text-body-sm text-ink-muted break-words">{me.email}</p>
          <div className="mt-sm flex flex-wrap items-center gap-xs">
            {me.emailVerifiedAt ? (
              <Badge variant="success">Email verified</Badge>
            ) : (
              <Badge variant="warning">Email not verified</Badge>
            )}
            {me.pendingEmail && <Badge variant="info">Change pending: {me.pendingEmail}</Badge>}
          </div>
          <Link href="/account/profile" className="mt-md inline-block text-body-sm font-bold text-link">
            Edit profile
          </Link>
        </Card>
        <Card className="bg-surface" data-testid="account-rewards-summary">
          <h2 className="text-heading-h4 text-ink">Reward balance</h2>
          <p className="mt-xs font-display text-[clamp(28px,4vw,36px)] leading-none text-ink tabular-nums">{formatUsd(balance / 100)}</p>
          <p className="mt-sm text-body-sm text-ink-muted">$1 of credit for every $100 you spend, credited when payment is confirmed.</p>
          <Link href="/account/rewards" className="mt-md inline-block text-body-sm font-bold text-link">
            See the ledger
          </Link>
        </Card>
      </div>

      <section>
        <div className="mb-md flex items-end justify-between gap-md">
          <SectionHeading level="sub" title="Recent orders" />
          <Link href="/account/orders" className="text-body-sm font-bold text-link font-body">
            See all orders
          </Link>
        </div>
        <OrderList limit={3} />
      </section>

      <section>
        <SectionHeading level="sub" title="Quick links" className="mb-md" />
        <ul className="grid grid-cols-1 gap-sm sm:grid-cols-3">
          {[
            { href: "/account/designs", label: "Saved designs", detail: "Order a kept configuration again." },
            { href: "/account/artwork", label: "Artwork library", detail: "Files ready to pick in the builder." },
            { href: "/account/security", label: "Security", detail: "Password and signed-in devices." },
          ].map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="block rounded-card border border-line bg-surface p-md no-underline hover:border-link">
                <span className="block font-bold text-body text-ink">{link.label}</span>
                <span className="mt-xs block text-body-sm text-ink-muted">{link.detail}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
