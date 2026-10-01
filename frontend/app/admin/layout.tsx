"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { PermissionKey } from "@bannersin48/shared";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";
import { canWith, hasAdminAccess } from "@/lib/auth/useCan";
import { useAccessNotice, useSessionRevalidation } from "@/lib/auth/useSessionRevalidation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

/** Nav items declare the permission that reveals them; the first visible one is the landing route. */
const NAV: ReadonlyArray<{ href: string; label: string; permission: PermissionKey }> = [
  { href: "/admin", label: "Dashboard", permission: "orders:read" },
  { href: "/admin/orders", label: "Orders", permission: "orders:read" },
  { href: "/admin/customers", label: "Customers", permission: "customers:read" },
  { href: "/admin/pricing", label: "Pricing", permission: "catalog:read" },
  { href: "/admin/promos", label: "Promo codes", permission: "promos:read" },
  { href: "/admin/content", label: "Content", permission: "content:read" },
  { href: "/admin/staff", label: "Staff", permission: "users:read" },
  { href: "/admin/roles", label: "Roles", permission: "rbac:read" },
  { href: "/admin/audit", label: "Audit log", permission: "audit:read" },
];

/**
 * Staff-gated admin shell. Auth is the same customer auth (JWT in
 * localStorage); every route is enforced server-side by PermissionsGuard,
 * so the gating here only decides what to show.
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

  const permissions = auth.user?.permissions;
  const visible = NAV.filter((item) => canWith(permissions, item.permission));
  const landing = visible[0]?.href;

  // Someone who cannot see the order board lands on the first section they can see.
  useEffect(() => {
    if (pathname === "/admin" && landing && landing !== "/admin") {
      router.replace(landing);
    }
  }, [landing, pathname, router]);

  // A temporary password unlocks nothing but the password form; the API answers
  // 403 PASSWORD_CHANGE_REQUIRED to everything else, so do not render the shell.
  if (auth.user?.mustChangePassword) {
    return (
      <div className="bg-surface-tint min-h-[70vh] flex items-center justify-center p-md">
        <Card className="bg-surface p-3xl max-w-md text-center" data-testid="must-change-password">
          <h1 className="font-display text-section-h2 text-ink">Set your own password first</h1>
          <p className="text-body-sm text-ink-muted mt-sm">
            Your account was created with a temporary password. Choose a new one before using the staff area.
          </p>
          <Link href="/change-password?next=%2Fadmin" className="inline-block mt-lg">
            <Button>Change password</Button>
          </Link>
          <button
            type="button"
            onClick={() => {
              auth.clear();
              queryClient.clear();
            }}
            className="block mx-auto mt-md text-body-sm text-ink-muted underline bg-transparent border-none cursor-pointer"
          >
            Sign out
          </button>
        </Card>
      </div>
    );
  }

  if (auth.user && !hasAdminAccess(auth.user)) {
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
        if (!hasAdminAccess(res.user)) {
          setError("This account does not have staff access.");
          auth.clear();
          return;
        }
        auth.setAuth(res.user, res.token);
        queryClient.clear();
        if (res.user.mustChangePassword) {
          router.push("/change-password?next=%2Fadmin");
          return;
        }
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
          <h1 className="font-display text-section-h2 text-ink mb-xs">Staff sign-in</h1>
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

  return <AdminShell items={visible} email={auth.user.email}>{children}</AdminShell>;
}

/** Signed-in staff shell: responsive header, permission-filtered nav, mobile drawer. */
function AdminShell({
  items,
  email,
  children,
}: {
  items: ReadonlyArray<{ href: string; label: string }>;
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const notice = useAccessNotice();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Permissions change server-side at once; make sure the shell reflects them on entry too.
  useSessionRevalidation();

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
            <Link href="/admin" className="flex items-center gap-sm no-underline text-ink-light shrink-0" aria-label="Banners In 48 staff home">
              <Image src="/images/logo-dark.png" alt="" width={502} height={116} className="h-7 w-auto" priority />
              <span className="text-body-sm font-semibold text-ink-light/70">Staff</span>
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
        {notice.message && (
          <div role="status" className="mb-lg flex items-start justify-between gap-md rounded-feature bg-warning-bg text-warning-fg p-md text-body-sm">
            <span>{notice.message}</span>
            <button
              type="button"
              onClick={() => notice.set(null)}
              className="shrink-0 underline bg-transparent border-none cursor-pointer text-inherit"
            >
              Dismiss
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
