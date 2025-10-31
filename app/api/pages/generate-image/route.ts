/**
 * AI Image Generation API
 * Generate images using DALL-E and save to Supabase Storage
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { generateImageWithAI } from "@/lib/ai/client";
import * as Sentry from "@sentry/nextjs";

const MAX_PROMPT_LENGTH = 4000;

interface GenerateImageRequest {
    prompt: string;
    pageId?: string;
    projectId: string;
    size?: "1024x1024" | "1792x1024" | "1024x1792";
    quality?: "standard" | "hd";
}

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "generate-image" });

    try {
        const supabase = await createClient();

        // Authenticate user
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body: GenerateImageRequest = await request.json();
        const { prompt, pageId, projectId, size, quality } = body;

        // Validate inputs
        if (!prompt || !prompt.trim()) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        if (prompt.length > MAX_PROMPT_LENGTH) {
            return NextResponse.json(
                { error: `Prompt too long (max ${MAX_PROMPT_LENGTH} characters)` },
                { status: 400 }
            );
        }

        if (!projectId) {
            return NextResponse.json(
                { error: "Project ID is required" },
                { status: 400 }
            );
        }

        // Verify user owns the project
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id, user_id")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            requestLogger.error(
                { error: projectError, projectId },
                "Project not found"
            );
            return NextResponse.json(
                { error: "Project not found or access denied" },
                { status: 404 }
            );
        }

        requestLogger.info(
            {
                userId: user.id,
                projectId,
                pageId,
                promptLength: prompt.length,
                size,
                quality,
            },
            "Generating image with DALL-E"
        );

        // Generate image with DALL-E
        const generatedImage = await generateImageWithAI(prompt, {
            size: size || "1024x1024",
            quality: quality || "standard",
            style: "vivid",
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
        const storagePath = `${projectId}/${timestamp}-generated.png`;

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
                "Failed to upload image"
            );
            Sentry.captureException(uploadError, {
                tags: { handler: "generate-image", action: "upload" },
                extra: { projectId, storagePath },
            });
            return NextResponse.json(
                { error: "Failed to upload generated image" },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from("page-media")
            .getPublicUrl(storagePath);

        // Save metadata to database
        const { data: mediaRecord, error: dbError } = await supabase
            .from("page_media")
            .insert({
                funnel_project_id: projectId,
                page_id: pageId || null,
                user_id: user.id,
                media_type: "ai_generated_image",
                storage_path: storagePath,
                public_url: urlData.publicUrl,
                prompt: prompt,
                metadata: {
                    mime_type: "image/png",
                    revised_prompt: generatedImage.revisedPrompt,
                    size: size || "1024x1024",
                    quality: quality || "standard",
                },
            })
            .select()
            .single();

        if (dbError) {
            requestLogger.error(
                { error: dbError, storagePath },
                "Failed to save media metadata"
            );
            // Don't fail the request - image is already uploaded
            Sentry.captureException(dbError, {
                tags: { handler: "generate-image", action: "save-metadata" },
                extra: { projectId, storagePath },
            });
        }

        requestLogger.info(
            {
                userId: user.id,
                projectId,
                mediaId: mediaRecord?.id,
                imageUrl: urlData.publicUrl,
            },
            "Image generated and uploaded successfully"
        );

        return NextResponse.json({
            success: true,
            imageUrl: urlData.publicUrl,
            mediaId: mediaRecord?.id,
            revisedPrompt: generatedImage.revisedPrompt,
        });
    } catch (error) {
        requestLogger.error({ error }, "Image generation failed");

        Sentry.captureException(error, {
            tags: { handler: "generate-image" },
        });

        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : "Failed to generate image",
            },
            { status: 500 }
        );
    }
}
