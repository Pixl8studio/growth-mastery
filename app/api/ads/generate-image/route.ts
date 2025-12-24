/**
 * Ad Image Generation API
 * Generate ad-specific images using DALL-E for Meta/Instagram ads
 *
 * Supports standard ad dimensions:
 * - 1200x628 (Facebook Feed, landscape)
 * - 1080x1080 (Instagram Feed, square)
 * - 1792x1024 (Story/Reel, closest DALL-E supported ratio)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateImageWithAI } from "@/lib/ai/client";
import { AuthenticationError, ValidationError } from "@/lib/errors";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

const GenerateAdImageSchema = z.object({
    funnel_project_id: z.string().uuid(),
    prompt: z.string().min(10).max(4000),
    format: z
        .enum(["facebook_feed", "instagram_square", "story"])
        .default("facebook_feed"),
    style: z.enum(["vivid", "natural"]).default("vivid"),
    quality: z.enum(["standard", "hd"]).default("standard"),
});

type AdImageFormat = "facebook_feed" | "instagram_square" | "story";

// Map ad formats to DALL-E supported sizes
const FORMAT_TO_SIZE: Record<AdImageFormat, "1792x1024" | "1024x1024" | "1024x1792"> = {
    facebook_feed: "1792x1024", // 1.75:1 ratio, closest to 1.91:1 (1200x628)
    instagram_square: "1024x1024", // 1:1 ratio
    story: "1024x1792", // 9:16 ratio for stories
};

/**
 * POST /api/ads/generate-image
 * Generate an ad-optimized image using DALL-E
 */
export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "ads-generate-image" });

    try {
        const supabase = await createClient();

        // Authenticate user
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            throw new AuthenticationError("Authentication required");
        }

        const body = await request.json();

        // Validate request
        let validatedData;
        try {
            validatedData = GenerateAdImageSchema.parse(body);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errorMessage = error.issues
                    .map((e) => `${e.path.join(".")}: ${e.message}`)
                    .join(", ");
                throw new ValidationError(errorMessage);
            }
            throw error;
        }

        const { funnel_project_id, prompt, format, style, quality } = validatedData;

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id, user_id, name")
            .eq("id", funnel_project_id)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            requestLogger.error(
                { error: projectError, funnel_project_id },
                "Project not found"
            );
            throw new AuthenticationError("Project not found or access denied");
        }

        const size = FORMAT_TO_SIZE[format];

        requestLogger.info(
            {
                userId: user.id,
                projectId: funnel_project_id,
                format,
                size,
                promptLength: prompt.length,
            },
            "Generating ad image with DALL-E"
        );

        // Enhance prompt for ad-specific generation
        const adPrompt = buildAdPrompt(prompt, format);

        // Generate image with DALL-E
        const generatedImage = await generateImageWithAI(adPrompt, {
            size,
            quality,
            style,
        });

        // Download the generated image from OpenAI
        const imageResponse = await fetch(generatedImage.url);
        if (!imageResponse.ok) {
            throw new Error("Failed to download generated image");
        }

        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();

        // Generate storage path
        const timestamp = Date.now();
        const storagePath = `${funnel_project_id}/ads/${timestamp}-${format}.png`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from("page-media")
            .upload(storagePath, imageBuffer, {
                contentType: "image/png",
                cacheControl: "3600",
                upsert: false,
            });

        if (uploadError) {
            requestLogger.error(
                { error: uploadError, storagePath },
                "Failed to upload ad image"
            );
            throw new Error("Failed to upload generated image");
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from("page-media")
            .getPublicUrl(storagePath);

        // Save metadata to database
        const { data: mediaRecord, error: dbError } = await supabase
            .from("page_media")
            .insert({
                funnel_project_id,
                user_id: user.id,
                media_type: "ad_image",
                storage_path: storagePath,
                public_url: urlData.publicUrl,
                prompt: prompt,
                metadata: {
                    mime_type: "image/png",
                    revised_prompt: generatedImage.revisedPrompt,
                    format,
                    size,
                    quality,
                    style,
                    generated_for: "meta_ads",
                },
            })
            .select()
            .single();

        if (dbError) {
            requestLogger.error({ error: dbError }, "Failed to save ad image metadata");
            // Don't fail the request - image is already uploaded
        }

        requestLogger.info(
            {
                userId: user.id,
                projectId: funnel_project_id,
                mediaId: mediaRecord?.id,
                format,
                imageUrl: urlData.publicUrl,
            },
            "Ad image generated and uploaded successfully"
        );

        return NextResponse.json({
            success: true,
            imageUrl: urlData.publicUrl,
            mediaId: mediaRecord?.id,
            format,
            size,
            revisedPrompt: generatedImage.revisedPrompt,
        });
    } catch (error) {
        requestLogger.error({ error }, "Ad image generation failed");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "generate_ad_image",
                endpoint: "POST /api/ads/generate-image",
            },
            extra: {
                errorMessage: error instanceof Error ? error.message : "Unknown error",
            },
        });

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to generate ad image",
            },
            { status: 500 }
        );
    }
}

/**
 * Build an ad-optimized prompt with format-specific guidance
 */
function buildAdPrompt(userPrompt: string, format: AdImageFormat): string {
    const formatGuidance: Record<AdImageFormat, string> = {
        facebook_feed:
            "Create a professional marketing image optimized for Facebook feed ads. " +
            "Use a wide landscape composition (16:9 aspect ratio). " +
            "Ensure the main subject is centered with room for text overlay. " +
            "Use vibrant, eye-catching colors that stand out in a social feed. " +
            "Avoid text in the image - keep it clean and visual. ",
        instagram_square:
            "Create a bold, eye-catching square image for Instagram ads. " +
            "Use a 1:1 square composition with the subject centered. " +
            "Bright, saturated colors work best on Instagram. " +
            "Make it visually striking and thumb-stopping. " +
            "Avoid text in the image - keep it purely visual. ",
        story:
            "Create a vertical image for Instagram/Facebook Stories ads. " +
            "Use a tall 9:16 portrait composition. " +
            "Leave space at the top and bottom for text overlays. " +
            "Make it immersive and full-screen optimized. " +
            "Use bold colors and clear focal points. ",
    };

    return `${formatGuidance[format]}${userPrompt}`;
}
