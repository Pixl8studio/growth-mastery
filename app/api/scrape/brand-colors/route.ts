/**
 * Brand Color Scraping API
 * Extracts brand colors and visual elements from a website
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";
import { fetchWithRetry, validateUrl, getCached, setCache } from "@/lib/scraping/fetch-utils";
import { extractBrandFromHtml } from "@/lib/scraping/brand-extractor";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.url || typeof body.url !== "string") {
            throw new ValidationError("URL is required and must be a string");
        }

        const url = body.url.trim();

        // Validate URL
        const validation = validateUrl(url);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        logger.info({ url }, "Starting brand color extraction");

        // Check cache first
        const cacheKey = `brand:${url}`;
        const cached = getCached<any>(cacheKey);
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
        setCache(cacheKey, brandData);

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

