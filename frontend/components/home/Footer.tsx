import Link from "next/link";

const COLUMNS = [
  {
    title: "Products",
    items: [
      { href: "/order/vinyl", label: "Vinyl Banners" },
      { href: "/order/retractable", label: "Retractable Banners" },
      { href: "/sizes", label: "All Sizes & Pricing" },
      { href: "/order/artwork", label: "Upload Artwork" },
      { href: "/help", label: "Artwork Guidelines" },
    ],
  },
  {
    title: "Company",
    items: [
      { href: "/about", label: "About Us" },
      { href: "/reviews", label: "Reviews" },
      { href: "/guarantee", label: "Delivery Guarantee" },
      { href: "/quality", label: "Production & Quality" },
    ],
  },
  {
    title: "Support",
    items: [
      { href: "/help", label: "Help Center" },
      { href: "/faq", label: "FAQs" },
      { href: "/orders/lookup", label: "Track Your Order" },
      { href: "/chat", label: "Chat With Us" },
      { href: "mailto:support@bannersin48.com", label: "Email Support" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/login", label: "Log In" },
      { href: "/register", label: "Create Account" },
      { href: "/dashboard", label: "Reorder" },
      { href: "/tax-exempt", label: "Tax-Exempt Program" },
    ],
  },
] as const;

const PAYMENT_METHODS = ["Visa", "Mastercard", "Amex", "Discover", "Apple Pay", "PayPal"];

export function Footer() {
  return (
    <footer className="bg-darkest text-white">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-xl">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-xs no-underline mb-md" aria-label="Banners In 48 home">
              <span className="font-display text-xl font-bold tracking-tight text-white">Banners In</span>
              <span className="rounded-pill bg-strong-accent px-sm py-xs font-display text-sm font-bold text-strong-accent-text">48</span>
            </Link>
            <p className="text-sm text-white/70 mb-md">
              Custom vinyl banners printed and shipped in 48 business hours.
            </p>
            <p className="text-sm text-white/70">
              <span className="text-white font-semibold">Get in touch:</span>
              <br />
              <a href="mailto:support@bannersin48.com" className="text-strong-accent hover:underline no-underline">
                support@bannersin48.com
              </a>
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="font-bold text-body mb-md text-white">{col.title}</h3>
              <ul className="space-y-xs">
                {col.items.map((item) => (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-white/70 hover:text-white hover:underline inline-flex items-center gap-xs no-underline"
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
          <nav className="flex flex-wrap gap-md text-sm text-white/60">
            <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white">Terms of Service</Link>
            <Link href="/refunds" className="hover:text-white">Refund &amp; Reprint Policy</Link>
          </nav>
          <div className="lg:ml-auto flex flex-wrap gap-xs">
            {PAYMENT_METHODS.map((m) => (
              <span
                key={m}
                className="text-[10px] font-bold text-white/80 border border-white/25 rounded-sm px-sm py-xs"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
