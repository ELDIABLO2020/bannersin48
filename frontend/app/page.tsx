import { Hero } from "@/components/home/Hero";
import { UseCaseMarquee } from "@/components/home/UseCaseMarquee";
import { PopularSizes } from "@/components/home/PopularSizes";
import { HowItWorks } from "@/components/home/HowItWorks";
import { MaterialsBand } from "@/components/home/MaterialsBand";
import { IndustriesGrid } from "@/components/home/IndustriesGrid";
import { Testimonials } from "@/components/home/Testimonials";
import { GuaranteePanel } from "@/components/home/GuaranteePanel";
import { FAQ } from "@/components/home/FAQ";
import { EmailCapture } from "@/components/home/EmailCapture";

export default function HomePage() {
  return (
    <>
      <Hero />
      <UseCaseMarquee />
      <PopularSizes />
      <HowItWorks />
      <MaterialsBand />
      <IndustriesGrid />
      <Testimonials />
      <GuaranteePanel />
      <FAQ />
      <EmailCapture />
    </>
  );
}
