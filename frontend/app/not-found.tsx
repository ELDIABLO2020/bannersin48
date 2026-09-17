import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PagePrompt } from "@/components/ui/page-prompt";

export default function NotFound() {
  return (
    <PagePrompt title="Page not found" detail="That address does not match a page on this site. It may have moved.">
      <Link href="/order">
        <Button variant="cta" size="lg">See all banners</Button>
      </Link>
      <Link href="/">
        <Button variant="secondary" size="lg">Go to the homepage</Button>
      </Link>
    </PagePrompt>
  );
}
