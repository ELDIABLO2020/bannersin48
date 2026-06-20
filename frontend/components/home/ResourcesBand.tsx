import Link from "next/link";
import { ArrowRight, BookOpen, FileText, HelpCircle, LayoutTemplate } from "lucide-react";

const RESOURCES = [
  {
    href: "/help",
    icon: HelpCircle,
    title: "Help Center",
    description: "Artwork specs, file prep, and ordering answers.",
  },
  {
    href: "/faq",
    icon: BookOpen,
    title: "FAQs",
    description: "Common questions about delivery and production.",
  },
  {
    href: "/templates",
    icon: LayoutTemplate,
    title: "Templates",
    description: "Starting points for banner layouts and sizes.",
  },
  {
    href: "/how-it-works",
    icon: FileText,
    title: "How It Works",
    description: "Step-by-step from upload to delivery.",
  },
] as const;

export function ResourcesBand() {
  return (
    <section className="bg-soft-accent" aria-labelledby="resources-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="text-center mb-2xl">
          <h2
            id="resources-h"
            className="font-display font-extrabold tracking-tight text-[clamp(34px,4.5vw,52px)] leading-[1.05] text-ink"
          >
            Resources to support your order
          </h2>
          <p className="mt-md text-body text-ink-muted max-w-2xl mx-auto">
            Guidelines, templates, and answers so your artwork is ready for production.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          {RESOURCES.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.href}
                href={r.href}
                className="group rounded-card border border-line bg-surface p-lg shadow-elev-1 hover:shadow-elev-2 hover:-translate-y-0.5 transition-all no-underline"
              >
                <Icon className="h-8 w-8 text-strong-accent" aria-hidden />
                <h3 className="mt-md font-display font-bold text-lg text-ink group-hover:text-link">
                  {r.title}
                </h3>
                <p className="mt-sm text-sm text-ink-muted">{r.description}</p>
                <span className="mt-md inline-flex items-center gap-xs text-sm font-semibold text-link">
                  Browse
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
