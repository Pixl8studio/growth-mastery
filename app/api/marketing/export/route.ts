/**
 * Export API
 * Export all content and analytics
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";

/**
 * GET /api/marketing/export?funnel_project_id=X&format=json
 * Export all content and analytics
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const { searchParams } = new URL(request.url);
        const funnelProjectId = searchParams.get("funnel_project_id");
        const format = searchParams.get("format") || "json";

        if (!funnelProjectId) {
            throw new ValidationError("funnel_project_id is required");
        }

        // Verify project ownership
        const { data: project } = await supabase
            .from("funnel_projects")
            .select("user_id, name")
            .eq("id", funnelProjectId)
            .single();

        if (!project || project.user_id !== user.id) {
            throw new AuthenticationError("Access denied to funnel project");
        }

        // Get all briefs for this funnel
        const { data: briefs } = await supabase
            .from("marketing_content_briefs")
            .select("*")
            .eq("funnel_project_id", funnelProjectId)
            .order("created_at", { ascending: false });

        if (!briefs || briefs.length === 0) {
            return NextResponse.json({
                success: true,
                export_data: {
                    funnel_name: project.name,
                    funnel_project_id: funnelProjectId,
                    exported_at: new Date().toISOString(),
                    briefs: [],
                    variants: [],
                    analytics: [],
                },
            });
        }

        const briefIds = briefs.map((b) => b.id);

        // Get all variants
        const { data: variants } = await supabase
            .from("marketing_post_variants")
            .select("*")
            .in("content_brief_id", briefIds)
            .order("created_at", { ascending: false });

        // Get analytics for all variants
        const variantIds = (variants || []).map((v) => v.id);
        const { data: analytics } = await supabase
            .from("marketing_analytics")
            .select("*")
            .in("post_variant_id", variantIds);

        // Build export data
        const exportData = {
            funnel_name: project.name,
            funnel_project_id: funnelProjectId,
            exported_at: new Date().toISOString(),
            briefs: briefs || [],
            variants: variants || [],
            analytics: analytics || [],
        };

        logger.info(
            {
                funnelProjectId,
                briefs: briefs.length,
                variants: variants?.length || 0,
            },
            "Content exported"
        );

        // Return JSON or CSV based on format
        if (format === "csv") {
            // Convert to CSV
            const csv = convertToCSV(exportData);
            return new NextResponse(csv, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="marketing-export-${funnelProjectId}.csv"`,
                },
            });
        }

        // Default: JSON
        return NextResponse.json({
            success: true,
            export_data: exportData,
        });
    } catch (error) {
        logger.error({ error }, "Error in GET /api/marketing/export");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * Convert export data to CSV format
 */
function convertToCSV(data: any): string {
    const rows = [];

    // Header
    rows.push([
        "Brief Name",
        "Platform",
        "Copy Text",
        "Hashtags",
        "Impressions",
        "Opt-ins",
        "O/I-1000",
        "Published At",
    ]);

    // Data rows
    data.variants.forEach((variant: any) => {
        const analytics = data.analytics.find(
            (a: any) => a.post_variant_id === variant.id
        );

        rows.push([
            data.briefs.find((b: any) => b.id === variant.content_brief_id)?.name || "",
            variant.platform,
            `"${variant.copy_text.replace(/"/g, '""')}"`, // Escape quotes
            variant.hashtags.join(" "),
            analytics?.impressions || 0,
            analytics?.opt_ins || 0,
            analytics?.oi_1000 || 0,
            variant.created_at,
        ]);
    });

    return rows.map((row) => row.join(",")).join("\n");
}
