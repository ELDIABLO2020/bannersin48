"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

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
 *
 * The shell is intentionally separate from the storefront route group: no
 * consumer announcement, nav, footer, countdown, mobile tabs, or cart render
 * here at any width.
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
            <label className="block" htmlFor="admin-email">
              <span className="text-body-sm text-ink-muted block mb-xs">Email</span>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block" htmlFor="admin-password">
              <span className="text-body-sm text-ink-muted block mb-xs">Password</span>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
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

  return <AdminShell role={auth.user.role ?? ""} email={auth.user.email}>{children}</AdminShell>;
}

/** Signed-in staff shell: responsive header, role-filtered nav, mobile drawer. */
function AdminShell({ role, email, children }: { role: string; email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const items = NAV.filter((item) => item.roles.includes(role));

  // Close the mobile menu on route change and on Escape.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));

  return (
    <div className="bg-surface-tint min-h-screen flex flex-col">
      <header className="bg-surface-dark text-ink-light sticky top-0 z-sticky">
        <div className="mx-auto max-w-content px-md lg:px-2xl">
          <div className="h-14 flex items-center gap-lg">
            <Link href="/admin" className="font-display font-bold no-underline text-ink-light shrink-0">
              BI48 Ops
            </Link>

            {/* Desktop navigation */}
            <nav aria-label="Admin" className="hidden md:flex gap-lg flex-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "text-body-sm no-underline",
                    isActive(item.href)
                      ? "text-ink-light font-bold"
                      : "text-ink-light/60 hover:text-ink-light",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex-1 md:hidden" />

            <span className="text-xs text-ink-light/60 hidden sm:inline">{email}</span>
            <button
              onClick={() => {
                auth.clear();
                queryClient.clear();
              }}
              className="text-xs text-ink-light/60 hover:text-ink-light underline bg-transparent border-none cursor-pointer shrink-0"
            >
              Sign out
            </button>

            {/* Mobile menu trigger */}
            <button
              ref={menuButtonRef}
              type="button"
              className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-btn text-ink-light bg-transparent border border-ink-light/40"
              aria-expanded={menuOpen}
              aria-controls="admin-mobile-nav"
              aria-label={menuOpen ? "Close admin menu" : "Open admin menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span aria-hidden>{menuOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {menuOpen && (
          <nav
            id="admin-mobile-nav"
            aria-label="Admin sections"
            className="md:hidden border-t border-ink-light/20 bg-surface-dark"
          >
            <ul className="mx-auto max-w-content px-md py-sm space-y-xs list-none m-0">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "block rounded-btn px-md py-sm text-body no-underline",
                      isActive(item.href)
                        ? "bg-ink-light/10 text-ink-light font-bold"
                        : "text-ink-light/70 hover:text-ink-light hover:bg-ink-light/5",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main id="admin-main" className="mx-auto w-full max-w-content px-md lg:px-2xl py-xl flex-1">
        {children}
      </main>
    </div>
  );
}
