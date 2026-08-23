/**
 * Phase 0 seed — idempotent (safe to re-run).
 *
 * Creates:
 *  - super-admin user (ADMIN_EMAIL / ADMIN_PASSWORD env, with local defaults)
 *  - full product catalog matching @bannersin48/shared configs & rates
 *  - finishing options, a sample volume tier
 *  - sample site_content blocks
 */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import {
  PRODUCTS,
  BANNER_HUB_ORDER,
  ADDON_RATES,
  WEBBING_PER_WIDTH_FT_PER_EDGE_USD,
} from "@bannersin48/shared";

const prisma = new PrismaClient();

async function seedAdmin(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? "admin@bannersin48.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {}, // never clobber an existing admin password on re-seed
    create: {
      email,
      passwordHash,
      firstName: "Site",
      lastName: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  console.log(`✔ admin user ready (${email})`);
}

interface ProductSeedSpec {
  code: string;
  sort: number;
}

async function seedCatalog(): Promise<void> {
  const specs: ProductSeedSpec[] = [
    ...BANNER_HUB_ORDER.map((code, i) => ({ code, sort: i })),
    { code: "RETRACTABLE", sort: BANNER_HUB_ORDER.length },
  ];

  for (const { code, sort } of specs) {
    const p = PRODUCTS[code as keyof typeof PRODUCTS];

    const product = await prisma.product.upsert({
      where: { code },
      update: {
        name: p.title,
        slug: p.slug,
        sizeMode: p.sizeMode === "fixed" ? "FIXED" : "CUSTOM",
        fixedWidthIn: p.fixedSizeIn ? p.fixedSizeIn.widthIn.toFixed(2) : null,
        fixedHeightIn: p.fixedSizeIn ? p.fixedSizeIn.heightIn.toFixed(2) : null,
        minWidthIn: p.limits.minAxisIn,
        minHeightIn: p.limits.minAxisIn,
        shortSideMaxIn: p.limits.maxShortSideIn ?? null,
        maxBillableFt: p.limits.maxBillableFt ?? null,
        displayConfig: {
          title: p.title,
          subtitle: p.subtitle,
          hasMoreInfo: p.hasMoreInfo,
          // RETRACTABLE is orderable but is not part of the banner-hub grid.
          inHub: BANNER_HUB_ORDER.includes(code as never),
          hubCopy: p.hubCopy,
          defaultSize: p.defaultSize,
          printSides: p.printSides,
        },
        sort,
        active: true,
      },
      create: {
        code,
        name: p.title,
        slug: p.slug,
        sizeMode: p.sizeMode === "fixed" ? "FIXED" : "CUSTOM",
        fixedWidthIn: p.fixedSizeIn ? p.fixedSizeIn.widthIn.toFixed(2) : null,
        fixedHeightIn: p.fixedSizeIn ? p.fixedSizeIn.heightIn.toFixed(2) : null,
        minWidthIn: p.limits.minAxisIn,
        minHeightIn: p.limits.minAxisIn,
        shortSideMaxIn: p.limits.maxShortSideIn ?? null,
        maxBillableFt: p.limits.maxBillableFt ?? null,
        productionHours: p.sizeMode === "custom" ? 48 : null,
        displayConfig: {
          title: p.title,
          subtitle: p.subtitle,
          hasMoreInfo: p.hasMoreInfo,
          inHub: BANNER_HUB_ORDER.includes(code as never),
          hubCopy: p.hubCopy,
          defaultSize: p.defaultSize,
          printSides: p.printSides,
        },
        sort,
      },
    });

    // Materials offered on this product, rates straight from the shared engine.
    let materialSort = 0;
    for (const matCode of p.materials) {
      const rate = p.ratePerSqFt(matCode);
      await prisma.productMaterial.upsert({
        where: { productId_code: { productId: product.id, code: matCode } },
        update: {
          name: matCode,
          ratePerSqft: rate.toFixed(2),
          flatPriceUsd: p.flatPriceUsd != null ? p.flatPriceUsd.toFixed(2) : null,
          active: true,
          sort: materialSort,
        },
        create: {
          productId: product.id,
          code: matCode,
          name: matCode,
          ratePerSqft: rate.toFixed(2),
          flatPriceUsd: p.flatPriceUsd != null ? p.flatPriceUsd.toFixed(2) : null,
          doubleSideMultiplier: matCode === "VINYL_18OZ_DOUBLE" ? 1 : 1,
          sort: materialSort++,
        },
      });
    }
    console.log(`✔ product ${p.title} (${p.materials.length} materials)`);
  }
}

async function seedFinishingOptions(): Promise<void> {
  const options = [
    { code: "welding", name: "Welded edges", priceModel: "FREE" as const, amount: "0" },
    { code: "grommets", name: "Grommets", priceModel: "FREE" as const, amount: "0" },
    { code: "rope", name: "Rope", priceModel: "PER_SQFT" as const, amount: ADDON_RATES.ROPE_PER_SQFT.toFixed(2) },
    {
      code: "wind_slits",
      name: "Wind slits",
      priceModel: "PER_SQFT" as const,
      amount: ADDON_RATES.WIND_SLITS_PER_SQFT.toFixed(2),
    },
    {
      code: "pole_pockets",
      name: "Pole pockets",
      priceModel: "PER_SQFT" as const,
      amount: ADDON_RATES.POLE_POCKETS_PER_SQFT.toFixed(2),
    },
    {
      code: "webbing",
      name: "Webbing reinforcement",
      priceModel: "PER_FT" as const,
      amount: WEBBING_PER_WIDTH_FT_PER_EDGE_USD.toFixed(2),
    },
  ];

  for (let i = 0; i < options.length; i++) {
    const opt = options[i]!;
    const appliesTo = Object.values(PRODUCTS)
      .filter((p) => {
        switch (opt.code) {
          case "welding":
            return p.dock.welding || p.dock.grommets;
          case "grommets":
            return p.dock.welding || p.dock.grommets;
          case "rope":
            return p.dock.rope;
          case "wind_slits":
            return p.dock.windSlits;
          case "pole_pockets":
            return p.dock.polePockets;
          case "webbing":
            return p.dock.webbing;
          default:
            return false;
        }
      })
      .map((p) => p.id);

    await prisma.finishingOption.upsert({
      where: { code: opt.code },
      update: { amount: opt.amount, products: appliesTo, active: true, sort: i },
      create: { ...opt, products: appliesTo, sort: i },
    });
  }
  console.log(`✔ ${options.length} finishing options`);
}

async function seedVolumeTiers(): Promise<void> {
  const hdBanner = await prisma.product.findUnique({ where: { code: "HD_BANNER" } });
  if (!hdBanner) return;

  const existing = await prisma.volumeTier.findFirst({
    where: { productId: hdBanner.id, minBillableSqft: 100 },
  });
  if (!existing) {
    await prisma.volumeTier.create({
      data: {
        productId: hdBanner.id,
        materialCode: null,
        minBillableSqft: 100,
        rates: {
          VINYL_13OZ_SINGLE: 3.6,
          VINYL_15OZ_SINGLE: 4.28,
          VINYL_18OZ_SINGLE: 4.73,
          VINYL_18OZ_DOUBLE: 6.75,
        },
        warningCopy: "Volume discount applied automatically at 100+ billable square feet.",
      },
    });
    console.log("✔ sample volume tier (HD Banner 100+ sqft)");
  }
}

async function seedSiteContent(): Promise<void> {
  const blocks = [
    {
      key: "home_hero",
      blockType: "BANNER_IMAGE" as const,
      payload: { imageUrl: "/images/home-hero.jpg", altText: "Custom banners shipped in 48 hours", headline: "Banners In 48" },
    },
    {
      key: "promo_strip",
      blockType: "PROMO_STRIP" as const,
      payload: { text: "Free shipping on every banner — always $10/flat per unit.", linkHref: "/order/hd-banner" },
    },
    {
      key: "announcement",
      blockType: "ANNOUNCEMENT" as const,
      payload: { text: "Order by 9 PM ET for our 48-hour turnaround schedule.", enabled: true },
    },
  ];

  for (const block of blocks) {
    await prisma.siteContent.upsert({
      where: { key: block.key },
      update: {},
      create: { ...block, published: true },
    });
  }
  console.log(`✔ ${blocks.length} site content blocks`);
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedCatalog();
  await seedFinishingOptions();
  await seedVolumeTiers();
  await seedSiteContent();
}

main()
  .then(() => {
    console.log("Seed complete.");
    return prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
