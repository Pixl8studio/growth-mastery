/**
 * Google Drive Intake API
 * Connects to Google Drive and imports documents
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { extractTextFromFile, validateIntakeContent } from "@/lib/intake/processors";

// Note: This is a simplified implementation
// Full OAuth flow would require additional setup with Google Cloud Console

export async function POST(request: NextRequest) {
    try {
        const { projectId, userId, accessToken, fileIds, sessionName } =
            await request.json();

        if (!projectId || !userId || !accessToken || !fileIds || !fileIds.length) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const processedFiles: string[] = [];
        const allExtractedText: string[] = [];

        // Process each file from Google Drive
        for (const fileId of fileIds) {
            try {
                // Download file from Google Drive API
                const response = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );

                if (!response.ok) {
                    logger.warn(
                        { fileId, status: response.status },
                        "Failed to fetch file"
                    );
                    continue;
                }

                // Get file metadata
                const metadataResponse = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );

                const metadata = await metadataResponse.json();
                const blob = await response.blob();
                const file = new File([blob], metadata.name, {
                    type: metadata.mimeType,
                });

                // Extract text
                const extractedText = await extractTextFromFile(file);

                // Validate
                const validation = validateIntakeContent(extractedText);
                if (validation.valid) {
                    allExtractedText.push(
                        `\n\n--- ${metadata.name} ---\n\n${extractedText}`
                    );
                    processedFiles.push(metadata.name);
                }
            } catch (error) {
                logger.error({ error, fileId }, "Failed to process Google Drive file");
                // Continue with other files
            }
        }

        if (allExtractedText.length === 0) {
            return NextResponse.json(
                { error: "No valid content extracted from files" },
                { status: 400 }
            );
        }

        const combinedText = allExtractedText.join("\n\n");
        const supabase = await createClient();

        // Save to database
        const { data: intakeRecord, error: dbError } = await supabase
            .from("vapi_transcripts")
            .insert({
                funnel_project_id: projectId,
                user_id: userId,
                intake_method: "google_drive",
                transcript_text: combinedText,
                call_status: "completed",
                call_duration: 0,
                session_name:
                    sessionName || `Google Drive (${processedFiles.length} files)`,
                metadata: {
                    file_count: processedFiles.length,
                    file_names: processedFiles,
                    character_count: combinedText.length,
                    word_count: combinedText.split(/\s+/).length,
                    imported_at: new Date().toISOString(),
                },
            })
            .select()
            .single();

        if (dbError) {
            logger.error(
                { error: dbError, projectId },
                "Failed to save Google Drive data"
            );
            return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
        }

        logger.info(
            {
                intakeId: intakeRecord.id,
                projectId,
                fileCount: processedFiles.length,
                textLength: combinedText.length,
            },
            "Google Drive files processed successfully"
        );

        return NextResponse.json({
            success: true,
            intakeId: intakeRecord.id,
            method: "google_drive",
            filesProcessed: processedFiles.length,
            fileNames: processedFiles,
        });
    } catch (error) {
        logger.error({ error }, "Error in Google Drive intake endpoint");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/**
 * GET endpoint to initiate OAuth flow
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "auth") {
        // Return OAuth URL for client to redirect to
        const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
        const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;

        if (!clientId || !redirectUri) {
            return NextResponse.json(
                { error: "Google Drive not configured" },
                { status: 500 }
            );
        }

        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set(
            "scope",
            "https://www.googleapis.com/auth/drive.readonly"
        );
        authUrl.searchParams.set("access_type", "offline");

        return NextResponse.json({ authUrl: authUrl.toString() });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
