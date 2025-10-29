/**
 * Business Context Aggregator
 * Fetches and formats user's business data for AI assistant
 */

import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";

export interface BusinessContext {
    // User info
    user: {
        id: string;
        email: string;
        fullName?: string;
    };

    // Current project
    currentProject?: {
        id: string;
        name: string;
        slug: string;
        description?: string;
        targetAudience?: string;
        businessNiche?: string;
        status: string;
        currentStep: number;
    };

    // All projects summary
    projects: Array<{
        id: string;
        name: string;
        status: string;
    }>;

    // Offers
    offers: Array<{
        id: string;
        name: string;
        price?: number;
        description?: string;
    }>;

    // Analytics summary
    analytics?: {
        totalContacts: number;
        totalRevenue: number;
        conversionRate: number;
        recentActivity: string;
    };

    // Recent activity
    recentActivity: Array<{
        type: string;
        description: string;
        timestamp: string;
    }>;
}

/**
 * Load comprehensive business context for AI assistant
 */
export async function loadBusinessContext(
    projectId?: string
): Promise<{ success: boolean; context?: BusinessContext; error?: string }> {
    try {
        const supabase = createClient();

        // Get authenticated user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: "Not authenticated" };
        }

        // Load user profile
        const { data: profile } = await supabase
            .from("user_profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();

        // Load all projects
        const { data: projects, error: projectsError } = await supabase
            .from("funnel_projects")
            .select(
                "id, name, slug, description, target_audience, business_niche, status, current_step"
            )
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false });

        if (projectsError) {
            logger.error({ error: projectsError }, "Failed to load projects");
        }

        // Find current project
        let currentProject = undefined;
        if (projectId && projects) {
            const project = projects.find((p) => p.id === projectId);
            if (project) {
                currentProject = {
                    id: project.id,
                    name: project.name,
                    slug: project.slug,
                    description: project.description || undefined,
                    targetAudience: project.target_audience || undefined,
                    businessNiche: project.business_niche || undefined,
                    status: project.status,
                    currentStep: project.current_step,
                };
            }
        }

        // Load offers for current project
        let offers: any[] = [];
        if (projectId) {
            const { data: offersData } = await supabase
                .from("offers")
                .select("id, name, price, description")
                .eq("funnel_project_id", projectId)
                .order("display_order", { ascending: true });

            if (offersData) {
                offers = offersData.map((o) => ({
                    id: o.id,
                    name: o.name,
                    price: o.price || undefined,
                    description: o.description || undefined,
                }));
            }
        }

        // Load analytics summary (simplified for now)
        let analytics = undefined;
        if (projectId) {
            // Get contact count
            const { count: contactCount } = await supabase
                .from("contacts")
                .select("*", { count: "exact", head: true })
                .eq("funnel_project_id", projectId);

            // Get revenue
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
                conversionRate: 0, // TODO: Calculate properly
                recentActivity: "Active", // TODO: Determine based on recent events
            };
        }

        // Build context
        const context: BusinessContext = {
            user: {
                id: user.id,
                email: user.email || "",
                fullName: profile?.full_name || undefined,
            },
            currentProject,
            projects:
                projects?.map((p) => ({
                    id: p.id,
                    name: p.name,
                    status: p.status,
                })) || [],
            offers,
            analytics,
            recentActivity: [], // TODO: Load from activity log
        };

        return { success: true, context };
    } catch (error) {
        logger.error({ error }, "Failed to load business context");
        return { success: false, error: "Failed to load business context" };
    }
}

/**
 * Format business context for AI assistant prompt
 */
export function formatBusinessContextForPrompt(context: BusinessContext): string {
    const parts: string[] = [];

    parts.push("=== USER BUSINESS CONTEXT ===\n");

    // User info
    parts.push(`User: ${context.user.fullName || context.user.email}`);
    parts.push(`Email: ${context.user.email}`);

    // Current project
    if (context.currentProject) {
        parts.push(`\nCurrent Project: ${context.currentProject.name}`);
        parts.push(`Status: ${context.currentProject.status}`);
        parts.push(`Progress: Step ${context.currentProject.currentStep}`);

        if (context.currentProject.businessNiche) {
            parts.push(`Business Niche: ${context.currentProject.businessNiche}`);
        }

        if (context.currentProject.targetAudience) {
            parts.push(`Target Audience: ${context.currentProject.targetAudience}`);
        }

        if (context.currentProject.description) {
            parts.push(`Description: ${context.currentProject.description}`);
        }
    }

    // Offers
    if (context.offers.length > 0) {
        parts.push("\nOffers:");
        context.offers.forEach((offer) => {
            const price = offer.price ? ` - $${offer.price}` : "";
            parts.push(`  - ${offer.name}${price}`);
            if (offer.description) {
                parts.push(`    ${offer.description}`);
            }
        });
    }

    // Analytics
    if (context.analytics) {
        parts.push("\nPerformance:");
        parts.push(`  - Total Contacts: ${context.analytics.totalContacts}`);
        parts.push(`  - Total Revenue: $${context.analytics.totalRevenue.toFixed(2)}`);
        if (context.analytics.conversionRate > 0) {
            parts.push(
                `  - Conversion Rate: ${context.analytics.conversionRate.toFixed(1)}%`
            );
        }
    }

    // Other projects
    if (context.projects.length > 1) {
        parts.push(`\nOther Projects (${context.projects.length - 1}):`);
        context.projects
            .filter((p) => p.id !== context.currentProject?.id)
            .slice(0, 5)
            .forEach((p) => {
                parts.push(`  - ${p.name} (${p.status})`);
            });
    }

    parts.push("\n=== END BUSINESS CONTEXT ===");

    return parts.join("\n");
}
