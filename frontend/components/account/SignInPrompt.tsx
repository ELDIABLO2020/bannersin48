import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PagePrompt } from "@/components/ui/page-prompt";

/** Shown in place of an account-only page when nobody is signed in. */
export function SignInPrompt({ title, detail, next }: { title: string; detail?: string; next: string }) {
  const query = `?next=${encodeURIComponent(next)}`;
  return (
    <PagePrompt title={title} detail={detail}>
      <Link href={`/login${query}`}>
        <Button variant="cta" size="lg">Log in</Button>
      </Link>
      <Link href={`/register${query}`}>
        <Button variant="secondary" size="lg">Create an account</Button>
      </Link>
    </PagePrompt>
  );
}
