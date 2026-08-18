import type { Metadata } from "next";
import { HUB_SUBTITLE, HUB_TITLE } from "@bannersin48/shared";

export const metadata: Metadata = {
  title: HUB_TITLE,
  description: HUB_SUBTITLE,
};

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
