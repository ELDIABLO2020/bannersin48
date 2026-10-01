"use client";

import { OrderList } from "@/components/orders/OrderList";

/** Full order history. `/orders/[id]` stays the canonical detail URL so emailed links keep working. */
export default function AccountOrdersPage() {
  return <OrderList />;
}
