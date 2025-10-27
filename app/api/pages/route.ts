/**
 * API endpoint for fetching all pages across funnels
 * Aggregates enrollment, watch, and registration pages
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PageListItem, PageType } from "@/types/pages";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse query params for filtering
        const searchParams = request.nextUrl.searchParams;
        const funnelId = searchParams.get("funnel_id");
        const pageType = searchParams.get("page_type");
        const isPublished = searchParams.get("is_published");

        // Fetch enrollment pages
        let enrollmentQuery = supabase
            .from("enrollment_pages")
            .select(
                "id, headline, funnel_project_id, is_published, vanity_slug, created_at, updated_at, funnel_projects(id, name)"
            )
            .eq("user_id", user.id);

        if (funnelId) {
            enrollmentQuery = enrollmentQuery.eq("funnel_project_id", funnelId);
        }
        if (isPublished && isPublished !== "all") {
            enrollmentQuery = enrollmentQuery.eq(
                "is_published",
                isPublished === "true"
            );
        }

        // Fetch watch pages
        let watchQuery = supabase
            .from("watch_pages")
            .select(
                "id, headline, funnel_project_id, is_published, vanity_slug, created_at, updated_at, funnel_projects(id, name)"
            )
            .eq("user_id", user.id);

        if (funnelId) {
            watchQuery = watchQuery.eq("funnel_project_id", funnelId);
        }
        if (isPublished && isPublished !== "all") {
            watchQuery = watchQuery.eq("is_published", isPublished === "true");
        }

        // Fetch registration pages
        let registrationQuery = supabase
            .from("registration_pages")
            .select(
                "id, headline, funnel_project_id, is_published, vanity_slug, created_at, updated_at, funnel_projects(id, name)"
            )
            .eq("user_id", user.id);

        if (funnelId) {
            registrationQuery = registrationQuery.eq("funnel_project_id", funnelId);
        }
        if (isPublished && isPublished !== "all") {
            registrationQuery = registrationQuery.eq(
                "is_published",
                isPublished === "true"
            );
        }

        // Execute all queries in parallel
        const [enrollmentResult, watchResult, registrationResult] = await Promise.all([
            enrollmentQuery,
            watchQuery,
            registrationQuery,
        ]);

        // Check for errors
        if (enrollmentResult.error) throw enrollmentResult.error;
        if (watchResult.error) throw watchResult.error;
        if (registrationResult.error) throw registrationResult.error;

        // Transform and merge results
        const pages: PageListItem[] = [];

        // Add enrollment pages
        if (
            enrollmentResult.data &&
            (!pageType || pageType === "all" || pageType === "enrollment")
        ) {
            enrollmentResult.data.forEach((page: any) => {
                if (page.funnel_projects) {
                    pages.push({
                        id: page.id,
                        type: "enrollment" as PageType,
                        headline: page.headline,
                        funnel_name: page.funnel_projects.name,
                        funnel_id: page.funnel_project_id,
                        is_published: page.is_published,
                        vanity_slug: page.vanity_slug,
                        created_at: page.created_at,
                        updated_at: page.updated_at,
                    });
                }
            });
        }

        // Add watch pages
        if (
            watchResult.data &&
            (!pageType || pageType === "all" || pageType === "watch")
        ) {
            watchResult.data.forEach((page: any) => {
                if (page.funnel_projects) {
                    pages.push({
                        id: page.id,
                        type: "watch" as PageType,
                        headline: page.headline,
                        funnel_name: page.funnel_projects.name,
                        funnel_id: page.funnel_project_id,
                        is_published: page.is_published,
                        vanity_slug: page.vanity_slug,
                        created_at: page.created_at,
                        updated_at: page.updated_at,
                    });
                }
            });
        }

        // Add registration pages
        if (
            registrationResult.data &&
            (!pageType || pageType === "all" || pageType === "registration")
        ) {
            registrationResult.data.forEach((page: any) => {
                if (page.funnel_projects) {
                    pages.push({
                        id: page.id,
                        type: "registration" as PageType,
                        headline: page.headline,
                        funnel_name: page.funnel_projects.name,
                        funnel_id: page.funnel_project_id,
                        is_published: page.is_published,
                        vanity_slug: page.vanity_slug,
                        created_at: page.created_at,
                        updated_at: page.updated_at,
                    });
                }
            });
        }

        // Sort by created_at descending (newest first)
        pages.sort(
            (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return NextResponse.json({ pages });
    } catch (error) {
        console.error("Error fetching pages:", error);
        return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 });
    }
}
