import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Sparkles, PenTool, Image as ImageIcon, Grid } from "lucide-react";

export const metadata = {
  title: "Design online — Banners In 48",
  robots: { index: false, follow: true },
};

const FEATURES = [
  { icon: PenTool, label: "Start from blank canvas" },
  { icon: ImageIcon, label: "Upload logo, photos, and artwork" },
  { icon: Grid, label: "Print-safe zones for grommets &amp; pole pockets" },
  { icon: Sparkles, label: "AI print check (Phase 3)" },
];

export default function DesignPage() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-2xl px-md lg:px-2xl py-xl text-center">
        <Badge variant="warning" className="mb-md">Coming soon</Badge>
        <h1 className="font-display text-section-h2 text-ink leading-section-h2">
          Design online
        </h1>
        <p className="text-body text-ink-muted mt-md">
          The web-to-print editor is in development. We&rsquo;ll embed a production-grade editor
          that supports templates, image uploads, text editing, brand assets, and print-safe zones
          for grommets &amp; pole pockets.
        </p>

        <ul className="grid grid-cols-2 gap-sm mt-2xl">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.label}>
                <Card className="bg-surface text-left h-full">
                  <Icon className="h-6 w-6 text-link" aria-hidden />
                  <p className="text-sm font-bold text-ink mt-sm" dangerouslySetInnerHTML={{ __html: f.label }} />
                </Card>
              </li>
            );
          })}
        </ul>

        <Link
          href="/order/vinyl"
          className="inline-block mt-2xl bg-cta text-cta-fg rounded-btn px-2xl py-sm font-bold no-underline hover:bg-cta-hover"
        >
          Skip ahead &mdash; order a banner now <ChevronRight className="inline h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
