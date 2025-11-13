/**
 * Pages List Page
 * Displays all enrollment, watch, and registration pages across all funnels
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { PagesFilterBar } from "@/components/pages/pages-filter-bar";
import { PagesTable } from "@/components/pages/pages-table";
import type { PageListItem, FunnelOption } from "@/types/pages";

async function getPages(searchParams: Record<string, string | undefined>) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?redirect=/pages");
    }

    // Get username for URL construction
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("username")
        .eq("id", user.id)
        .single();

    const username = profile?.username || user.id;

    const funnelId = searchParams.funnel_id;
    const pageType = searchParams.page_type;
    const isPublished = searchParams.is_published;

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
        enrollmentQuery = enrollmentQuery.eq("is_published", isPublished === "true");
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
                    type: "enrollment",
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
    if (watchResult.data && (!pageType || pageType === "all" || pageType === "watch")) {
        watchResult.data.forEach((page: any) => {
            if (page.funnel_projects) {
                pages.push({
                    id: page.id,
                    type: "watch",
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
                    type: "registration",
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
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return { pages, username };
}

async function getFunnels() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return [];
    }

    const { data, error } = await supabase
        .from("funnel_projects")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching funnels:", error);
        return [];
    }

    return data as FunnelOption[];
}

async function PagesContent({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const resolvedParams = await searchParams;
    const [pagesData, funnels] = await Promise.all([
        getPages(resolvedParams),
        getFunnels(),
    ]);
    const { pages, username } = pagesData;

    // Client-side search filtering
    const searchQuery = resolvedParams.search?.toLowerCase();
    const filteredPages = searchQuery
        ? pages.filter((page) => page.headline.toLowerCase().includes(searchQuery))
        : pages;

    return (
        <>
            <PagesFilterBar funnels={funnels} />
            <PagesTable pages={filteredPages} username={username} />
        </>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                        <div className="h-4 w-16 animate-pulse rounded bg-muted/50" />
                        <div className="h-10 animate-pulse rounded-md bg-card/80 backdrop-blur-sm shadow-soft" />
                    </div>
                ))}
            </div>
            <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-soft p-8">
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            className="h-16 animate-pulse rounded bg-muted/50"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default async function PagesPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    return (
        <div className="min-h-screen gradient-hero">
            <Header />

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8 animate-fade-in">
                    <h1 className="text-3xl font-bold text-foreground">Pages</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        View and manage all your pages across all funnels
                    </p>
                </div>

                <div className="space-y-6">
                    <Suspense fallback={<LoadingSkeleton />}>
                        <PagesContent searchParams={searchParams} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
