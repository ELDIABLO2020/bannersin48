import { Hero } from "@/components/home/Hero";
import { UseCaseMarquee } from "@/components/home/UseCaseMarquee";
import { FeaturePillars } from "@/components/home/FeaturePillars";
import { SocialProofBand } from "@/components/home/SocialProofBand";
import { PopularSizes } from "@/components/home/PopularSizes";
import { MaterialsBand } from "@/components/home/MaterialsBand";
import { FeaturedTestimonial } from "@/components/home/FeaturedTestimonial";
import { FlagshipBand } from "@/components/home/FlagshipBand";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ProductShowcase } from "@/components/home/ProductShowcase";
import { IndustriesGrid } from "@/components/home/IndustriesGrid";
import { GuaranteePanel } from "@/components/home/GuaranteePanel";
import { TestimonialsCarousel } from "@/components/home/TestimonialsCarousel";
import { ResourcesBand } from "@/components/home/ResourcesBand";
import { FAQ } from "@/components/home/FAQ";
import { EmailCapture } from "@/components/home/EmailCapture";
import { ContactBand } from "@/components/home/ContactBand";

export default function HomePage() {
  return (
    <>
      <Hero />
      <UseCaseMarquee />
      <FeaturePillars />
      <SocialProofBand />
      <PopularSizes />
      <MaterialsBand />
      <FeaturedTestimonial />
      <FlagshipBand />
      <HowItWorks />
      <ProductShowcase />
      <IndustriesGrid />
      <GuaranteePanel />
      <TestimonialsCarousel />
      <ResourcesBand />
      <FAQ />
      <EmailCapture />
      <ContactBand />
    </>
  );
}
