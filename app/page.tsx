import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Hero from "@/components/public/hero";
import HowItWorks from "@/components/public/how-it-works";
import MarketingEngine from "@/components/public/marketing-engine";
import OfferOptimizer from "@/components/public/offer-optimizer";
import PresentationBuilder from "@/components/public/presentation-builder";
import FollowUpEngine from "@/components/public/follow-up-engine";
import DashboardPreview from "@/components/public/dashboard-preview";
import FounderLetter from "@/components/public/founder-letter";
import Pricing from "@/components/public/pricing";
import FAQ from "@/components/public/faq";
import FinalCTA from "@/components/public/final-cta";

export default async function HomePage() {
    const user = await getCurrentUser();

    if (user) {
        redirect("/funnel-builder");
    }

    return (
        <div className="min-h-screen">
            <Hero />
            <HowItWorks />
            <MarketingEngine />
            <OfferOptimizer />
            <PresentationBuilder />
            <FollowUpEngine />
            <DashboardPreview />
            <FounderLetter />
            <Pricing />
            <FAQ />
            <FinalCTA />
        </div>
    );
}
