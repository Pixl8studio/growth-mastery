/**
 * Desktop Required Page
 * Centralized page for features that require desktop
 */

import { DesktopRequiredNotice } from "@/components/mobile/desktop-required-notice";
import { Suspense } from "react";

interface SearchParams {
    feature?: string;
    description?: string;
    returnPath?: string;
}

interface PageProps {
    searchParams: Promise<SearchParams>;
}

export const metadata = {
    title: "Desktop Required | GrowthMastery.ai",
    description: "This feature requires a desktop computer for the best experience.",
};

async function DesktopRequiredContent({ searchParams }: PageProps) {
    const params = await searchParams;
    const featureName = params.feature || "This Feature";
    const description =
        params.description ||
        "This feature requires a larger screen and full keyboard for the best experience.";
    const returnPath = params.returnPath || "/funnel-builder";

    return (
        <DesktopRequiredNotice
            featureName={featureName}
            description={description}
            returnPath={returnPath}
        />
    );
}

export default function DesktopRequiredPage(props: PageProps) {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            }
        >
            <DesktopRequiredContent {...props} />
        </Suspense>
    );
}
