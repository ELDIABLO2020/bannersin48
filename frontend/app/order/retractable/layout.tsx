import type { Metadata } from "next";
import { PRODUCTS } from "@bannersin48/shared";

export const metadata: Metadata = {
  title: `${PRODUCTS.RETRACTABLE.title} — Order`,
  description: PRODUCTS.RETRACTABLE.subtitle,
};

export default function RetractableLayout({ children }: { children: React.ReactNode }) {
  return children;
}
