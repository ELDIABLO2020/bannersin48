import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Shield, Clock, DollarSign, Truck } from "lucide-react";

const POINTS = [
  { icon: Clock, label: "Order by 9:00 PM ET" },
  { icon: Truck, label: "Delivered by 12:00 PM" },
  { icon: DollarSign, label: "$10 flat shipping / banner" },
  { icon: Shield, label: "FedEx — US & Canada" },
];

export function GuaranteePanel() {
  return (
    <section className="bg-surface-tint" aria-labelledby="guarantee-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <Card variant="default" className="bg-surface p-2xl">
          <div className="text-center">
            <h2 id="guarantee-h" className="font-display text-section-h2 text-ink leading-section-h2">
              The 48-hour promise
            </h2>
            <p className="text-body text-ink-muted mt-md max-w-2xl mx-auto">
              We only do banners, so we do them faster and simpler than everyone else.
              If we miss the guarantee, the $10 shipping charge for that banner is refunded — automatically.
            </p>
          </div>
          <ul className="grid grid-cols-2 lg:grid-cols-4 gap-md mt-2xl">
            {POINTS.map((p) => {
              const Icon = p.icon;
              return (
                <li
                  key={p.label}
                  className="flex items-center gap-md p-md rounded-feature bg-surface-tint"
                >
                  <div
                    className="rounded-pill p-sm shrink-0"
                    style={{ backgroundColor: "var(--color-bg-info-tint)" }}
                  >
                    <Icon className="h-5 w-5 text-link" aria-hidden />
                  </div>
                  <span className="text-sm font-bold text-ink leading-tight">{p.label}</span>
                </li>
              );
            })}
          </ul>
          <div className="text-center mt-2xl">
            <Link
              href="/guarantee"
              className="inline-block bg-cta text-cta-fg rounded-btn px-2xl py-sm font-bold no-underline hover:bg-cta-hover"
            >
              Read the full guarantee
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
}
