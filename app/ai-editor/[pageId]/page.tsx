"use client";

/**
 * AI Editor Page
 * Route: /ai-editor/[pageId]
 * Lovable-style conversational landing page editor
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { AIEditorLayout } from "@/components/ai-editor";
import { Loader2 } from "lucide-react";

interface PageData {
    id: string;
    funnel_project_id: string;
    page_type: "registration" | "watch" | "enrollment";
    title: string;
    html_content: string;
    status: "draft" | "published";
    version: number;
}

export default function AIEditorPage() {
    const params = useParams();
    const router = useRouter();
    const pageId = params.pageId as string;

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pageData, setPageData] = useState<PageData | null>(null);

    useEffect(() => {
        const loadPage = async () => {
            if (!pageId) return;

            try {
                const supabase = createClient();

                // Check authentication
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                    router.push("/login");
                    return;
                }

                // Load page data
                const { data, error: fetchError } = await supabase
                    .from("ai_editor_pages")
                    .select("*")
                    .eq("id", pageId)
                    .single();

                if (fetchError) {
                    // If page not found, might be a "new" page request
                    if (fetchError.code === "PGRST116") {
                        setError("Page not found. Please create a new page first.");
                    } else {
                        throw fetchError;
                    }
                    return;
                }

                setPageData(data);
                logger.info(
                    { pageId, pageType: data.page_type },
                    "AI editor page loaded"
                );
            } catch (err) {
                logger.error({ error: err, pageId }, "Failed to load AI editor page");
                setError("Failed to load page. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        loadPage();
    }, [pageId, router]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading editor...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !pageData) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="text-4xl">😕</div>
                    <h2 className="text-lg font-semibold">Something went wrong</h2>
                    <p className="max-w-md text-sm text-muted-foreground">
                        {error || "Unable to load the page."}
                    </p>
                    <button
                        onClick={() => router.back()}
                        className="text-sm text-primary hover:underline"
                    >
                        Go back
                    </button>
                </div>
            </div>
        );
    }

    // Editor
    return (
        <AIEditorLayout
            pageId={pageData.id}
            projectId={pageData.funnel_project_id}
            pageType={pageData.page_type}
            initialHtml={pageData.html_content}
            initialTitle={pageData.title}
        />
    );
}
