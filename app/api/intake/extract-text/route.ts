/**
 * Text Extraction API
 * Extracts text from uploaded files without creating an intake session
 * Used for wizard section content population
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { extractTextFromFile, validateIntakeContent } from "@/lib/intake/processors";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
];

const ALLOWED_EXTENSIONS = [
    "pdf",
    "docx",
    "doc",
    "txt",
    "md",
    "markdown",
    "csv",
    "xlsx",
    "xls",
    "pptx",
    "ppt",
];

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const projectId = formData.get("projectId") as string;

        if (!file || !projectId) {
            return NextResponse.json(
                { error: "Missing required fields: file and projectId" },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 10MB." },
                { status: 400 }
            );
        }

        // Validate file type by extension
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
            return NextResponse.json(
                {
                    error: `Unsupported file type: .${ext}. Supported types: PDF, DOCX, DOC, TXT, XLSX, CSV, PPTX`,
                },
                { status: 400 }
            );
        }

        // Also check MIME type if available (some browsers may not set it correctly)
        if (file.type && !ALLOWED_TYPES.includes(file.type)) {
            // Only warn, don't reject - extension check is more reliable
            logger.warn(
                { fileName: file.name, mimeType: file.type, extension: ext },
                "Unexpected MIME type for file, proceeding with extension-based detection"
            );
        }

        logger.info(
            {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                extension: ext,
                projectId,
            },
            "Extracting text from file"
        );

        // Extract text from file
        let extractedText: string;
        try {
            extractedText = await extractTextFromFile(file);
        } catch (error) {
            logger.error(
                {
                    error,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    errorMessage:
                        error instanceof Error ? error.message : String(error),
                },
                "Failed to extract text from file"
            );

            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Failed to extract text from file. Please ensure the file is a valid document.";

            return NextResponse.json({ error: errorMessage }, { status: 500 });
        }

        // Validate extracted content
        const validation = validateIntakeContent(extractedText);
        if (!validation.valid) {
            return NextResponse.json(
                {
                    error:
                        validation.reason ||
                        "Extracted content is invalid or too short. Please upload a document with more content.",
                },
                { status: 400 }
            );
        }

        logger.info(
            {
                fileName: file.name,
                textLength: extractedText.length,
                wordCount: extractedText.split(/\s+/).length,
                projectId,
            },
            "Successfully extracted text from file"
        );

        return NextResponse.json({
            success: true,
            text: extractedText,
            metadata: {
                fileName: file.name,
                fileSize: file.size,
                fileType: ext,
                characterCount: extractedText.length,
                wordCount: extractedText.split(/\s+/).length,
            },
        });
    } catch (error) {
        logger.error({ error }, "Error in extract-text endpoint");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/intake/extract-text",
            },
        });

        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
