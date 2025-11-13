"use client";

/**
 * Pages list component for funnel builder
 * Displays all pages (registration, watch, enrollment) with publish toggles and share buttons
 */

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PublishToggle } from "@/components/pages/publish-toggle";
import { SlugEditor } from "@/components/pages/slug-editor";
import { formatDate } from "@/lib/utils";
import { ExternalLink, Edit, Copy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { useToast } from "@/components/ui/use-toast";
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
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchPages = useCallback(async () => {
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
    }, [userId]);

    useEffect(() => {
        fetchPages();
    }, [fetchPages]);

    const getPageTypeColor = (type: string) => {
        switch (type) {
            case "registration":
                return "bg-primary/10 text-primary";
            case "watch":
                return "bg-purple-100 text-purple-800";
            case "enrollment":
                return "bg-green-100 text-green-800";
            default:
                return "bg-muted text-foreground";
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

    const handleCopyUrl = async (pageId: string, vanitySlug: string | null) => {
        if (!vanitySlug) {
            toast({
                title: "No slug set",
                description: "Set a slug first to get a public URL",
                variant: "destructive",
            });
            return;
        }

        const url = `${window.location.origin}/${username}/${vanitySlug}`;

        try {
            await navigator.clipboard.writeText(url);
            setCopiedUrl(pageId);

            toast({
                title: "URL copied!",
                description: "The full public URL has been copied to your clipboard",
            });

            setTimeout(() => setCopiedUrl(null), 2000);
        } catch (error) {
            logger.error({ error }, "Failed to copy URL");
            toast({
                title: "Copy failed",
                description: "Failed to copy URL. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleSlugUpdate = (pageId: string, newSlug: string) => {
        setPages((currentPages) =>
            currentPages.map((page) =>
                page.id === pageId ? { ...page, vanitySlug: newSlug } : page
            )
        );
    };

    if (isLoading) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>Loading pages...</p>
            </div>
        );
    }

    if (pages.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
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
                                        <h4 className="text-lg font-semibold text-foreground">
                                            {page.headline}
                                        </h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Project: {page.projectName}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-foreground">
                                        Slug
                                    </label>
                                    <SlugEditor
                                        pageId={page.id}
                                        pageType={page.type}
                                        initialSlug={page.vanitySlug}
                                        username={username}
                                        onUpdate={(newSlug) =>
                                            handleSlugUpdate(page.id, newSlug)
                                        }
                                    />
                                </div>

                                {page.vanitySlug && (
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-foreground">
                                            Public URL
                                        </label>
                                        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                                            <code className="flex-1 text-sm text-foreground truncate">
                                                {window.location.origin}/{username}/
                                                {page.vanitySlug}
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleCopyUrl(
                                                        page.id,
                                                        page.vanitySlug
                                                    )
                                                }
                                                className="h-8 px-2 flex-shrink-0"
                                                title="Copy full URL"
                                            >
                                                {copiedUrl === page.id ? (
                                                    <Check className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-border">
                                <div className="flex items-center gap-4">
                                    <PublishToggle
                                        page={{
                                            id: page.id,
                                            type: page.type,
                                            headline: page.headline,
                                            funnel_name: page.projectName,
                                            funnel_id: page.projectId,
                                            is_published: page.isPublished,
                                            vanity_slug: page.vanitySlug,
                                            created_at: page.updatedAt,
                                            updated_at: page.updatedAt,
                                        }}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        Updated {formatDate(page.updatedAt)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/funnel-builder/${page.projectId}/pages/${page.type}/${page.id}?edit=true`}
                                        target="_blank"
                                    >
                                        <Button variant="outline" size="sm">
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Page
                                        </Button>
                                    </Link>
                                    {page.vanitySlug && (
                                        <Link
                                            href={`/${username}/${page.vanitySlug}`}
                                            target="_blank"
                                        >
                                            <Button variant="outline" size="sm">
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                View Public
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
