/** Curated placeholder images for homepage sections (replace with production assets). */
export type PlaceholderAsset = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export const placeholders = {
  hero: {
    src: "/images/hero-banner-context.png",
    alt: "Finished vinyl banner installed above a retail storefront entrance",
    width: 1200,
    height: 900,
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
  catalogHdpe: {
    src: "/images/catalog/hdpe.jpg",
    alt: "Lightweight outdoor banner on a yard frame at a suburban home",
    width: 1600,
    height: 900,
  },
  catalogCanvas: {
    src: "/images/catalog/canvas.jpg",
    alt: "Framed canvas print hanging on a gallery wall",
    width: 1600,
    height: 900,
  },
  catalogMesh: {
    src: "/images/catalog/mesh.jpg",
    alt: "Perforated mesh banner on a chain-link construction fence",
    width: 1600,
    height: 900,
  },
  catalogPoster: {
    src: "/images/catalog/poster.jpg",
    alt: "Indoor retail poster displayed in a cafe window",
    width: 1600,
    height: 900,
  },
  catalogNoCurl: {
    src: "/images/catalog/no-curl.jpg",
    alt: "Lay-flat no-curl banner on a trade-show table display",
    width: 1600,
    height: 900,
  },
  catalogEconostand: {
    src: "/images/catalog/econostand.jpg",
    alt: "Indoor banner stand in a corporate lobby",
    width: 1600,
    height: 900,
  },
} as const satisfies Record<string, PlaceholderAsset>;

export type PlaceholderKey = keyof typeof placeholders;
