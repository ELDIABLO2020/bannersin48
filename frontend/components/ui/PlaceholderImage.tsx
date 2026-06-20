import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils/cn";

type PlaceholderImageProps = Omit<ImageProps, "alt"> & {
  alt: string;
  rounded?: "card" | "modal" | "none";
};

export function PlaceholderImage({
  className,
  rounded = "card",
  sizes = "(max-width: 768px) 100vw, 50vw",
  ...props
}: PlaceholderImageProps) {
  return (
    <Image
      {...props}
      sizes={sizes}
      className={cn(
        "object-cover w-full h-full",
        rounded === "card" && "rounded-card",
        rounded === "modal" && "rounded-modal",
        className,
      )}
    />
  );
}
