/**
 * Brand Color Scraping API
 * Extracts brand colors and visual elements from a website
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";
import {
    fetchWithRetry,
    validateUrl,
    getCached,
    setCache,
} from "@/lib/scraping/fetch-utils";
import { extractBrandFromHtml } from "@/lib/scraping/brand-extractor";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/middleware/rate-limit";

/**
 * Request schema for brand color extraction
 */
const BrandColorRequestSchema = z.object({
    url: z
        .string()
        .min(1, "URL is required")
        .url("Invalid URL format")
        .refine((url) => url.startsWith("http://") || url.startsWith("https://"), {
            message: "URL must start with http:// or https://",
        }),
    projectId: z.string().uuid().optional(),
});

/**
 * POST /api/scrape/brand-colors
 *
 * Extracts brand colors, fonts, and visual elements from a website URL.
 * Uses intelligent HTML parsing with cheerio to identify primary, secondary, and accent colors.
 * Implements 24-hour caching and rate limiting (20 requests per minute).
 *
 * @param request - Next.js request object
 * @returns {Promise<NextResponse>} Brand data including colors, fonts, style, and confidence scores
 *
 * @example Request Body
 * ```json
 * {
 *   "url": "https://example.com",
 *   "projectId": "uuid-here" // optional
 * }
 * ```
 *
 * @example Success Response (200)
 * ```json
 * {
 *   "success": true,
 *   "colors": {
 *     "primary": "#3B82F6",
 *     "secondary": "#8B5CF6",
 *     "accent": "#EC4899",
 *     "background": "#FFFFFF",
 *     "text": "#1F2937"
 *   },
 *   "fonts": {
 *     "primary": "Inter",
 *     "secondary": "Roboto",
 *     "weights": ["400", "600", "700"]
 *   },
 *   "style": {
 *     "borderRadius": "8px",
 *     "shadows": true,
 *     "gradients": false
 *   },
 *   "confidence": {
 *     "colors": 85,
 *     "fonts": 80,
 *     "overall": 82
 *   },
 *   "url": "https://example.com",
 *   "cached": false
 * }
 * ```
 *
 * @throws {400} Invalid URL format or SSRF protection triggered
 * @throws {429} Rate limit exceeded (20 requests per minute)
 * @throws {500} Scraping failed or extraction error
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request body with Zod
        const parseResult = BrandColorRequestSchema.safeParse(body);
        if (!parseResult.success) {
            const firstError = parseResult.error.errors[0];
            throw new ValidationError(firstError.message);
        }

        const { url, projectId } = parseResult.data;

        // Check rate limit
        const identifier = getRateLimitIdentifier(request, body.userId);
        const rateLimitResponse = await checkRateLimit(identifier, "brand-colors");
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        // Validate URL
        const validation = validateUrl(url);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        logger.info({ url }, "Starting brand color extraction");

        // Check cache first
        const cacheKey = `brand:${url}`;
        const cached = await getCached<any>(cacheKey);
        if (cached) {
            logger.info({ url }, "Returning cached brand data");
            return NextResponse.json({
                success: true,
                ...cached,
                cached: true,
            });
        }

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

        // Extract brand data
        const brandData = await extractBrandFromHtml(fetchResult.html);

        logger.info(
            {
                url,
                confidence: brandData.confidence,
                colors: brandData.colors,
            },
            "Brand extraction complete"
        );

        // Cache the result
        await setCache(cacheKey, brandData);

        return NextResponse.json({
            success: true,
            colors: brandData.colors,
            fonts: brandData.fonts,
            style: brandData.style,
            confidence: brandData.confidence,
            url,
        });
    } catch (error) {
        logger.error({ error }, "Error in brand color extraction API");

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
            {
                error: "Failed to extract brand colors. Please try again or enter colors manually.",
            },
            { status: 500 }
        );
    }
}
