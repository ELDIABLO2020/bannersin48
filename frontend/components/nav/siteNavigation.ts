import { PRODUCTS, CATALOG_NAV_PRODUCTS } from "@bannersin48/shared";

export type SiteNavigationItem = {
  href: string;
  label: string;
};

export type SiteNavigationGroup = {
  title: string;
  items: ReadonlyArray<SiteNavigationItem>;
};

const PRODUCT_ITEMS: ReadonlyArray<SiteNavigationItem> = [
  { href: "/order", label: "All banners" },
  ...CATALOG_NAV_PRODUCTS.map((id) => ({
    href: `/order/${PRODUCTS[id].slug}`,
    label: PRODUCTS[id].title,
  })),
  { href: "/sizes", label: "All Sizes & Pricing" },
  { href: "/order", label: "Upload Artwork" },
  { href: "/help", label: "Artwork Guidelines" },
];

export const SITE_NAVIGATION_GROUPS: ReadonlyArray<SiteNavigationGroup> = [
  {
    title: "Products",
    items: PRODUCT_ITEMS,
  },
  {
    title: "Company",
    items: [{ href: "/#guarantee", label: "Delivery information" }],
  },
  {
    title: "Support",
    items: [
      { href: "/help", label: "Help Center" },
      { href: "/help", label: "FAQs" },
      { href: "/orders", label: "Track Your Orders" },
      { href: "mailto:support@bannersin48.com", label: "Email Support" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/login", label: "Log In" },
      { href: "/register", label: "Create Account" },
      { href: "/dashboard", label: "Reorder" },
    ],
  },
];
