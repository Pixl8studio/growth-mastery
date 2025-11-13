/**
 * AI Followup Global Dashboard
 *
 * Comprehensive view of all prospects, conversations, and analytics
 * across all funnels for the authenticated user.
 */

import { getCurrentUserWithProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { AIFollowupDashboard } from "@/components/followup/ai-followup-dashboard";

export const metadata = {
    title: "AI Followup - Growth Mastery AI",
    description: "Global view of all AI-powered followup conversations and analytics",
};

export default async function AIFollowupPage() {
    const { user } = await getCurrentUserWithProfile();

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen gradient-hero">
            <Header />

            <main>
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="mb-8 animate-fade-in">
                        <h1 className="text-3xl font-bold text-foreground">
                            AI Followup
                        </h1>
                        <p className="mt-2 text-lg text-muted-foreground">
                            Global overview of all conversations, engagement, and
                            conversions across your funnels
                        </p>
                    </div>

                    <AIFollowupDashboard userId={user.id} />
                </div>
            </main>
        </div>
    );
}
