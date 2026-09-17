import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";

/** Closing call to action on the homepage. */
export function EmailCapture() {
  return (
    <section className="bg-darkest text-white" aria-labelledby="cta-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl flex flex-col gap-lg lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          id="cta-h"
          onDark
          title="Start your banner order"
          intro="Have your artwork ready. You will see the price and the delivery date before you submit anything."
        />
        <Link href="/order" className="no-underline shrink-0">
          <Button variant="cta" size="lg">
            Start your order
          </Button>
        </Link>
      </div>
    </section>
  );
}
