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
 * Verified customer testimonials only. Components hide when this array is empty.
 * Add entries here when real, sourced quotes are available.
 */
export const testimonials: Testimonial[] = [];

export function getFeaturedTestimonial(): Testimonial | undefined {
  return testimonials[0];
}

export function getCarouselTestimonials(): Testimonial[] {
  return testimonials.slice(1);
}
