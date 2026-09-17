"use client";

import { useAuth } from "@/lib/stores/auth";
import { OrderList } from "@/components/orders/OrderList";
import { SignInPrompt } from "@/components/account/SignInPrompt";
import { PageHeader } from "@/components/ui/page-header";

export default function OrdersListPage() {
  const user = useAuth((s) => s.user);

  if (!user) {
    return <SignInPrompt title="Log in to see your orders" next="/orders" />;
  }

  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-2xl">
        <PageHeader
          trail={[{ href: "/dashboard", label: "Account" }]}
          title="Your orders"
          intro="Track a delivery, open an order, or send the same banner to print again."
        />
        <OrderList />
      </div>
    </div>
  );
}
