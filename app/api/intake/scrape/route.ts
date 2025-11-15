/**
 * Web Scraping Intake API
 * Scrapes content from a provided URL (enrollment page, website, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { extractTextFromUrl, validateIntakeContent } from "@/lib/intake/processors";
import {
    fetchWithRetry,
    validateUrl,
    getCached,
    setCache,
} from "@/lib/scraping/fetch-utils";
import { extractBrandFromHtml, BrandData } from "@/lib/scraping/brand-extractor";

export async function POST(request: NextRequest) {
    try {
        const { projectId, userId, url, sessionName } = await request.json();

        if (!projectId || !userId || !url) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Validate URL using new infrastructure
        const validation = validateUrl(url);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        logger.info({ url, projectId }, "Starting intake scraping with brand extraction");

        // Check cache first
        const cacheKey = `intake:${url}`;
        const cached = getCached<{
            scrapedText: string;
            brandData: BrandData | null;
        }>(cacheKey);

        let scrapedText: string;
        let brandData: BrandData | null = null;

        if (cached) {
            logger.info({ url }, "Using cached intake data");
            scrapedText = cached.scrapedText;
            brandData = cached.brandData;
        } else {
            // Fetch HTML with retry logic
            const fetchResult = await fetchWithRetry(url, {
                maxRetries: 3,
                timeoutMs: 30000,
            });

            if (!fetchResult.success || !fetchResult.html) {
                logger.error({ url, error: fetchResult.error }, "Failed to fetch URL");
                return NextResponse.json(
                    {
                        error:
                            fetchResult.error ||
                            "Failed to fetch website. Please check the URL and try again.",
                    },
                    { status: fetchResult.statusCode || 500 }
                );
            }

            // Extract text content
            try {
                scrapedText = await extractTextFromUrl(url);
            } catch (error) {
                logger.error({ error, url }, "Failed to extract text from URL");
                return NextResponse.json(
                    {
                        error: "Failed to extract content from URL. The website structure may not be supported.",
                    },
                    { status: 500 }
                );
            }

            // Extract brand data in parallel (don't block on failure)
            try {
                brandData = await extractBrandFromHtml(fetchResult.html);
                logger.info(
                    {
                        url,
                        brandConfidence: brandData.confidence.overall,
                    },
                    "Successfully extracted brand data"
                );
            } catch (error) {
                logger.warn({ error, url }, "Failed to extract brand data (non-blocking)");
                brandData = null;
            }

            // Cache the results
            setCache(cacheKey, { scrapedText, brandData });
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

        // Parse URL for metadata
        const urlObj = new URL(url);

        // Save to database with brand data
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
                session_name: sessionName || `Scraped: ${urlObj.hostname}`,
                brand_data: brandData
                    ? {
                          ...brandData,
                          source_url: url,
                          extracted_at: new Date().toISOString(),
                      }
                    : null,
                metadata: {
                    scraped_url: url,
                    hostname: urlObj.hostname,
                    character_count: scrapedText.length,
                    word_count: scrapedText.split(/\s+/).length,
                    scraped_at: new Date().toISOString(),
                    has_brand_data: !!brandData,
                    brand_confidence: brandData?.confidence.overall || 0,
                },
            })
            .select()
            .single();

        if (dbError) {
            logger.error(
                {
                    error: dbError,
                    projectId,
                    errorMessage: dbError.message,
                    errorCode: dbError.code,
                },
                "Failed to save scraped data"
            );
            return NextResponse.json(
                {
                    error: "Failed to save scraped data. Please try again.",
                },
                { status: 500 }
            );
        }

        logger.info(
            {
                intakeId: intakeRecord.id,
                projectId,
                url,
                textLength: scrapedText.length,
                hasBrandData: !!brandData,
            },
            "URL scraped and processed successfully"
        );

        return NextResponse.json({
            success: true,
            intakeId: intakeRecord.id,
            method: "scrape",
            url,
            preview: scrapedText.substring(0, 200) + "...",
            brandData: brandData
                ? {
                      colors: brandData.colors,
                      fonts: brandData.fonts,
                      confidence: brandData.confidence,
                  }
                : null,
        });
    } catch (error) {
        logger.error({ error }, "Error in scrape intake endpoint");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
