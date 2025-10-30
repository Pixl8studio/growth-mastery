/**
 * Import API
 * Import existing content history
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import type { MarketingPlatform } from "@/types/marketing";

/**
 * POST /api/marketing/import
 * Import content from external sources
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const body = await request.json();

        if (!body.funnel_project_id) {
            throw new ValidationError("funnel_project_id is required");
        }

        if (!body.content_items || !Array.isArray(body.content_items)) {
            throw new ValidationError("content_items must be an array");
        }

        // Verify project ownership
        const { data: project } = await supabase
            .from("funnel_projects")
            .select("user_id")
            .eq("id", body.funnel_project_id)
            .single();

        if (!project || project.user_id !== user.id) {
            throw new AuthenticationError("Access denied to funnel project");
        }

        // Get or create profile for this funnel
        let { data: profile } = await supabase
            .from("marketing_profiles")
            .select("id")
            .eq("funnel_project_id", body.funnel_project_id)
            .eq("is_active", true)
            .single();

        if (!profile) {
            // Create default profile
            const { data: newProfile, error: profileError } = await supabase
                .from("marketing_profiles")
                .insert({
                    user_id: user.id,
                    funnel_project_id: body.funnel_project_id,
                    name: "Imported Content Profile",
                })
                .select()
                .single();

            if (profileError || !newProfile) {
                throw new Error("Failed to create profile for import");
            }

            profile = newProfile;
        }

        // Create a brief for imported content
        const { data: brief, error: briefError } = await supabase
            .from("marketing_content_briefs")
            .insert({
                user_id: user.id,
                funnel_project_id: body.funnel_project_id,
                marketing_profile_id: profile.id,
                name: "Imported Content",
                goal: "historical_reference",
                topic: "Imported historical content",
                status: "ready",
                space: "production",
            })
            .select()
            .single();

        if (briefError || !brief) {
            throw new Error("Failed to create brief for import");
        }

        // Import each content item
        const imported = [];
        const errors = [];

        for (const item of body.content_items) {
            try {
                const { data: variant, error: variantError } = await supabase
                    .from("marketing_post_variants")
                    .insert({
                        content_brief_id: brief.id,
                        user_id: user.id,
                        platform: item.platform as MarketingPlatform,
                        format_type: item.format_type || "post",
                        copy_text: item.copy_text,
                        media_urls: item.media_urls || [],
                        alt_text: item.alt_text || null,
                        hashtags: item.hashtags || [],
                        caption: item.caption || item.copy_text,
                        approval_status: "approved",
                        metadata: {
                            imported: true,
                            original_post_id: item.original_post_id,
                            original_published_at: item.published_at,
                        },
                    })
                    .select()
                    .single();

                if (!variantError && variant) {
                    imported.push(variant);

                    // Import analytics if provided
                    if (item.analytics) {
                        await supabase.from("marketing_analytics").insert({
                            post_variant_id: variant.id,
                            user_id: user.id,
                            impressions: item.analytics.impressions || 0,
                            saves: item.analytics.saves || 0,
                            shares: item.analytics.shares || 0,
                            comments: item.analytics.comments || 0,
                            likes: item.analytics.likes || 0,
                            opt_ins: item.analytics.opt_ins || 0,
                            oi_1000: item.analytics.oi_1000 || 0,
                        });
                    }
                }
            } catch (itemError) {
                errors.push({
                    item: item.copy_text?.substring(0, 50),
                    error:
                        itemError instanceof Error
                            ? itemError.message
                            : "Unknown error",
                });
            }
        }

        logger.info(
            {
                funnelProjectId: body.funnel_project_id,
                imported: imported.length,
                errors: errors.length,
            },
            "Content import complete"
        );

        return NextResponse.json({
            success: true,
            imported: imported.length,
            errors,
            brief_id: brief.id,
        });
    } catch (error) {
        logger.error({ error }, "Error in POST /api/marketing/import");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
