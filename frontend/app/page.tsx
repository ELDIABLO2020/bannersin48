import { Hero } from "@/components/home/Hero";
import { UseCaseMarquee } from "@/components/home/UseCaseMarquee";
import { QuickActions } from "@/components/home/QuickActions";
import { PopularSizes } from "@/components/home/PopularSizes";
import { MaterialsBand } from "@/components/home/MaterialsBand";
import { HowItWorks } from "@/components/home/HowItWorks";
import { GuaranteePanel } from "@/components/home/GuaranteePanel";
import { Reviews } from "@/components/home/Reviews";
import { FAQ } from "@/components/home/FAQ";
import { EmailCapture } from "@/components/home/EmailCapture";

export default function HomePage() {
  return (
    <>
      <Hero />
      <UseCaseMarquee />
      <QuickActions />
      <PopularSizes />
      <MaterialsBand />
      <HowItWorks />
      <GuaranteePanel />
      <Reviews />
      <FAQ />
      <EmailCapture />
    </>
  );
}
