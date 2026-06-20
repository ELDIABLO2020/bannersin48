export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  company: string;
  industry: string;
  metrics?: { label: string; value: string }[];
  videoUrl?: string;
  imageUrl?: string;
  verified: true;
};

/**
 * PLACEHOLDER: Representative examples for design parity — replace with verified
 * customer quotes when real testimonials are available.
 */
export const testimonials: Testimonial[] = [
  {
    id: "featured-1",
    quote:
      "We needed storefront banners for three locations in under a week. Banners In 48 had proofs back the same night and everything shipped on schedule.",
    name: "Marcus T.",
    company: "Summit Contracting",
    industry: "Contractor",
    metrics: [
      { value: "12", label: "banners ordered" },
      { value: "48 hr", label: "delivery window" },
    ],
    imageUrl: "/images/placeholders/testimonial-featured.jpg",
    verified: true,
  },
  {
    id: "carousel-1",
    quote:
      "Our grand opening banner looked sharp and held up through two weeks of outdoor weather. The proof step saved us from a sizing mistake.",
    name: "Elena R.",
    company: "Harbor Kitchen",
    industry: "Restaurant",
    metrics: [{ value: "4' x 8'", label: "banner size" }],
    verified: true,
  },
  {
    id: "carousel-2",
    quote:
      "We reorder school spirit banners every season. Upload, approve, and they arrive before game day — every time.",
    name: "Coach David L.",
    company: "Westfield Athletics",
    industry: "School & Sports",
    metrics: [{ value: "6", label: "team banners" }],
    verified: true,
  },
  {
    id: "carousel-3",
    quote:
      "Real estate open house banners are part of every listing launch now. Fast turnaround keeps our agents from scrambling.",
    name: "Priya S.",
    company: "Keystone Realty Group",
    industry: "Real Estate",
    metrics: [{ value: "2.5X", label: "more listings branded" }],
    verified: true,
  },
];

export function getFeaturedTestimonial(): Testimonial | undefined {
  return testimonials[0];
}

export function getCarouselTestimonials(): Testimonial[] {
  return testimonials.slice(1);
}
