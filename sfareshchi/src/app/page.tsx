import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/sections/hero";
import { Benefits } from "@/components/sections/benefits";
import { HowItWorks } from "@/components/sections/how-it-works";
import { DmMockup } from "@/components/sections/dm-mockup";
import { Features } from "@/components/sections/features";
import { PanelPreview } from "@/components/sections/panel-preview";
import { Pricing } from "@/components/sections/pricing";
import { Faq } from "@/components/sections/faq";
import { FinalCta } from "@/components/sections/final-cta";

export default function HomePage() {
  return (
    <>
      <a href="#main" className="skip-link">
        رفتن به محتوای اصلی
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Benefits />
        <HowItWorks />
        <DmMockup />
        <Features />
        <PanelPreview />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
