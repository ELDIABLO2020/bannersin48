"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const STAFF_ROLES = ["ADMIN", "STAFF", "CONTENT_EDITOR"];

const NAV = [
  { href: "/admin", label: "Order board", roles: ["ADMIN", "STAFF"] },
  { href: "/admin/pricing", label: "Pricing", roles: ["ADMIN", "STAFF"] },
  { href: "/admin/content", label: "Content", roles: ["ADMIN", "CONTENT_EDITOR"] },
  { href: "/admin/customers", label: "Customers", roles: ["ADMIN", "STAFF"] },
];

/**
 * Staff-gated admin shell. Auth is the same customer auth (JWT in
 * localStorage); routes are additionally enforced server-side by RolesGuard.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.user?.role === "CONTENT_EDITOR" && pathname === "/admin") {
      router.replace("/admin/content");
    }
  }, [auth.user?.role, pathname, router]);

  if (auth.user && !STAFF_ROLES.includes(auth.user.role ?? "")) {
    return (
      <div className="bg-surface-tint min-h-[70vh] flex items-center justify-center p-md">
        <Card className="bg-surface p-3xl max-w-sm text-center">
          <h1 className="font-display text-section-h2 text-ink">Staff access only</h1>
          <p className="text-body-sm text-ink-muted mt-sm">
            This area is restricted. You are signed in as {auth.user.email}.
          </p>
          <Link href="/" className="inline-block mt-lg">
            <Button variant="secondary">Back to store</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!auth.user) {
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setError(null);
      try {
        const res = await getApiClient().login({ email, password });
        if (!STAFF_ROLES.includes(res.user.role ?? "")) {
          setError("This account does not have staff access.");
          auth.clear();
          return;
        }
        auth.setAuth(res.user, res.token);
        queryClient.clear();
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    };
    return (
      <div className="bg-surface-tint min-h-[70vh] flex items-center justify-center p-md">
        <Card className="bg-surface p-3xl w-full max-w-sm">
          <h1 className="font-display text-section-h2 text-ink mb-xs">Banners In 48 · Ops</h1>
          <p className="text-body-sm text-ink-muted mb-lg">Sign in with your staff account.</p>
          <form onSubmit={submit} className="space-y-md">
            <label className="block">
              <span className="text-body-sm text-ink-muted block mb-xs">Email</span>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-body-sm text-ink-muted block mb-xs">Password</span>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-surface-tint min-h-screen">
      <header className="bg-surface-dark text-ink-light">
        <div className="mx-auto max-w-content px-md lg:px-2xl h-14 flex items-center gap-xl">
          <Link href="/admin" className="font-display font-bold no-underline text-ink-light">
            BI48 Ops
          </Link>
          <nav className="flex gap-lg flex-1">
            {NAV.filter((item) => item.roles.includes(auth.user?.role ?? "")).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-body-sm no-underline ${
                  pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`))
                    ? "text-ink-light font-bold"
                    : "text-ink-light/60 hover:text-ink-light"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="text-xs text-ink-light/60 hidden sm:inline">{auth.user.email}</span>
          <button
            onClick={() => {
              auth.clear();
              queryClient.clear();
            }}
            className="text-xs text-ink-light/60 hover:text-ink-light underline bg-transparent border-none cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-content px-md lg:px-2xl py-xl">{children}</main>
    </div>
  );
}
