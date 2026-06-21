import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const LOGO_WIDTH = 500;
const LOGO_HEIGHT = 150;

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  /** Light backing for dark surfaces where navy logo text would not contrast. */
  onDark?: boolean;
};

export function BrandLogo({
  className,
  imageClassName,
  priority = false,
  onDark = false,
}: BrandLogoProps) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex shrink-0 items-center no-underline",
        onDark && "rounded-md bg-white px-sm py-xs",
        className,
      )}
      aria-label="Banners In 48 home"
    >
      <Image
        src="/images/logo.png"
        alt="Banners In 48"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        priority={priority}
        className={cn("h-10 w-auto", imageClassName)}
      />
    </Link>
  );
}
