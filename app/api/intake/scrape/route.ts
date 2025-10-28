/**
 * Web Scraping Intake API
 * Scrapes content from a provided URL (enrollment page, website, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { extractTextFromUrl, validateIntakeContent } from "@/lib/intake/processors";

export async function POST(request: NextRequest) {
    try {
        const { projectId, userId, url, sessionName } = await request.json();

        if (!projectId || !userId || !url) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Validate URL format
        let validUrl: URL;
        try {
            validUrl = new URL(url);
        } catch {
            return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
        }

        // Only allow http/https
        if (!["http:", "https:"].includes(validUrl.protocol)) {
            return NextResponse.json(
                { error: "Only HTTP(S) URLs are supported" },
                { status: 400 }
            );
        }

        // Extract text from URL
        let scrapedText: string;
        try {
            scrapedText = await extractTextFromUrl(url);
        } catch (error) {
            logger.error({ error, url }, "Failed to scrape URL");
            return NextResponse.json(
                { error: "Failed to scrape URL. Please check the URL and try again." },
                { status: 500 }
            );
        }

        // Validate scraped content
        const validation = validateIntakeContent(scrapedText);
        if (!validation.valid) {
            return NextResponse.json(
                {
                    error:
                        validation.reason ||
                        "Scraped content is insufficient. Please try a different URL.",
                },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Save to database
        const { data: intakeRecord, error: dbError } = await supabase
            .from("vapi_transcripts")
            .insert({
                funnel_project_id: projectId,
                user_id: userId,
                intake_method: "scrape",
                scraped_url: url,
                transcript_text: scrapedText,
                call_status: "completed",
                call_duration: 0,
                session_name: sessionName || `Scraped: ${validUrl.hostname}`,
                metadata: {
                    scraped_url: url,
                    hostname: validUrl.hostname,
                    character_count: scrapedText.length,
                    word_count: scrapedText.split(/\s+/).length,
                    scraped_at: new Date().toISOString(),
                },
            })
            .select()
            .single();

        if (dbError) {
            logger.error({ error: dbError, projectId }, "Failed to save scraped data");
            return NextResponse.json(
                { error: "Failed to save scraped data" },
                { status: 500 }
            );
        }

        logger.info(
            {
                intakeId: intakeRecord.id,
                projectId,
                url,
                textLength: scrapedText.length,
            },
            "URL scraped and processed successfully"
        );

        return NextResponse.json({
            success: true,
            intakeId: intakeRecord.id,
            method: "scrape",
            url,
            preview: scrapedText.substring(0, 200) + "...",
        });
    } catch (error) {
        logger.error({ error }, "Error in scrape intake endpoint");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
