import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StepIllustration } from "@/components/how-it-works/StepIllustration";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "How it works",
  description: "Pick a banner product, upload your artwork, review it at checkout, and get 48-business-hour delivery within the United States.",
  alternates: { canonical: "/how-it-works" },
};

const STEPS = [
  { n: 1, kind: "size" as const, title: "Pick your product", body: "Choose HD Banner, mesh, poster, canvas, no-curl, or a stand. Custom products take size next; stands are a fixed 33.5\" × 80\"." },
  { n: 2, kind: "upload" as const, title: "Upload your artwork", body: "JPEG, PNG, or PDF. You review the exact file you uploaded before submitting, and we print it as configured." },
  { n: 3, kind: "proof" as const, title: "Review at checkout", body: "Confirm your uploaded file and configuration when you submit. Delivery timing starts after order submission and manual payment confirmation." },
  { n: 4, kind: "delivery" as const, title: "Delivered by noon", body: "FedEx delivery within the United States on our 48-business-hour schedule." },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-2xl">
        <PageHeader
          title="How it works"
          intro="From order to door in 48 business hours, by FedEx, within the United States."
        />
        <ol className="border-b border-line">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="grid grid-cols-[2.5rem_1fr] items-center gap-md border-t border-line py-xl md:grid-cols-[3.5rem_1fr_220px] md:gap-xl"
            >
              <span className="self-start font-display text-section-h2 leading-none text-strong-accent tabular-nums" aria-hidden>
                {s.n}
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-heading-h2 text-ink">{s.title}</h2>
                <p className="mt-xs max-w-[60ch] text-body text-ink-muted">{s.body}</p>
              </div>
              <div className="col-span-2 rounded-card bg-surface px-md py-sm md:col-span-1">
                <StepIllustration kind={s.kind} />
              </div>
            </li>
          ))}
        </ol>
        <Link href="/order" className="mt-xl inline-block">
          <Button variant="cta" size="lg">
            Start your order
          </Button>
        </Link>
      </div>
    </div>
  );
}
