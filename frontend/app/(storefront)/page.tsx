import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { HelpMeChoose } from "@/components/home/HelpMeChoose";
import { ProductStrip } from "@/components/home/ProductStrip";
import { HowItWorks } from "@/components/home/HowItWorks";
import { GuaranteePanel } from "@/components/home/GuaranteePanel";
import { FAQ } from "@/components/home/FAQ";
import { EmailCapture } from "@/components/home/EmailCapture";

export const metadata: Metadata = {
  title: "Banners In 48 — Custom Banners Delivered in 48 Business Hours",
  description:
    "Configure custom vinyl, mesh, poster, canvas, and banner stands. USA-only orders use USD and manual payment.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <HelpMeChoose />
      <ProductStrip />
      <HowItWorks />
      <GuaranteePanel />
      <FAQ />
      <EmailCapture />
    </>
  );
}
