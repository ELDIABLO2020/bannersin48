import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VisualCategoryCard } from "@/components/catalog/VisualCategoryCard";
import { catalogImage } from "@/content/catalogImages";
import { placeholders, type PlaceholderAsset } from "@/content/placeholders";
import { Mail } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import { catalogFilterHref, productOrderHref, PRODUCTS, UPLOAD_REJECT } from "@bannersin48/shared";

export const metadata: Metadata = {
  title: "Help center",
  description: "Get help choosing a banner product and placing your order. Email support is available.",
  alternates: { canonical: "/help" },
};

const FAQS = [
  {
    q: "Which banner do I need?",
    a: "HD Banner for everyday hanging banners. Mesh for windy fences and jobsites. Poster for short-term indoor displays. No-Curl when it has to lie flat. Canvas for stretching and framing. Econostand or Retractable when you need the stand as well.",
  },
  {
    q: "What file types do you accept?",
    a: UPLOAD_REJECT,
  },
  {
    q: "Do all products include welding and grommets?",
    a: "Only HD Banner and Mesh have finishing options: welding, grommets, pole pockets, and webbing on mesh. HDPE, poster, no-curl, canvas, and stands ship without finishing.",
  },
  {
    q: "Are there size limits besides 10' × 10'?",
    a: "Yes. Canvas shorter side max 49\". HDPE and Poster 52\". No-Curl 35\" and a 12\" minimum. Stands are a fixed 33.5\" × 80\".",
  },
  {
    q: "Can I cancel my order?",
    a: "You can cancel before your order is marked as paid and production begins. Email support if you need to cancel.",
  },
  {
    q: "What if my banner arrives late?",
    a: "Delivery timing begins after order submission and manual payment confirmation. If your banner misses that estimate, email support and we'll review your order.",
  },
  { q: "Do you ship outside the United States?", a: "No. We ship within the United States only." },
];

const HELP_NEEDS: ReadonlyArray<{
  title: string;
  subtitle: string;
  href: string;
  image: PlaceholderAsset;
}> = [
  {
    title: "Windy or fence",
    subtitle: PRODUCTS.MESH.title,
    href: productOrderHref("MESH"),
    image: catalogImage("MESH"),
  },
  {
    title: "Indoor short-term",
    subtitle: PRODUCTS.POSTER.title,
    href: productOrderHref("POSTER"),
    image: catalogImage("POSTER"),
  },
  {
    title: "Must lay flat",
    subtitle: PRODUCTS.NO_CURL.title,
    href: productOrderHref("NO_CURL"),
    image: catalogImage("NO_CURL"),
  },
  {
    title: "Art to frame",
    subtitle: PRODUCTS.CANVAS.title,
    href: productOrderHref("CANVAS"),
    image: catalogImage("CANVAS"),
  },
  {
    title: "Need a stand",
    subtitle: "Econostand or Retractable",
    href: catalogFilterHref("stand"),
    image: catalogImage("ECONOSTAND"),
  },
  {
    title: "Not sure",
    subtitle: "See all products",
    href: "/order",
    image: placeholders.hero,
  },
];

export default function HelpPage() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-2xl">
        <PageHeader
          title="Help center"
          intro="Pick the right banner, check what we accept, or write to us. Support is by email."
          actions={
            <a href="mailto:support@bannersin48.com">
              <Button variant="secondary" size="md">
                <Mail className="mr-xs h-4 w-4" aria-hidden />
                support@bannersin48.com
              </Button>
            </a>
          }
        />

        <section className="mb-2xl sm:mb-3xl" aria-labelledby="which-banner-h">
          <SectionHeading id="which-banner-h" level="sub" title="Which banner do I need?" className="mb-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
            {HELP_NEEDS.map((need) => (
              <VisualCategoryCard
                key={need.title}
                href={need.href}
                title={need.title}
                subtitle={need.subtitle}
                image={need.image}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="faq" className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <div className="lg:col-span-4">
            <SectionHeading
              id="faq"
              level="sub"
              title="Common questions"
              intro={
                <>
                  Looking for an order you placed? <Link href="/orders">Track it from your account</Link>.
                </>
              }
            />
          </div>
          <dl className="lg:col-span-8 border-t border-line">
            {FAQS.map((f) => (
              <div key={f.q} className="border-b border-line py-lg">
                <dt className="font-bold text-body text-ink font-body">{f.q}</dt>
                <dd className="mt-xs text-body text-ink-muted max-w-[70ch]">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
