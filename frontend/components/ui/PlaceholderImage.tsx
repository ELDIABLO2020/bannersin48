import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils/cn";

type PlaceholderImageProps = Omit<ImageProps, "alt"> & {
  alt: string;
  rounded?: "card" | "modal" | "none";
  /** Apply shared border + shadow frame around the image. */
  framed?: boolean;
  /** Soft brand gradient wash over the image. */
  overlay?: boolean;
};

export function PlaceholderImage({
  className,
  rounded = "card",
  framed = false,
  overlay = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  alt,
  ...props
}: PlaceholderImageProps) {
  const image = (
    <Image
      {...props}
      alt={alt}
      sizes={sizes}
      className={cn(
        "object-cover w-full h-full",
        !framed && rounded === "card" && "rounded-card",
        !framed && rounded === "modal" && "rounded-modal",
        className,
      )}
    />
  );

  if (!framed && !overlay) {
    return image;
  }

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden",
        framed && "border border-line shadow-elev-2",
        rounded === "card" && "rounded-card",
        rounded === "modal" && "rounded-modal",
      )}
    >
      {image}
      {overlay ? (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-darkest/10 via-transparent to-transparent"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
