export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-tint p-md">
      <div className="bg-surface rounded-card shadow-elev-1 p-2xl max-w-md text-center">
        <h1 className="font-display text-section-h2 text-ink">You&rsquo;re offline</h1>
        <p className="text-body text-ink-muted mt-md">
          We&rsquo;ll be here when you reconnect. Your cart and any saved designs are safe.
        </p>
        <a
          href="/"
          className="inline-block mt-xl bg-cta text-cta-fg rounded-btn px-2xl py-sm font-bold no-underline hover:bg-cta-hover"
        >
          Try again
        </a>
      </div>
    </div>
  );
}
