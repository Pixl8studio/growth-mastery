/**
 * Web Scraping Intake API
 * Scrapes content from a provided URL (enrollment page, website, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/middleware/rate-limit";

/**
 * Request schema for intake scraping
 */
const IntakeScrapeRequestSchema = z.object({
    projectId: z.string().uuid("Invalid project ID"),
    userId: z.string().uuid("Invalid user ID"),
    url: z
        .string()
        .min(1, "URL is required")
        .url("Invalid URL format")
        .refine((url) => url.startsWith("http://") || url.startsWith("https://"), {
            message: "URL must start with http:// or https://",
        }),
    sessionName: z.string().optional(),
});

/**
 * POST /api/intake/scrape
 *
 * Scrapes content from a URL (enrollment page, website, etc.) for intake processing.
 * Extracts text content and brand data in parallel, validates content quality,
 * and saves to database with comprehensive metadata.
 * Implements 24-hour caching and rate limiting (10 requests per minute).
 *
 * @param request - Next.js request object
 * @returns {Promise<NextResponse>} Scraped content, brand data, and intake record details
 *
 * @example Request Body
 * ```json
 * {
 *   "projectId": "uuid-of-project",
 *   "userId": "uuid-of-user",
 *   "url": "https://example.com/enrollment",
 *   "sessionName": "Landing Page Content" // optional
 * }
 * ```
 *
 * @example Success Response (200)
 * ```json
 * {
 *   "success": true,
 *   "intakeId": "uuid-of-intake-record",
 *   "method": "scrape",
 *   "url": "https://example.com/enrollment",
 *   "preview": "First 200 characters of scraped content...",
 *   "brandData": {
 *     "colors": { "primary": "#3B82F6", ... },
 *     "fonts": { "primary": "Inter", ... },
 *     "confidence": { "overall": 85 }
 *   },
 *   "characterCount": 5420,
 *   "wordCount": 850
 * }
 * ```
 *
 * @throws {400} Missing required fields, invalid URL, insufficient content, or SSRF protection triggered
 * @throws {429} Rate limit exceeded (10 requests per minute)
 * @throws {500} Scraping failed, extraction error, or database save failed
 *
 * @description
 * This endpoint performs comprehensive web scraping with the following features:
 * - **Content Extraction**: Uses cheerio for semantic HTML parsing
 * - **Brand Extraction**: Automatically detects brand colors, fonts, and visual style
 * - **Content Validation**: Ensures sufficient quality and length
 * - **Parallel Processing**: Brand extraction doesn't block main scrape operation
 * - **Caching**: 24-hour cache reduces load and improves response time
 * - **Rate Limiting**: Per-user limits prevent abuse
 * - **SSRF Protection**: Blocks access to internal/private networks
 * - **Database Integration**: Saves to vapi_transcripts with metadata
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request body with Zod
        const parseResult = IntakeScrapeRequestSchema.safeParse(body);
        if (!parseResult.success) {
            const firstError = parseResult.error.errors[0];
            return NextResponse.json({ error: firstError.message }, { status: 400 });
        }

        const { projectId, userId, url, sessionName } = parseResult.data;

        // Check rate limit
        const identifier = getRateLimitIdentifier(request, userId);
        const rateLimitResponse = await checkRateLimit(identifier, "scraping");
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        // Validate URL using new infrastructure
        const urlValidation = validateUrl(url);
        if (!urlValidation.valid) {
            return NextResponse.json({ error: urlValidation.error }, { status: 400 });
        }

        logger.info(
            { url, projectId },
            "Starting intake scraping with brand extraction"
        );

        // Check cache first
        const cacheKey = `intake:${url}`;
        const cached = await getCached<{
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
                logger.warn(
                    { error, url },
                    "Failed to extract brand data (non-blocking)"
                );
                brandData = null;
            }

            // Cache the results
            await setCache(cacheKey, { scrapedText, brandData });
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
