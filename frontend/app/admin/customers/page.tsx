"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 25;
const ROLES = ["CUSTOMER", "STAFF", "CONTENT_EDITOR", "ADMIN"] as const;

export default function AdminCustomersPage() {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<string>("");
  const customers = useQuery({
    queryKey: ["admin", "customers", search, page],
    queryFn: () => getAdminApiClient().customers({ search: search || undefined, page }),
  });

  const total = customers.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visibleItems = useMemo(() => {
    const items = customers.data?.items ?? [];
    return role ? items.filter((c) => c.role === role) : items;
  }, [customers.data?.items, role]);

  return (
    <div className="space-y-xl">
      <div>
        <p className="text-body-sm text-ink-muted">Customer management</p>
        <h1 className="font-display text-section-h2 text-ink">Customers</h1>
      </div>

      <Card className="bg-surface p-lg">
        <form
          className="flex flex-col sm:flex-row gap-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(draft.trim());
          }}
        >
          <label className="block flex-1" htmlFor="customer-search">
            <span className="text-body-sm text-ink-muted block mb-xs">Search customers</span>
            <Input
              id="customer-search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Email or name"
              type="search"
            />
          </label>
          <label className="block sm:w-56" htmlFor="customer-role">
            <span className="text-body-sm text-ink-muted block mb-xs">Filter by role</span>
            <select
              id="customer-role"
              className="w-full h-10 rounded-btn border border-line-input px-md bg-surface text-ink text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.replace("_", " ")}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button type="submit" variant="secondary">Search</Button>
          </div>
        </form>
      </Card>

      <Card className="bg-surface p-lg overflow-x-auto">
        {customers.isLoading ? (
          <p className="text-ink-muted py-xl" role="status">Loading customers…</p>
        ) : customers.isError ? (
          <p className="text-danger py-xl" role="alert">{(customers.error as Error).message}</p>
        ) : visibleItems.length === 0 ? (
          <div className="py-xl text-center">
            <p className="text-ink-muted">No customers found.</p>
            <p className="text-body-sm text-ink-muted mt-xs">
              {search || role ? "Try clearing your search or role filter." : "Customers appear here after they register."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-body-sm text-ink-muted mb-md" aria-live="polite">
              {role ? `${visibleItems.length} on this page match · ` : ""}{total} customers total
            </p>
            <table className="w-full text-body-sm">
              <caption className="sr-only">Customers, page {page} of {totalPages}</caption>
              <thead>
                <tr className="text-left text-ink-muted border-b border-line-subtle">
                  <th scope="col" className="py-sm font-bold">Customer</th>
                  <th scope="col" className="font-bold">Role</th>
                  <th scope="col" className="font-bold">Orders</th>
                  <th scope="col" className="font-bold">Rewards</th>
                  <th scope="col" className="font-bold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((customer) => (
                  <tr key={customer.id} className="border-b border-line-subtle last:border-0">
                    <td className="py-md">
                      <Link href={`/admin/customers/${customer.id}`} className="font-bold text-link no-underline hover:underline">
                        {customer.fullName || customer.email}
                      </Link>
                      <p className="text-xs text-ink-muted">{customer.email}</p>
                    </td>
                    <td><Badge variant={customer.role === "CUSTOMER" ? "neutral" : "info"}>{customer.role.replace("_", " ")}</Badge></td>
                    <td className="text-ink tabular-nums">{customer.orderCount}</td>
                    <td className="text-ink tabular-nums">{customer.rewardsPoints}</td>
                    <td className="text-ink-muted">{new Date(customer.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between gap-md mt-md">
              <span className="text-body-sm text-ink-muted">Page {page} of {totalPages}</span>
              <div className="flex gap-sm">
                <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <Button type="button" variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
