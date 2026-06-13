"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";
import { useCart } from "@/lib/stores/cart";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@bannersin48/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/utils/format";
import { Package, Upload, PenTool, LayoutGrid, ShoppingBag, User as UserIcon, LogOut } from "lucide-react";

const STATUS_TONE: Record<OrderStatus, "info" | "success" | "warning" | "error" | "neutral"> = {
  AWAITING_PAYMENT: "warning",
  AWAITING_PROOF_APPROVAL: "info",
  CANCELLATION_WINDOW: "warning",
  READY_FOR_TRANSFER: "info",
  TRANSFERRED_TO_PRODUCTION: "info",
  IN_PRODUCTION: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  EXCEPTION: "error",
  CANCELLED: "error",
  REFUNDED: "error",
};

const QUICK_ACTIONS = [
  { href: "/order/vinyl", icon: Package, label: "New vinyl banner", soon: false },
  { href: "/order/retractable", icon: Package, label: "New retractable", soon: false },
  { href: "/order/artwork", icon: Upload, label: "Upload artwork", soon: false },
  { href: "/design", icon: PenTool, label: "Design online", soon: true },
  { href: "/templates", icon: LayoutGrid, label: "Templates", soon: true },
];

export default function DashboardPage() {
  const auth = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const loadFromOrder = useCart((s) => s.loadFromOrder);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => getApiClient().listOrders(),
    enabled: !!auth.user,
  });

  const reorder = useMutation({
    mutationFn: (id: string) => getApiClient().reorder(id),
    onSuccess: (res) => {
      loadFromOrder(res.order);
      router.push("/cart");
    },
  });

  if (!auth.user) {
    return (
      <div className="bg-surface-tint min-h-[60vh] flex items-center justify-center px-md">
        <Card className="bg-surface max-w-md w-full text-center p-3xl">
          <UserIcon className="h-10 w-10 text-link mx-auto mb-md" aria-hidden />
          <h1 className="font-display text-section-h2 text-ink leading-tight">Sign in to view your dashboard</h1>
          <p className="text-body-sm text-ink-muted mt-md">Saved artwork, reorders, FedEx tracking, and rewards live here.</p>
          <div className="flex gap-sm mt-xl">
            <Link href="/login" className="flex-1">
              <Button variant="cta" size="block" className="w-full">Log in</Button>
            </Link>
            <Link href="/register" className="flex-1">
              <Button variant="secondary" size="block" className="w-full">Create account</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-xl">
        {/* Profile header */}
        <Card className="bg-surface mb-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
            <div>
              <p className="text-body-sm text-ink-muted">Welcome back</p>
              <h1 className="font-display text-section-h2 text-ink leading-tight">
                {auth.user.fullName}
              </h1>
              <p className="text-body-sm text-ink-muted mt-xs">
                {auth.user.email} · <strong className="text-link">{auth.user.rewardsPoints} reward points</strong>
              </p>
            </div>
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                auth.clear();
                router.push("/");
              }}
            >
              <LogOut className="h-4 w-4 mr-sm" aria-hidden />
              Log out
            </Button>
          </div>
        </Card>

        {/* Quick actions */}
        <h2 className="font-bold text-heading-h4 text-ink mb-md">Quick actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-sm mb-xl">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            const content = (
              <Card className="bg-surface h-full hover:bg-info-tint transition-colors">
                <Icon className="h-6 w-6 text-link" aria-hidden />
                <p className="font-bold text-sm text-ink mt-sm">{a.label}</p>
                {a.soon && <Badge variant="warning" className="mt-xs">Soon</Badge>}
              </Card>
            );
            if (a.soon) {
              return <div key={a.href}>{content}</div>;
            }
            return (
              <Link key={a.href} href={a.href} className="no-underline">
                {content}
              </Link>
            );
          })}
        </div>

        {/* Recent orders */}
        <div className="flex items-center justify-between mb-md">
          <h2 className="font-bold text-heading-h4 text-ink">Recent orders</h2>
          {orders && orders.length > 0 && (
            <Link href="/orders" className="text-link text-body-sm">View all</Link>
          )}
        </div>
        {isLoading ? (
          <Card className="bg-surface animate-pulse-slow h-32" />
        ) : !orders || orders.length === 0 ? (
          <Card className="bg-surface text-center p-2xl">
            <ShoppingBag className="h-8 w-8 text-ink-muted mx-auto mb-sm" aria-hidden />
            <p className="text-ink-muted">No orders yet.</p>
            <Link href="/order/vinyl">
              <Button variant="cta" size="md" className="mt-md">Order your first banner</Button>
            </Link>
          </Card>
        ) : (
          <ul className="space-y-sm">
            {orders.slice(0, 5).map((o) => (
              <li key={o.id}>
                <Card className="bg-surface">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
                    <div>
                      <p className="text-body-sm text-ink-muted">Order {o.orderNumber}</p>
                      <p className="font-bold text-ink mt-xs">
                        {o.firstLineLabel} <span className="text-ink-muted font-normal">× {o.firstLineQty}</span>
                      </p>
                      <p className="text-body-sm text-ink-muted mt-xs">
                        Placed {new Date(o.createdAt).toLocaleDateString()} · Delivery {o.guaranteedDeliveryDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-md">
                      <Badge variant={STATUS_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                      <span className="text-heading-h4 font-bold text-ink tabular-nums">{o.totalLabel}</span>
                    </div>
                    <div className="flex gap-sm">
                      <Link href={`/orders/${o.id}`}>
                        <Button variant="secondary" size="sm">View</Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => reorder.mutate(o.id)}
                        disabled={reorder.isPending}
                      >
                        Reorder
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {/* Saved designs shell */}
        <div className="mt-2xl">
          <h2 className="font-bold text-heading-h4 text-ink mb-md">Saved artwork &amp; designs</h2>
          <Card className="bg-surface text-center p-2xl">
            <Badge variant="warning" className="mb-sm">Coming soon</Badge>
            <p className="text-body-sm text-ink-muted">
              Your uploaded artwork and saved designs will appear here once artwork storage ships (Phase 1.5).
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
