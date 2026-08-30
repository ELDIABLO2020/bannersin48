import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SITE_NAVIGATION_GROUPS } from "@/components/nav/siteNavigation";

export function Footer() {
  return (
    <footer className="bg-darkest text-white">
      <h2 className="sr-only">Site footer</h2>
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-xl">
          <div className="sm:col-span-2 lg:col-span-1">
            <BrandLogo className="mb-md" onDark />
            <p className="text-sm text-white/70 mb-md">
              Custom banners printed and shipped in 48 business hours.
            </p>
            <p className="text-sm text-white/70">
              <span className="text-white font-semibold">Get in touch:</span>
              <br />
              <a href="mailto:support@bannersin48.com" className="text-strong-accent-on-dark">
                support@bannersin48.com
              </a>
            </p>
          </div>
          {SITE_NAVIGATION_GROUPS.map((col) => (
            <div key={col.title}>
              <h3 className="font-bold text-body mb-md text-white">{col.title}</h3>
              <ul className="space-y-xs">
                {col.items.map((item) => (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-white/70 hover:text-white hover:underline inline-flex min-h-6 items-center gap-xs no-underline"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-3xl pt-xl border-t border-white/15 flex flex-col lg:flex-row lg:items-center gap-md">
          <p className="text-sm text-white/60">
            &copy; 2026 Banners In 48 &middot; BannersIn48.com
          </p>
          <p className="text-sm text-white/60 lg:ml-auto">
            Internal platform test · USD · Manual payment
          </p>
        </div>
      </div>
    </footer>
  );
}
