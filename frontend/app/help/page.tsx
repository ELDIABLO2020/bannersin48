import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Mail } from "lucide-react";
import { catalogFilterHref, productOrderHref, UPLOAD_REJECT } from "@bannersin48/shared";

export const metadata = {
  title: "Help center — Banners In 48",
  description: "Get help choosing a banner product and placing your order. We support via email — no inbound phone calls.",
};

const FAQS = [
  {
    q: "Which banner do I need?",
    a: `Windy fences and construction → Mesh. Everyday hanging banners → HD Banner. Indoor short-term POP → Poster. Must lay flat → No-Curl. Stretch and frame → Canvas. Need hardware → Econostand or Retractable.`,
  },
  {
    q: "What file types do you accept?",
    a: UPLOAD_REJECT,
  },
  {
    q: "Do all products include welding and grommets?",
    a: "Only HD Banner and Mesh have finishing options (welding, grommets, pockets, and — on mesh — webbing). HDPE, poster, no-curl, canvas, and stands ship without that finishing dock.",
  },
  {
    q: "Are there size limits besides 10' × 10'?",
    a: "Yes. Canvas shorter side max 49\". HDPE and Poster 52\". No-Curl 35\" and a 12\" minimum. Stands are a fixed 33.5\" × 80\".",
  },
  { q: "Can I cancel my order?", a: "Yes — for 10 minutes after proof approval. After that, production starts." },
  { q: "What if my banner arrives late?", a: "We refund the $10 shipping fee for any banner that misses the 48-hour promise for reasons on our side." },
  { q: "Do you ship outside the US &amp; Canada?", a: "Not yet. Expansion is on the roadmap." },
];

export default function HelpPage() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <h1 className="font-display text-section-h2 text-ink leading-section-h2 mb-md text-center">
          Help center
        </h1>
        <p className="text-body text-ink-muted text-center mb-2xl max-w-2xl mx-auto">
          We support via email. No inbound phone calls.
        </p>

        <section className="max-w-3xl mx-auto mb-2xl" aria-labelledby="which-banner-h">
          <h2 id="which-banner-h" className="font-bold text-heading-h4 text-ink mb-md text-center">
            Which banner?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            <Link href={productOrderHref("MESH")} className="rounded-card border border-line bg-surface p-md no-underline hover:border-link">
              <p className="font-bold text-ink">Windy or fence</p>
              <p className="text-body-sm text-ink-muted mt-xs">Mesh Banner</p>
            </Link>
            <Link href={productOrderHref("POSTER")} className="rounded-card border border-line bg-surface p-md no-underline hover:border-link">
              <p className="font-bold text-ink">Indoor short-term</p>
              <p className="text-body-sm text-ink-muted mt-xs">Poster</p>
            </Link>
            <Link href={productOrderHref("NO_CURL")} className="rounded-card border border-line bg-surface p-md no-underline hover:border-link">
              <p className="font-bold text-ink">Must lay flat</p>
              <p className="text-body-sm text-ink-muted mt-xs">No-Curl Banner</p>
            </Link>
            <Link href={productOrderHref("CANVAS")} className="rounded-card border border-line bg-surface p-md no-underline hover:border-link">
              <p className="font-bold text-ink">Art to frame</p>
              <p className="text-body-sm text-ink-muted mt-xs">Canvas</p>
            </Link>
            <Link href={catalogFilterHref("stand")} className="rounded-card border border-line bg-surface p-md no-underline hover:border-link">
              <p className="font-bold text-ink">Need a stand</p>
              <p className="text-body-sm text-ink-muted mt-xs">Econostand or Retractable</p>
            </Link>
            <Link href="/order" className="rounded-card border border-line bg-surface p-md no-underline hover:border-link">
              <p className="font-bold text-ink">Not sure</p>
              <p className="text-body-sm text-ink-muted mt-xs">See all products</p>
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-1 max-w-md mx-auto mb-2xl">
          <Card className="bg-surface text-center">
            <Mail className="h-8 w-8 text-link mx-auto" aria-hidden />
            <h2 className="font-bold text-ink mt-sm">Email support</h2>
            <p className="text-body-sm text-ink-muted">support@bannersin48.com</p>
            <a href="mailto:support@bannersin48.com" className="inline-block mt-md">
              <Button variant="cta" size="md">Send email</Button>
            </a>
          </Card>
        </div>

        <h2 id="faq" className="font-bold text-heading-h4 text-ink mb-md text-center">Quick answers</h2>
        <ul className="max-w-2xl mx-auto space-y-sm">
          {FAQS.map((f) => (
            <li key={f.q} className="bg-surface rounded-feature p-md border border-line">
              <p className="font-bold text-ink">{f.q}</p>
              <p className="text-body-sm text-ink-muted mt-xs" dangerouslySetInnerHTML={{ __html: f.a }} />
            </li>
          ))}
        </ul>

        <div className="text-center mt-2xl">
          <Link href="/orders/lookup" className="text-link text-body-sm hover:underline">
            Track an order <ChevronRight className="inline h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
