"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";

/** Storefront block keys the admin content editor controls. */
const ANNOUNCEMENT_KEY = "announcement";
const PROMO_STRIP_KEY = "promo_strip";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** CMS links are rendered only for same-site paths. */
function internalHref(value: unknown): string | null {
  const href = text(value);
  return href.startsWith("/") && !href.startsWith("//") ? href : null;
}

/** Published ANNOUNCEMENT and PROMO_STRIP blocks. Renders nothing when neither is set. */
export function SiteContentStrip() {
  const { data } = useQuery({
    queryKey: ["site-content"],
    queryFn: () => getApiClient().listContent(),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const announcementBlock = data?.find((b) => b.key === ANNOUNCEMENT_KEY && b.blockType === "ANNOUNCEMENT");
  const promoBlock = data?.find((b) => b.key === PROMO_STRIP_KEY && b.blockType === "PROMO_STRIP");

  const announcement = announcementBlock?.payload.enabled === true ? text(announcementBlock.payload.text) : "";
  const promo = text(promoBlock?.payload.text);
  const promoHref = internalHref(promoBlock?.payload.linkHref);

  if (!announcement && !promo) return null;

  return (
    <div className="bg-soft-accent text-ink text-sm">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-xs flex flex-wrap items-center justify-center gap-x-md gap-y-xs text-center">
        {announcement && <p className="font-medium">{announcement}</p>}
        {promo &&
          (promoHref ? (
            <Link href={promoHref} className="font-bold text-link hover:text-link-hover">
              {promo}
            </Link>
          ) : (
            <p className="font-bold">{promo}</p>
          ))}
      </div>
    </div>
  );
}
