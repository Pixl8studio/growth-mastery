/**
 * Text extraction utilities for different intake methods.
 * Handles PDF, DOCX, plain text, and web scraping.
 */

import { logger } from "@/lib/logger";

/**
 * Extract text content from a PDF file.
 * Uses pdf-parse library for extraction.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
    try {
        // Dynamic import to avoid loading in client bundle
        const pdfjsLib = await import("pdfjs-dist");

        const arrayBuffer = await file.arrayBuffer();
        const typedArray = new Uint8Array(arrayBuffer);

        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        const textParts: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item) => ("str" in item ? item.str : ""))
                .join(" ");
            textParts.push(pageText);
        }

        const fullText = textParts.join("\n\n");
        logger.info(
            { pages: pdf.numPages, length: fullText.length },
            "Extracted text from PDF"
        );

        return fullText;
    } catch (error) {
        logger.error({ error, fileName: file.name }, "Failed to extract text from PDF");
        throw new Error("Failed to extract text from PDF");
    }
}

/**
 * Extract text content from a DOCX file.
 * Uses mammoth library for extraction.
 */
export async function extractTextFromDocx(file: File): Promise<string> {
    const fileName = file.name;
    const fileSize = file.size;

    try {
        // Validate file size
        if (fileSize === 0) {
            logger.error({ fileName, fileSize }, "DOCX file is empty");
            throw new Error(
                `File "${fileName}" is empty. Please upload a valid DOCX file.`
            );
        }

        // Validate file type by checking file extension
        const ext = fileName.split(".").pop()?.toLowerCase();
        if (ext !== "docx" && ext !== "doc") {
            logger.error({ fileName, ext }, "Invalid file extension for DOCX");
            throw new Error(
                `File "${fileName}" does not have a valid DOCX extension. Expected .docx or .doc`
            );
        }

        // Dynamic import
        const mammoth = await import("mammoth");

        // Convert file to ArrayBuffer
        let arrayBuffer: ArrayBuffer;
        try {
            arrayBuffer = await file.arrayBuffer();
        } catch (error) {
            logger.error({ error, fileName }, "Failed to read file as ArrayBuffer");
            throw new Error(
                `Failed to read file "${fileName}". The file may be corrupted or inaccessible.`
            );
        }

        // Validate ArrayBuffer
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            logger.error(
                { fileName, bufferSize: arrayBuffer?.byteLength },
                "Empty ArrayBuffer"
            );
            throw new Error(
                `File "${fileName}" could not be processed. The file may be corrupted.`
            );
        }

        // Extract text using mammoth
        let result;
        try {
            result = await mammoth.extractRawText({ arrayBuffer });
        } catch (error) {
            logger.error(
                { error, fileName, fileSize, bufferSize: arrayBuffer.byteLength },
                "Mammoth failed to extract text from DOCX"
            );

            // Provide more specific error messages based on error type
            if (error instanceof Error) {
                if (error.message.includes("not a valid")) {
                    throw new Error(
                        `File "${fileName}" is not a valid DOCX file. Please ensure the file is a properly formatted Word document.`
                    );
                }
                if (
                    error.message.includes("corrupted") ||
                    error.message.includes("corrupt")
                ) {
                    throw new Error(
                        `File "${fileName}" appears to be corrupted. Please try re-saving the file and uploading again.`
                    );
                }
            }

            throw new Error(
                `Failed to extract text from "${fileName}". ${error instanceof Error ? error.message : "The file format may not be supported."}`
            );
        }

        // Validate extracted text
        if (!result || !result.value) {
            logger.error({ fileName }, "Mammoth returned empty result");
            throw new Error(
                `No text content found in "${fileName}". The document may be empty or contain only images.`
            );
        }

        const extractedText = result.value.trim();

        // Check if extracted text is too short (likely an error)
        if (extractedText.length === 0) {
            logger.warn({ fileName, fileSize }, "Extracted text is empty");
            throw new Error(
                `No readable text found in "${fileName}". The document may contain only images, or the text may be in an unsupported format.`
            );
        }

        logger.info(
            { fileName, fileSize, textLength: extractedText.length },
            "Successfully extracted text from DOCX"
        );

        return extractedText;
    } catch (error) {
        // If error is already a user-friendly Error, re-throw it
        if (error instanceof Error && error.message.includes(fileName)) {
            throw error;
        }

        // Otherwise, wrap it in a user-friendly error
        logger.error(
            {
                error,
                fileName,
                fileSize,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
            },
            "Failed to extract text from DOCX"
        );

        throw new Error(
            `Failed to extract text from "${fileName}". ${error instanceof Error ? error.message : "Please ensure the file is a valid DOCX document and try again."}`
        );
    }
}

/**
 * Extract text content from plain text or markdown files.
 */
export async function extractTextFromPlainFile(file: File): Promise<string> {
    try {
        const text = await file.text();
        logger.info({ length: text.length }, "Extracted text from plain file");
        return text;
    } catch (error) {
        logger.error({ error, fileName: file.name }, "Failed to read plain file");
        throw new Error("Failed to read file");
    }
}

/**
 * Extract relevant text content from a URL.
 * Removes navigation, headers, footers, and script content.
 */
export async function extractTextFromUrl(url: string): Promise<string> {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();

        // Simple HTML cleaning - remove scripts, styles, nav, headers, footers
        let cleaned = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
            .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
            .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
            .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "");

        // Extract text from remaining HTML
        cleaned = cleaned.replace(/<[^>]+>/g, " ");
        cleaned = cleaned.replace(/&nbsp;/g, " ");
        cleaned = cleaned.replace(/&amp;/g, "&");
        cleaned = cleaned.replace(/&lt;/g, "<");
        cleaned = cleaned.replace(/&gt;/g, ">");
        cleaned = cleaned.replace(/&quot;/g, '"');

        // Clean up whitespace
        cleaned = cleaned.replace(/\s+/g, " ").trim();

        logger.info({ url, length: cleaned.length }, "Extracted text from URL");

        return cleaned;
    } catch (error) {
        logger.error({ error, url }, "Failed to extract text from URL");
        throw new Error("Failed to scrape URL");
    }
}

/**
 * Validate that intake content has sufficient information.
 * Ensures minimum length and checks for placeholder text.
 */
export function validateIntakeContent(content: string): {
    valid: boolean;
    reason?: string;
} {
    const minLength = 100; // Minimum 100 characters

    if (!content || content.trim().length === 0) {
        return { valid: false, reason: "Content is empty" };
    }

    if (content.trim().length < minLength) {
        return {
            valid: false,
            reason: `Content too short (minimum ${minLength} characters)`,
        };
    }

    // Check for common placeholder text
    const placeholders = ["lorem ipsum", "placeholder", "test test test", "asdf"];

    const lowerContent = content.toLowerCase();
    for (const placeholder of placeholders) {
        if (lowerContent.includes(placeholder)) {
            return {
                valid: false,
                reason: "Content appears to be placeholder text",
            };
        }
    }

    return { valid: true };
}

/**
 * Extract text from any supported file type.
 */
export async function extractTextFromFile(file: File): Promise<string> {
    const ext = file.name.split(".").pop()?.toLowerCase();

    switch (ext) {
        case "pdf":
            return extractTextFromPDF(file);
        case "docx":
        case "doc":
            return extractTextFromDocx(file);
        case "txt":
        case "md":
        case "markdown":
            return extractTextFromPlainFile(file);
        default:
            throw new Error(`Unsupported file type: ${ext}`);
    }
}
