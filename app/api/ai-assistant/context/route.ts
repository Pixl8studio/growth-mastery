/**
 * AI Assistant Context API
 * Provides comprehensive context for the AI assistant
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "ai-assistant-context" });

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { projectId } = await request.json();

        // Load user profile
        const { data: profile } = await supabase
            .from("user_profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();

        // Load current project if specified
        let currentProject = null;
        if (projectId) {
            const { data: project } = await supabase
                .from("funnel_projects")
                .select("*")
                .eq("id", projectId)
                .eq("user_id", user.id)
                .single();

            if (project) {
                currentProject = {
                    id: project.id,
                    name: project.name,
                    slug: project.slug,
                    description: project.description,
                    targetAudience: project.target_audience,
                    businessNiche: project.business_niche,
                    status: project.status,
                    currentStep: project.current_step,
                };
            }
        }

        // Load all projects summary
        const { data: projects } = await supabase
            .from("funnel_projects")
            .select("id, name, status")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(10);

        // Load offers if project specified
        let offers: any[] = [];
        if (projectId) {
            const { data: offersData } = await supabase
                .from("offers")
                .select("id, name, price, description")
                .eq("funnel_project_id", projectId)
                .order("display_order", { ascending: true });

            offers = offersData || [];
        }

        // Load analytics summary
        let analytics = null;
        if (projectId) {
            const { count: contactCount } = await supabase
                .from("contacts")
                .select("*", { count: "exact", head: true })
                .eq("funnel_project_id", projectId);

            const { data: transactions } = await supabase
                .from("payment_transactions")
                .select("amount")
                .eq("funnel_project_id", projectId)
                .eq("status", "completed");

            const totalRevenue =
                transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

            analytics = {
                totalContacts: contactCount || 0,
                totalRevenue,
            };
        }

        // Build context
        const context = {
            user: {
                id: user.id,
                email: user.email,
                fullName: profile?.full_name,
            },
            currentProject,
            projects: projects || [],
            offers,
            analytics,
        };

        requestLogger.info(
            { userId: user.id, projectId },
            "Loaded AI assistant context"
        );

        return NextResponse.json({ context });
    } catch (error) {
        requestLogger.error({ error }, "Failed to load AI assistant context");
        return NextResponse.json({ error: "Failed to load context" }, { status: 500 });
    }
}
