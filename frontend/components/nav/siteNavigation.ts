export type SiteNavigationItem = {
  href: string;
  label: string;
};

export type SiteNavigationGroup = {
  title: string;
  items: ReadonlyArray<SiteNavigationItem>;
};

export const SITE_NAVIGATION_GROUPS: ReadonlyArray<SiteNavigationGroup> = [
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
