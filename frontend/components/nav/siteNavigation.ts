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
  { href: "/sizes", label: "Sizes and pricing" },
];

export const SITE_NAVIGATION_GROUPS: ReadonlyArray<SiteNavigationGroup> = [
  {
    title: "Products",
    items: PRODUCT_ITEMS,
  },
  {
    title: "Support",
    items: [
      { href: "/help", label: "Help center" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/#guarantee", label: "Delivery information" },
      { href: "/orders", label: "Track an order" },
      { href: "mailto:support@bannersin48.com", label: "Email support" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/login", label: "Log in" },
      { href: "/register", label: "Create an account" },
      { href: "/dashboard", label: "Reorder" },
    ],
  },
];
