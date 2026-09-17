import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

/** Quiet shell for sign-in pages: the logo leads home, and nothing competes with the form. */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-soft-accent">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-content items-center justify-between px-md lg:px-2xl">
          <BrandLogo priority />
          <Link href="/order" className="text-body-sm font-bold text-link font-body">
            Back to the shop
          </Link>
        </div>
      </header>
      <main id="main-content" className="flex-1">
        {children}
      </main>
    </div>
  );
}
