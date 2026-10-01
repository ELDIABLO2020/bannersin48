"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/stores/auth";
import { SignInPrompt } from "@/components/account/SignInPrompt";
import { AccountNav, activeSection } from "@/components/account/AccountNav";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

/**
 * Signed-in layout for `/account/*` (plan §4.3): storefront chrome around a
 * left rail (lg+) or tab strip, the section title, and the content. A
 * signed-out visit shows the sign-in prompt with `next` set to the requested
 * page; a temporary-password account is sent to set its own first.
 */
export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/account";
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const clear = useAuth((s) => s.clear);
  // The auth store rehydrates from localStorage, so only trust it after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="bg-surface-tint min-h-[60vh]" aria-busy="true" />;
  }

  if (!user) {
    return (
      <SignInPrompt
        title="Log in to your account"
        detail="Your orders, saved designs, uploaded artwork and rewards are kept with your account."
        next={pathname}
      />
    );
  }

  const section = activeSection(pathname);

  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-2xl">
        {user.mustChangePassword && (
          <div role="alert" className="mb-lg flex flex-wrap items-center justify-between gap-md rounded-feature bg-warning-bg text-warning-fg p-md text-body-sm">
            <span>Your account uses a temporary password. Set your own password to keep using it.</span>
            <Link href={`/change-password?next=${encodeURIComponent(pathname)}`} className="font-bold underline text-inherit">
              Change password
            </Link>
          </div>
        )}
        <PageHeader
          title={section.label === "Overview" ? "Your account" : section.label}
          intro={section.intro}
          trail={section.href === "/account" ? undefined : [{ href: "/account", label: "Your account" }]}
          actions={
            <div className="flex flex-wrap gap-sm">
              <Link href="/order">
                <Button variant="cta" size="md">Start a new order</Button>
              </Link>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  clear();
                  router.push("/");
                }}
              >
                <LogOut className="mr-xs h-4 w-4" aria-hidden />
                Log out
              </Button>
            </div>
          }
        />
        <div className="grid grid-cols-1 gap-lg lg:grid-cols-[14rem_1fr] lg:gap-2xl">
          <AccountNav />
          <div className="min-w-0" data-testid="account-content">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
