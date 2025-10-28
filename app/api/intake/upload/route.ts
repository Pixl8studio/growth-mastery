/**
 * File Upload Intake API
 * Accepts PDF, DOCX, TXT, MD files and extracts text content
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { extractTextFromFile, validateIntakeContent } from "@/lib/intake/processors";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/markdown",
];

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const projectId = formData.get("projectId") as string;
        const userId = formData.get("userId") as string;
        const sessionName = formData.get("sessionName") as string;

        if (!file || !projectId || !userId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "File too large (max 10MB)" },
                { status: 400 }
            );
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Unsupported file type" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Upload file to Supabase Storage
        const fileName = `${projectId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
            .from("intake-files")
            .upload(fileName, file);

        if (uploadError) {
            logger.error({ error: uploadError, fileName }, "Failed to upload file");
            return NextResponse.json(
                { error: "Failed to upload file" },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from("intake-files")
            .getPublicUrl(fileName);

        // Extract text from file
        let extractedText: string;
        try {
            extractedText = await extractTextFromFile(file);
        } catch (error) {
            logger.error({ error, fileName: file.name }, "Failed to extract text");
            return NextResponse.json(
                { error: "Failed to extract text from file" },
                { status: 500 }
            );
        }

        // Validate extracted content
        const validation = validateIntakeContent(extractedText);
        if (!validation.valid) {
            return NextResponse.json(
                { error: validation.reason || "Invalid content" },
                { status: 400 }
            );
        }

        // Save to database
        const { data: intakeRecord, error: dbError } = await supabase
            .from("vapi_transcripts")
            .insert({
                funnel_project_id: projectId,
                user_id: userId,
                intake_method: "upload",
                file_urls: [urlData.publicUrl],
                transcript_text: extractedText,
                call_status: "completed",
                call_duration: 0,
                session_name: sessionName || file.name,
                metadata: {
                    file_name: file.name,
                    file_size: file.size,
                    file_type: file.type,
                    character_count: extractedText.length,
                    word_count: extractedText.split(/\s+/).length,
                },
            })
            .select()
            .single();

        if (dbError) {
            logger.error({ error: dbError, projectId }, "Failed to save upload data");
            return NextResponse.json(
                { error: "Failed to save upload data" },
                { status: 500 }
            );
        }

        logger.info(
            {
                intakeId: intakeRecord.id,
                projectId,
                fileName: file.name,
                textLength: extractedText.length,
            },
            "File uploaded and processed successfully"
        );

        return NextResponse.json({
            success: true,
            intakeId: intakeRecord.id,
            method: "upload",
            fileUrl: urlData.publicUrl,
        });
    } catch (error) {
        logger.error({ error }, "Error in upload intake endpoint");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
