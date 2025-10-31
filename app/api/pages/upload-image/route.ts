/**
 * Image Upload API
 * Upload user images to Supabase Storage for use in pages
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "upload-image" });

    try {
        const supabase = await createClient();

        // Authenticate user
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("image") as File;
        const projectId = formData.get("projectId") as string;
        const pageId = formData.get("pageId") as string | null;

        // Validate inputs
        if (!file) {
            return NextResponse.json(
                { error: "Image file is required" },
                { status: 400 }
            );
        }

        if (!projectId) {
            return NextResponse.json(
                { error: "Project ID is required" },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
                { status: 400 }
            );
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                {
                    error: `Unsupported file type. Allowed: ${ALLOWED_TYPES.join(", ")}`,
                },
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
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
            },
            "Uploading image"
        );

        // Generate storage path
        const timestamp = Date.now();
        const extension = file.name.split(".").pop() || "jpg";
        const sanitizedFilename = file.name
            .replace(/[^a-zA-Z0-9.-]/g, "_")
            .substring(0, 100);
        const storagePath = `${projectId}/${timestamp}-${sanitizedFilename}`;

        // Upload to Supabase Storage
        const fileBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
            .from("page-media")
            .upload(storagePath, fileBuffer, {
                contentType: file.type,
                cacheControl: "3600",
                upsert: false,
            });

        if (uploadError) {
            requestLogger.error(
                { error: uploadError, storagePath },
                "Failed to upload image"
            );
            return NextResponse.json(
                { error: "Failed to upload image" },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from("page-media")
            .getPublicUrl(storagePath);

        // Get image dimensions if possible
        let metadata: Record<string, unknown> = {
            file_size: file.size,
            mime_type: file.type,
            original_filename: file.name,
        };

        // Try to read image dimensions from file
        try {
            // For web APIs, we can use createImageBitmap
            const blob = new Blob([fileBuffer], { type: file.type });
            const imageBitmap = await createImageBitmap(blob);
            metadata = {
                ...metadata,
                width: imageBitmap.width,
                height: imageBitmap.height,
            };
            imageBitmap.close();
        } catch (error) {
            // If dimension reading fails, just continue without dimensions
            requestLogger.warn({ error }, "Could not read image dimensions");
        }

        // Save metadata to database
        const { data: mediaRecord, error: dbError } = await supabase
            .from("page_media")
            .insert({
                funnel_project_id: projectId,
                page_id: pageId || null,
                user_id: user.id,
                media_type: "uploaded_image",
                storage_path: storagePath,
                public_url: urlData.publicUrl,
                prompt: null,
                metadata,
            })
            .select()
            .single();

        if (dbError) {
            requestLogger.error(
                { error: dbError, storagePath },
                "Failed to save media metadata"
            );
            // Don't fail the request - image is already uploaded
        }

        requestLogger.info(
            {
                userId: user.id,
                projectId,
                mediaId: mediaRecord?.id,
                imageUrl: urlData.publicUrl,
            },
            "Image uploaded successfully"
        );

        return NextResponse.json({
            success: true,
            imageUrl: urlData.publicUrl,
            mediaId: mediaRecord?.id,
            filename: file.name,
        });
    } catch (error) {
        requestLogger.error({ error }, "Image upload failed");

        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : "Failed to upload image",
            },
            { status: 500 }
        );
    }
}
