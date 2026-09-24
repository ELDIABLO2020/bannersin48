import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";

const FACTS = [
  { term: "Daily cutoff", detail: "9:00 PM Eastern" },
  { term: "Turnaround", detail: "48 business hours, delivered by noon" },
  { term: "Delivery", detail: "FedEx, United States only" },
  { term: "Artwork files", detail: "JPEG, PNG, or PDF" },
] as const;

export function GuaranteePanel() {
  return (
    <section id="guarantee" className="bg-surface" aria-labelledby="guarantee-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-2xl sm:py-3xl grid grid-cols-1 lg:grid-cols-12 gap-2xl">
        <div className="lg:col-span-5">
          <SectionHeading
            id="guarantee-h"
            title="What the 48 hours covers"
            intro="The clock starts once your order is submitted and staff have confirmed your payment. From there it runs on business hours until FedEx delivers."
          />
          <Link href="/help" className="mt-lg inline-block text-body-sm font-bold text-link font-body">
            Read how delivery works
          </Link>
        </div>
        <dl className="lg:col-span-7 border-t border-line">
          {FACTS.map((fact) => (
            <div key={fact.term} className="grid grid-cols-[10rem_1fr] gap-md border-b border-line py-md">
              <dt className="text-body-sm text-ink-muted font-body">{fact.term}</dt>
              <dd className="font-display text-heading-h3 text-ink">{fact.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
