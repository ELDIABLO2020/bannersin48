import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The design-token preset defines custom font sizes (`text-body`, `text-heading-h4`, …).
 * tailwind-merge cannot tell those from text colors, so it groups them together and
 * keeps only the last one — silently dropping a color like `text-strong-accent-text`
 * whenever a size class follows it. Declaring the scale keeps the two groups apart.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "hero-h1",
            "section-h2",
            "heading-h4",
            "heading-h5",
            "body",
            "body-sm",
            "input",
            "list-item",
          ],
        },
      ],
    },
  },
});

/** Combine class names with tailwind-merge dedup. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
