"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/stores/auth";
import { Button } from "@/components/ui/button";
import { OrderList } from "@/components/orders/OrderList";
import { SignInPrompt } from "@/components/account/SignInPrompt";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";

export default function DashboardPage() {
  const auth = useAuth();
  const router = useRouter();

  if (!auth.user) {
    return (
      <SignInPrompt
        title="Log in to your account"
        detail="Your orders, reorders, and uploaded artwork are kept with your account."
        next="/dashboard"
      />
    );
  }

  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-2xl">
        <PageHeader
          title={auth.user.fullName}
          intro={
            <>
              {auth.user.email}. You have <strong className="text-ink">{auth.user.rewardsPoints} reward points</strong>.
            </>
          }
          actions={
            <div className="flex flex-wrap gap-sm">
              <Link href="/order">
                <Button variant="cta" size="md">Start a new order</Button>
              </Link>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  auth.clear();
                  router.push("/");
                }}
              >
                <LogOut className="mr-xs h-4 w-4" aria-hidden />
                Log out
              </Button>
            </div>
          }
        />

        <div className="mb-lg flex items-end justify-between gap-md">
          <SectionHeading level="sub" title="Recent orders" />
          <Link href="/orders" className="text-body-sm font-bold text-link font-body">
            See all orders
          </Link>
        </div>
        <OrderList limit={5} />

        <p className="mt-xl max-w-[70ch] text-body-sm text-ink-muted">
          Artwork you upload while building a banner stays with this account, so you can pick it again from the
          image library on your next order.
        </p>
      </div>
    </div>
  );
}
