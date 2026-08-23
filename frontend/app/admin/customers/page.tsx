"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminCustomersPage() {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const customers = useQuery({ queryKey: ["admin", "customers", search], queryFn: () => getAdminApiClient().customers({ search: search || undefined }) });
  return <div className="space-y-xl">
    <div><p className="text-body-sm text-ink-muted">Customer management</p><h1 className="font-display text-section-h2 text-ink">Customers</h1></div>
    <Card className="bg-surface p-lg"><form className="flex gap-sm" onSubmit={(e) => { e.preventDefault(); setSearch(draft.trim()); }}><Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search email or name" /><Button type="submit" variant="secondary">Search</Button></form></Card>
    <Card className="bg-surface p-lg overflow-x-auto">
      {customers.isLoading ? <p className="text-ink-muted">Loading customers…</p> : customers.isError ? <p className="text-danger">{(customers.error as Error).message}</p> : <><p className="text-body-sm text-ink-muted mb-md">{customers.data?.total ?? 0} customers</p><table className="w-full text-body-sm"><thead><tr className="text-left text-ink-muted border-b border-line-subtle"><th className="py-sm">Customer</th><th>Role</th><th>Orders</th><th>Rewards</th><th>Joined</th></tr></thead><tbody>{customers.data?.items.map((customer) => <tr key={customer.id} className="border-b border-line-subtle last:border-0"><td className="py-md"><Link href={`/admin/customers/${customer.id}`} className="font-bold text-link no-underline hover:underline">{customer.fullName || customer.email}</Link><p className="text-xs text-ink-muted">{customer.email}</p></td><td><Badge variant={customer.role === "CUSTOMER" ? "neutral" : "info"}>{customer.role}</Badge></td><td className="text-ink tabular-nums">{customer.orderCount}</td><td className="text-ink tabular-nums">{customer.rewardsPoints}</td><td className="text-ink-muted">{new Date(customer.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></>}
    </Card>
  </div>;
}
