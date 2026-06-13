import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-surface p-md">
      <div className="text-center max-w-md">
        <p className="font-display text-cta text-2xl font-bold">404</p>
        <h1 className="font-display text-section-h2 text-ink mt-md">Page not found</h1>
        <p className="text-body text-ink-muted mt-md">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block mt-xl bg-cta text-cta-fg rounded-btn px-2xl py-sm font-bold no-underline hover:bg-cta-hover"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
