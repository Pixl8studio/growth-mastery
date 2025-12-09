/**
 * Gamma deck export endpoint
 * Generates export URLs for PDF and Google Slides
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
    const requestLogger = logger.child({ handler: "gamma-export" });

    try {
        const body = await req.json();
        const { deckUrl, format } = body;

        if (!deckUrl) {
            throw new ValidationError("Deck URL is required");
        }

        if (!format || !["pdf", "google-slides"].includes(format)) {
            throw new ValidationError("Format must be 'pdf' or 'google-slides'");
        }

        requestLogger.info({ deckUrl, format }, "Generating export URL");

        const exportUrl = generateGammaExportUrl(deckUrl, format);

        requestLogger.info({ exportUrl }, "Export URL generated");

        return NextResponse.json({
            success: true,
            exportUrl,
            format,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to generate export URL");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/gamma/export",
            },
        });

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
            { error: "Failed to generate export URL" },
            { status: 500 }
        );
    }
}

/**
 * Generate Gamma export URL based on format
 *
 * Since Gamma doesn't have a public export API, we return the deck URL
 * with metadata about the desired export format. The client will handle
 * opening the deck and providing export instructions.
 */
function generateGammaExportUrl(deckUrl: string, format: string): string {
    if (!deckUrl) {
        throw new ValidationError("Invalid deck URL");
    }

    switch (format) {
        case "pdf":
        case "google-slides":
            return deckUrl;
        default:
            throw new ValidationError(`Unsupported format: ${format}`);
    }
}
