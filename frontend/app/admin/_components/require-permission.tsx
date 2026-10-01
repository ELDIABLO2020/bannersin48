"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { PermissionKey } from "@bannersin48/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCan, type CanMode } from "@/lib/auth/useCan";

/**
 * Page-level gate: renders the page only when the signed-in user holds the
 * permission(s), so data queries never fire (and never 403) for a section the
 * user cannot see. Cosmetic — the API enforces every call.
 */
export function RequirePermission({
  perm,
  mode = "all",
  children,
}: {
  perm: PermissionKey | readonly PermissionKey[];
  mode?: CanMode;
  children: ReactNode;
}) {
  const allowed = useCan(perm, mode);
  if (allowed) return <>{children}</>;
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="bg-surface p-3xl max-w-md text-center">
        <h1 className="font-display text-section-h2 text-ink">You don&apos;t have access to this section</h1>
        <p className="text-body-sm text-ink-muted mt-sm">
          Your account doesn&apos;t include this part of the staff area. Ask an administrator if you need it.
        </p>
        <Link href="/admin" className="inline-block mt-lg">
          <Button variant="secondary">Back to staff home</Button>
        </Link>
      </Card>
    </div>
  );
}
