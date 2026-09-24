import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { SITE_NAVIGATION_GROUPS } from "@/components/nav/siteNavigation";

export function Footer() {
  return (
    <footer className="bg-darkest text-white border-t border-white/15">
      <h2 className="sr-only">Site footer</h2>
      <div className="mx-auto max-w-content px-md lg:px-2xl py-2xl sm:py-3xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-xl">
          <div className="col-span-2 lg:col-span-1">
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
          {/* Phones: the long product list spans both columns in two columns of its own. */}
          {SITE_NAVIGATION_GROUPS.map((col, i) => (
            <div key={col.title} className={i === 0 ? "col-span-2 sm:col-span-1" : undefined}>
              <h3 className="font-display text-heading-h4 mb-sm sm:mb-md text-white">{col.title}</h3>
              <ul className={i === 0 ? "grid grid-cols-2 gap-x-md sm:block sm:space-y-xs" : "sm:space-y-xs"}>
                {col.items.map((item) => (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-white/70 hover:text-white hover:underline inline-flex min-h-11 sm:min-h-6 items-center gap-xs no-underline"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-2xl sm:mt-3xl pt-xl border-t border-white/15 flex flex-col lg:flex-row lg:items-center gap-md">
          <p className="text-sm text-white/60">
            &copy; 2026 Banners In 48
          </p>
          <p className="text-sm text-white/60 lg:ml-auto">
            Prices in USD. Orders are paid manually after submission.
          </p>
        </div>
      </div>
    </footer>
  );
}
