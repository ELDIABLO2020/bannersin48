import Link from "next/link";
import { ArrowRight, BookOpen, FileText, HelpCircle, LayoutTemplate } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { placeholders, type PlaceholderKey } from "@/content/placeholders";

const RESOURCES: ReadonlyArray<{
  href: string;
  icon: typeof HelpCircle;
  title: string;
  description: string;
  imageKey: PlaceholderKey;
}> = [
  {
    href: "/help",
    icon: HelpCircle,
    title: "Help Center",
    description: "Artwork specs, file prep, and ordering answers.",
    imageKey: "resourceHelp",
  },
  {
    href: "/faq",
    icon: BookOpen,
    title: "FAQs",
    description: "Common questions about delivery and production.",
    imageKey: "resourceFaq",
  },
  {
    href: "/templates",
    icon: LayoutTemplate,
    title: "Templates",
    description: "Starting points for banner layouts and sizes.",
    imageKey: "resourceTemplates",
  },
  {
    href: "/how-it-works",
    icon: FileText,
    title: "How It Works",
    description: "Step-by-step from upload to delivery.",
    imageKey: "resourceHowItWorks",
  },
];

export function ResourcesBand() {
  return (
    <section className="bg-soft-accent" aria-labelledby="resources-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <ScrollReveal className="text-center mb-2xl">
          <h2
            id="resources-h"
            className="font-display tracking-tight text-[clamp(34px,4.5vw,68px)] leading-[1.05] text-ink uppercase"
          >
            Resources to support your order
          </h2>
          <p className="mt-md text-body text-ink-muted max-w-2xl mx-auto font-body">
            Guidelines, templates, and answers so your artwork is ready for production.
          </p>
        </ScrollReveal>
        <ScrollReveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          {RESOURCES.map((r) => {
            const Icon = r.icon;
            const image = placeholders[r.imageKey];
            return (
              <Link
                key={r.href}
                href={r.href}
                className="group rounded-card border border-line bg-surface overflow-hidden shadow-elev-1 hover:shadow-elev-2 hover:-translate-y-0.5 transition-all no-underline"
              >
                <div className="relative h-32 overflow-hidden">
                  <PlaceholderImage
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                </div>
                <div className="p-lg">
                  <Icon className="h-7 w-7 text-strong-accent" aria-hidden />
                  <h3 className="mt-md font-display text-xl text-ink group-hover:text-link uppercase tracking-wide">
                    {r.title}
                  </h3>
                  <p className="mt-sm text-sm text-ink-muted font-body">{r.description}</p>
                  <span className="mt-md inline-flex items-center gap-xs text-sm font-semibold text-link font-body">
                    Browse
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </span>
                </div>
              </Link>
            );
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}
