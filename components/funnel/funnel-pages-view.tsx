/**
 * Funnel Pages View Component
 *
 * Displays all pages (enrollment, watch, registration) for a specific funnel.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Edit } from "lucide-react";
import Link from "next/link";

interface Page {
    id: string;
    type: "enrollment" | "watch" | "registration";
    headline: string;
    is_published: boolean;
    vanity_slug: string | null;
    created_at: string;
    updated_at: string;
}

interface FunnelPagesViewProps {
    projectId: string;
    username: string;
}

export function FunnelPagesView({ projectId, username }: FunnelPagesViewProps) {
    const [pages, setPages] = useState<Page[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPages = useCallback(async () => {
        setLoading(true);
        try {
            const supabase = createClient();

            const [enrollmentResult, watchResult, registrationResult] =
                await Promise.all([
                    supabase
                        .from("enrollment_pages")
                        .select(
                            "id, headline, is_published, vanity_slug, created_at, updated_at"
                        )
                        .eq("funnel_project_id", projectId),
                    supabase
                        .from("watch_pages")
                        .select(
                            "id, headline, is_published, vanity_slug, created_at, updated_at"
                        )
                        .eq("funnel_project_id", projectId),
                    supabase
                        .from("registration_pages")
                        .select(
                            "id, headline, is_published, vanity_slug, created_at, updated_at"
                        )
                        .eq("funnel_project_id", projectId),
                ]);

            const allPages: Page[] = [];

            if (enrollmentResult.data) {
                enrollmentResult.data.forEach((page) => {
                    allPages.push({ ...page, type: "enrollment" });
                });
            }

            if (watchResult.data) {
                watchResult.data.forEach((page) => {
                    allPages.push({ ...page, type: "watch" });
                });
            }

            if (registrationResult.data) {
                registrationResult.data.forEach((page) => {
                    allPages.push({ ...page, type: "registration" });
                });
            }

            allPages.sort(
                (a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setPages(allPages);
        } catch (error) {
            logger.error({ error, projectId }, "Failed to load funnel pages");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadPages();
    }, [loadPages]);

    const getPageUrl = (page: Page): string => {
        if (page.vanity_slug) {
            return `/${username}/${page.vanity_slug}`;
        }
        return `/p/${page.id}`;
    };

    const getEditUrl = (page: Page): string => {
        const stepMap = {
            enrollment: 5,
            watch: 8,
            registration: 9,
        };
        return `/funnel-builder/${projectId}/step/${stepMap[page.type]}`;
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-20 animate-pulse rounded-lg bg-gray-200"
                    />
                ))}
            </div>
        );
    }

    if (pages.length === 0) {
        return (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
                <h3 className="text-lg font-semibold text-foreground">No Pages Yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Complete the funnel builder steps to create your pages.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {pages.map((page) => (
                <div
                    key={page.id}
                    className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-foreground">
                                    {page.headline}
                                </h3>
                                <Badge
                                    variant={
                                        page.is_published ? "default" : "secondary"
                                    }
                                >
                                    {page.is_published ? "Published" : "Draft"}
                                </Badge>
                                <Badge variant="outline">
                                    {page.type === "enrollment"
                                        ? "Enrollment"
                                        : page.type === "watch"
                                          ? "Watch"
                                          : "Registration"}
                                </Badge>
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                                <span>
                                    Created{" "}
                                    {new Date(page.created_at).toLocaleDateString()}
                                </span>
                                {page.vanity_slug && (
                                    <span className="text-primary">
                                        /{username}/{page.vanity_slug}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link href={getEditUrl(page)}>
                                <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                </Button>
                            </Link>
                            {page.is_published && (
                                <Link href={getPageUrl(page)} target="_blank">
                                    <Button variant="outline" size="sm">
                                        <ExternalLink className="h-4 w-4 mr-1" />
                                        View
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
