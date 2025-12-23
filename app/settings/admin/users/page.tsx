/**
 * Admin Users List - Server Component
 * Fetches user data server-side with RLS enforcement and passes to client for interactivity
 */

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { parseUsersQuery } from "@/lib/admin/validation";

import UsersClient, { type UserListItem } from "./users-client";

interface AdminUsersPageProps {
    searchParams: Promise<{
        search?: string;
        sort?: string;
        order?: string;
        filter?: string;
    }>;
}

async function fetchUsers(): Promise<UserListItem[]> {
    const supabase = await createClient();
    const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

    // Fetch all data in parallel for improved performance
    // RLS policies enforce that only admins can access this data
    const [profilesResult, healthScoresResult, funnelsResult, costsResult] =
        await Promise.all([
            // Fetch all non-admin users
            supabase
                .from("user_profiles")
                .select(
                    `
                    id,
                    email,
                    full_name,
                    avatar_url,
                    role,
                    created_at,
                    updated_at
                `
                )
                .eq("role", "user")
                .order("created_at", { ascending: false }),
            // Fetch health scores
            supabase.from("user_health_scores").select("user_id, overall_score"),
            // Fetch funnel counts
            supabase.from("funnel_projects").select("user_id").is("deleted_at", null),
            // Fetch monthly costs
            supabase
                .from("api_usage_monthly")
                .select("user_id, total_cost_cents")
                .eq("month", currentMonth),
        ]);

    const { data: profiles, error: profilesError } = profilesResult;
    if (profilesError) {
        logger.error(
            { error: profilesError },
            "Failed to fetch user profiles for admin users list"
        );
        throw profilesError;
    }

    const { data: healthScores, error: healthError } = healthScoresResult;
    if (healthError) {
        logger.warn({ error: healthError }, "Failed to fetch health scores");
    }

    const healthMap = new Map(
        healthScores?.map((h) => [h.user_id, h.overall_score]) || []
    );

    const { data: funnels, error: funnelsError } = funnelsResult;
    if (funnelsError) {
        logger.warn({ error: funnelsError }, "Failed to fetch funnel counts");
    }

    const funnelCountMap = new Map<string, number>();
    funnels?.forEach((f) => {
        funnelCountMap.set(f.user_id, (funnelCountMap.get(f.user_id) || 0) + 1);
    });

    const { data: costs, error: costsError } = costsResult;
    if (costsError) {
        logger.warn({ error: costsError }, "Failed to fetch monthly costs");
    }

    const costMap = new Map<string, number>();
    costs?.forEach((c) => {
        costMap.set(c.user_id, (costMap.get(c.user_id) || 0) + c.total_cost_cents);
    });

    // Map to UserListItem
    return (profiles || []).map((p) => ({
        id: p.id,
        email: p.email,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        healthScore: healthMap.get(p.id) ?? null,
        funnelCount: funnelCountMap.get(p.id) || 0,
        lastActive: p.updated_at, // Approximation until activity tracking is implemented
        monthlyCostCents: costMap.get(p.id) || 0,
        hasErrors: false, // Would need Sentry integration
    }));
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
    // Await searchParams as required by Next.js 15+
    const params = await searchParams;

    // Validate and parse query parameters
    const validatedParams = parseUsersQuery(params);

    // Fetch users server-side with RLS enforcement
    const users = await fetchUsers();

    return (
        <UsersClient
            users={users}
            initialSort={validatedParams.sort}
            initialOrder={validatedParams.order}
            initialFilter={validatedParams.filter}
            initialSearch={validatedParams.search || ""}
        />
    );
}
