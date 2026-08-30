import type { Metadata } from "next";
import { productBySlug } from "@bannersin48/shared";

type Params = { slug: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  const product = productBySlug(params.slug);
  if (!product) {
    return { title: "Order" };
  }
  return {
    title: `${product.title} — Order`,
    description: product.subtitle,
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
