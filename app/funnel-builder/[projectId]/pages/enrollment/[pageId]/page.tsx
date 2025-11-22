/**
 * Enrollment Page Editor
 * Renders enrollment/sales pages with optional visual editor (requires ?edit=true)
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditorPageWrapper } from "@/components/editor";
import { logger } from "@/lib/logger";

interface PageProps {
    params: Promise<{ projectId: string; pageId: string }>;
    searchParams: Promise<{ edit?: string }>;
}

export default async function EnrollmentPageEditor({
    params,
    searchParams,
}: PageProps) {
    const { projectId, pageId } = await params;
    const { edit } = await searchParams;
    const isEditMode = edit === "true";

    const supabase = await createClient();

    // Get current user
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
        logger.warn({ pageId }, "Unauthenticated access to enrollment page");
        redirect("/login");
    }

    // Load enrollment page
    const { data: page, error: pageError } = await supabase
        .from("enrollment_pages")
        .select("*")
        .eq("id", pageId)
        .single();

    if (pageError || !page) {
        logger.error({ error: pageError, pageId }, "Enrollment page not found");
        redirect(`/funnel-builder/${projectId}/step/9`);
    }

    // Verify ownership if in edit mode
    if (isEditMode && page.user_id !== user.id) {
        logger.warn(
            { pageId, userId: user.id, ownerId: page.user_id },
            "User attempted to edit enrollment page they don't own"
        );
        redirect(`/funnel-builder/${projectId}/pages/enrollment/${pageId}`);
    }

    // Get theme from brand design (Step 3)
    const { data: brandDesign } = await supabase
        .from("brand_designs")
        .select("*")
        .eq("funnel_project_id", projectId)
        .maybeSingle();

    const theme = page.theme || {
        primary: brandDesign?.primary_color || "#3b82f6",
        secondary: brandDesign?.secondary_color || "#8b5cf6",
        accent: brandDesign?.accent_color || "#ec4899",
        background: brandDesign?.background_color || "#ffffff",
        text: brandDesign?.text_color || "#1f2937",
    };

    // If no HTML content yet, show error
    if (!page.html_content) {
        logger.error({ pageId }, "Enrollment page missing HTML content");
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
                    <h2 className="mb-4 text-2xl font-bold text-red-900">
                        Page Content Missing
                    </h2>
                    <p className="mb-6 text-red-700">
                        This page doesn't have HTML content yet. Please regenerate it
                        from the step page.
                    </p>
                    <a
                        href={`/funnel-builder/${projectId}/step/9`}
                        className="inline-block rounded-lg bg-red-600 px-6 py-3 text-white hover:bg-red-700"
                    >
                        Go to Enrollment Pages
                    </a>
                </div>
            </div>
        );
    }

    // Note: Removed logger.info here - was causing "worker has exited" error
    // in Next.js server components. Logging moved to client-side component.

    return (
        <EditorPageWrapper
            pageId={pageId}
            projectId={projectId}
            pageType="enrollment"
            htmlContent={page.html_content}
            theme={theme}
            isEditMode={isEditMode}
        />
    );
}
