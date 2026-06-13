import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, MessageCircle, Mail, Search } from "lucide-react";

export const metadata = {
  title: "Help center — Banners In 48",
  description: "Get help with your order. We support via chat and email — no inbound phone calls.",
};

const FAQS = [
  { q: "What file types do you accept?", a: "PDF, JPG, and JPEG only. Max 50 MB." },
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
          We support via chat and email. No inbound phone calls.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md max-w-2xl mx-auto mb-2xl">
          <Card className="bg-surface text-center">
            <MessageCircle className="h-8 w-8 text-link mx-auto" aria-hidden />
            <h2 className="font-bold text-ink mt-sm">Chat with us</h2>
            <p className="text-body-sm text-ink-muted">Real humans, weekdays 9–6 ET.</p>
            <Button variant="cta" size="md" className="mt-md">Start chat</Button>
          </Card>
          <Card className="bg-surface text-center">
            <Mail className="h-8 w-8 text-link mx-auto" aria-hidden />
            <h2 className="font-bold text-ink mt-sm">Email support</h2>
            <p className="text-body-sm text-ink-muted">support@bannersin48.com</p>
            <a href="mailto:support@bannersin48.com" className="inline-block mt-md">
              <Button variant="secondary" size="md">Send email</Button>
            </a>
          </Card>
        </div>

        <h2 className="font-bold text-heading-h4 text-ink mb-md text-center">Quick answers</h2>
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
