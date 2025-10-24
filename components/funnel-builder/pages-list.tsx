"use client";

/**
 * Pages list component for funnel builder
 * Displays all pages (registration, watch, enrollment) with publish toggles and share buttons
 */

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublishToggle } from "@/components/pages/publish-toggle";
import { ShareButton } from "@/components/pages/share-button";
import { formatDate } from "@/lib/utils";
import { ExternalLink, Edit } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import Link from "next/link";

interface PageData {
    id: string;
    type: "registration" | "watch" | "enrollment";
    headline: string;
    projectName: string;
    projectId: string;
    vanitySlug: string | null;
    isPublished: boolean;
    updatedAt: string;
    stepNumber: number;
}

interface PagesListProps {
    userId: string;
    username: string;
}

export function PagesList({ userId, username }: PagesListProps) {
    const [pages, setPages] = useState<PageData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchPages();
    }, [userId]);

    const fetchPages = async () => {
        setIsLoading(true);
        const supabase = createClient();

        try {
            const [registrationResult, watchResult, enrollmentResult] =
                await Promise.all([
                    supabase
                        .from("registration_pages")
                        .select(
                            "id, headline, vanity_slug, is_published, updated_at, funnel_projects(id, name)"
                        )
                        .eq("user_id", userId)
                        .order("updated_at", { ascending: false }),
                    supabase
                        .from("watch_pages")
                        .select(
                            "id, headline, vanity_slug, is_published, updated_at, funnel_projects(id, name)"
                        )
                        .eq("user_id", userId)
                        .order("updated_at", { ascending: false }),
                    supabase
                        .from("enrollment_pages")
                        .select(
                            "id, headline, vanity_slug, is_published, updated_at, funnel_projects(id, name)"
                        )
                        .eq("user_id", userId)
                        .order("updated_at", { ascending: false }),
                ]);

            const allPages: PageData[] = [];

            registrationResult.data?.forEach((page: any) => {
                allPages.push({
                    id: page.id,
                    type: "registration",
                    headline: page.headline || "Untitled Registration Page",
                    projectName: page.funnel_projects?.name || "Unknown Project",
                    projectId: page.funnel_projects?.id || "",
                    vanitySlug: page.vanity_slug,
                    isPublished: page.is_published,
                    updatedAt: page.updated_at,
                    stepNumber: 9,
                });
            });

            watchResult.data?.forEach((page: any) => {
                allPages.push({
                    id: page.id,
                    type: "watch",
                    headline: page.headline || "Untitled Watch Page",
                    projectName: page.funnel_projects?.name || "Unknown Project",
                    projectId: page.funnel_projects?.id || "",
                    vanitySlug: page.vanity_slug,
                    isPublished: page.is_published,
                    updatedAt: page.updated_at,
                    stepNumber: 8,
                });
            });

            enrollmentResult.data?.forEach((page: any) => {
                allPages.push({
                    id: page.id,
                    type: "enrollment",
                    headline: page.headline || "Untitled Enrollment Page",
                    projectName: page.funnel_projects?.name || "Unknown Project",
                    projectId: page.funnel_projects?.id || "",
                    vanitySlug: page.vanity_slug,
                    isPublished: page.is_published,
                    updatedAt: page.updated_at,
                    stepNumber: 5,
                });
            });

            allPages.sort(
                (a, b) =>
                    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );

            setPages(allPages);
            logger.info({ pageCount: allPages.length }, "Pages loaded");
        } catch (error) {
            logger.error({ error }, "Failed to fetch pages");
        } finally {
            setIsLoading(false);
        }
    };

    const getPageTypeColor = (type: string) => {
        switch (type) {
            case "registration":
                return "bg-blue-100 text-blue-800";
            case "watch":
                return "bg-purple-100 text-purple-800";
            case "enrollment":
                return "bg-green-100 text-green-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getPageTypeLabel = (type: string) => {
        switch (type) {
            case "registration":
                return "Registration";
            case "watch":
                return "Watch";
            case "enrollment":
                return "Enrollment";
            default:
                return type;
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-12 text-gray-500">
                <p>Loading pages...</p>
            </div>
        );
    }

    if (pages.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <p>No pages created yet. Create your first funnel to get started!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {pages.map((page) => (
                <Card
                    key={`${page.type}-${page.id}`}
                    className="hover:shadow-md transition-shadow"
                >
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Badge
                                            variant="secondary"
                                            className={getPageTypeColor(page.type)}
                                        >
                                            {getPageTypeLabel(page.type)}
                                        </Badge>
                                        <h4 className="text-lg font-semibold text-gray-900">
                                            {page.headline}
                                        </h4>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Project: {page.projectName}
                                    </p>
                                </div>
                            </div>

                            <ShareButton
                                username={username}
                                vanitySlug={page.vanitySlug}
                            />

                            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                <div className="flex items-center gap-4">
                                    <PublishToggle
                                        pageId={page.id}
                                        pageType={page.type}
                                        initialPublished={page.isPublished}
                                        onToggle={() => fetchPages()}
                                    />
                                    <span className="text-sm text-gray-500">
                                        Updated {formatDate(page.updatedAt)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/funnel-builder/${page.projectId}/step/${page.stepNumber}`}
                                    >
                                        <Button variant="outline" size="sm">
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </Button>
                                    </Link>
                                    {page.isPublished && page.vanitySlug && (
                                        <Link
                                            href={`/${username}/${page.vanitySlug}`}
                                            target="_blank"
                                        >
                                            <Button variant="outline" size="sm">
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                View
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
