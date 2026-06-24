"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { SITE_NAVIGATION_GROUPS } from "./siteNavigation";

const ANIMATION_MS = 300;

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement>;
}

function isCurrentRoute(pathname: string, href: string) {
  if (!href.startsWith("/")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileMenuDrawer({
  isOpen,
  onClose,
  triggerRef,
}: MobileMenuDrawerProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [render, setRender] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);
  const previousOverflowRef = useRef("");
  const titleId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(motionQuery.matches);
    updateMotionPreference();
    motionQuery.addEventListener("change", updateMotionPreference);
    return () => motionQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      setRender(true);
      previousOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
      return () => window.clearTimeout(focusTimer);
    }

    if (!wasOpenRef.current) return;

    document.body.style.overflow = previousOverflowRef.current;
    triggerRef.current?.focus();
    const finishClose = () => {
      setRender(false);
      wasOpenRef.current = false;
    };

    if (reducedMotion) {
      finishClose();
      return;
    }

    const closeTimer = window.setTimeout(finishClose, ANIMATION_MS);
    return () => window.clearTimeout(closeTimer);
  }, [isOpen, reducedMotion, triggerRef]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) onClose();
    };
    desktopQuery.addEventListener("change", closeOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeOnDesktop);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = previousOverflowRef.current;
    };
  }, []);

  if (!mounted || !render) return null;

  const transitionClass = reducedMotion
    ? ""
    : "transition-transform duration-300 ease-out";

  return createPortal(
    <div aria-hidden={!isOpen}>
      <button
        type="button"
        className={cn(
          "fixed inset-0 bg-black/45",
          !reducedMotion && "transition-opacity duration-300",
        )}
        style={{
          zIndex: "var(--z-modal-backdrop)",
          opacity: isOpen ? 1 : 0,
        }}
        onClick={onClose}
        aria-label="Close menu"
        tabIndex={-1}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "fixed inset-y-0 left-0 flex w-[88vw] max-w-[380px] flex-col bg-surface shadow-elev-3",
          transitionClass,
        )}
        style={{
          zIndex: "var(--z-modal)",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div className="flex items-center justify-between border-b border-line px-lg py-md">
          <div onClick={onClose}>
            <BrandLogo imageClassName="h-9" />
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-btn p-sm text-ink-muted hover:bg-soft-accent hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strong-accent"
          >
            <X className="h-6 w-6" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-lg py-lg">
          <h2 id={titleId} className="font-display text-heading-h2 leading-none text-ink">
            Menu
          </h2>
          <nav className="mt-lg space-y-xl" aria-label="Full site navigation">
            {SITE_NAVIGATION_GROUPS.map((group) => (
              <section key={group.title} aria-labelledby={`${titleId}-${group.title}`}>
                <h3
                  id={`${titleId}-${group.title}`}
                  className="font-display text-heading-h4 uppercase tracking-wide text-ink"
                >
                  {group.title}
                </h3>
                <ul className="mt-sm space-y-xs">
                  {group.items.map((item) => {
                    const active = isCurrentRoute(pathname, item.href);
                    return (
                      <li key={item.href + item.label}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-10 items-center rounded-btn border-l-4 border-transparent px-md py-sm text-sm font-medium no-underline transition-colors",
                            active
                              ? "border-strong-accent bg-soft-accent text-ink"
                              : "text-ink-muted hover:bg-soft-accent hover:text-ink",
                          )}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </nav>
        </div>

        <div className="border-t border-line bg-surface px-lg pb-[calc(16px+env(safe-area-inset-bottom))] pt-md">
          <Link href="/order/vinyl" onClick={onClose}>
            <Button variant="cta" size="block" className="w-full">
              Order now
              <ArrowRight className="ml-sm h-5 w-5" aria-hidden />
            </Button>
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
