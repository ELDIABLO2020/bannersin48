/** Curated placeholder images for homepage sections (replace with production assets). */
export type PlaceholderAsset = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export const placeholders = {
  hero: {
    src: "/images/hero-print-workshop.png",
    alt: "Large-format vinyl banner being printed in a professional print shop",
    width: 1200,
    height: 900,
  },
  pillarOrder: {
    src: "/images/placeholders/pillar-order.jpg",
    alt: "Banner size and quantity selection screen",
    width: 800,
    height: 600,
  },
  pillarMaterials: {
    src: "/images/placeholders/pillar-materials.jpg",
    alt: "Vinyl material options for outdoor banners",
    width: 800,
    height: 600,
  },
  pillarProof: {
    src: "/images/placeholders/pillar-proof.jpg",
    alt: "Digital proof approval preview for a custom banner",
    width: 800,
    height: 600,
  },
  pillarDeliver: {
    src: "/images/placeholders/pillar-deliver.jpg",
    alt: "FedEx package delivery of a rolled vinyl banner",
    width: 800,
    height: 600,
  },
  showcaseDesktop: {
    src: "/images/placeholders/showcase-desktop.jpg",
    alt: "Desktop banner ordering dashboard with storefront preview",
    width: 1200,
    height: 800,
  },
  showcaseMobile: {
    src: "/images/placeholders/showcase-mobile.jpg",
    alt: "Mobile banner order flow on a smartphone",
    width: 400,
    height: 800,
  },
  industryContractor: {
    src: "/images/placeholders/industry-contractor.jpg",
    alt: "Construction site with vinyl safety and branding banners",
    width: 600,
    height: 450,
  },
  industryRestaurant: {
    src: "/images/placeholders/industry-restaurant.jpg",
    alt: "Restaurant storefront with promotional vinyl banner",
    width: 600,
    height: 450,
  },
  industrySchool: {
    src: "/images/placeholders/industry-school.jpg",
    alt: "School sports field with team banner signage",
    width: 600,
    height: 450,
  },
  industryEvents: {
    src: "/images/placeholders/industry-events.jpg",
    alt: "Event venue entrance with large vinyl welcome banner",
    width: 600,
    height: 450,
  },
  industryBusiness: {
    src: "/images/placeholders/industry-business.jpg",
    alt: "Retail business window with promotional banner display",
    width: 600,
    height: 450,
  },
  industryRealEstate: {
    src: "/images/placeholders/industry-real-estate.jpg",
    alt: "Real estate open house yard sign and vinyl banner",
    width: 600,
    height: 450,
  },
  material13oz: {
    src: "/images/placeholders/material-13oz.jpg",
    alt: "13 oz matte vinyl banner material swatch",
    width: 600,
    height: 320,
  },
  material15oz: {
    src: "/images/placeholders/material-15oz.jpg",
    alt: "15 oz premium gloss vinyl banner material",
    width: 600,
    height: 320,
  },
  material18oz: {
    src: "/images/placeholders/material-18oz.jpg",
    alt: "18 oz blockout heavy-duty vinyl banner material",
    width: 600,
    height: 320,
  },
  flagshipProduction: {
    src: "/images/placeholders/flagship-production.jpg",
    alt: "Custom banner in production with proof approved status",
    width: 800,
    height: 800,
  },
  testimonialFeatured: {
    src: "/images/placeholders/testimonial-featured.jpg",
    alt: "Contractor reviewing a finished vinyl banner at a jobsite",
    width: 960,
    height: 540,
  },
  resourceHelp: {
    src: "/images/placeholders/resource-help.jpg",
    alt: "Artwork preparation guide for banner printing",
    width: 400,
    height: 240,
  },
  resourceFaq: {
    src: "/images/placeholders/resource-faq.jpg",
    alt: "Customer support and frequently asked questions",
    width: 400,
    height: 240,
  },
  resourceTemplates: {
    src: "/images/placeholders/resource-templates.jpg",
    alt: "Banner layout templates and design starting points",
    width: 400,
    height: 240,
  },
  resourceHowItWorks: {
    src: "/images/placeholders/resource-how-it-works.jpg",
    alt: "Step-by-step banner ordering process",
    width: 400,
    height: 240,
  },
} as const satisfies Record<string, PlaceholderAsset>;

export type PlaceholderKey = keyof typeof placeholders;
