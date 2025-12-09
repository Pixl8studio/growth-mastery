/**
 * Gamma API Client
 * Wrapper around Gamma API for AI presentation generation
 */

import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import type { GammaDeckRequest, GammaDeckResponse, GammaSession } from "./types";

/**
 * Generate a Gamma presentation from text/markdown
 */
export async function generateDeck(
    request: GammaDeckRequest
): Promise<GammaDeckResponse> {
    const requestLogger = logger.child({ handler: "gamma-generate-deck" });

    try {
        requestLogger.info({ theme: request.theme }, "Generating Gamma deck");

        // TODO: Implement actual Gamma API call
        // const response = await retry(
        //     async () => {
        //         const res = await fetch(`${GAMMA_API_BASE}/decks/generate`, {
        //             method: 'POST',
        //             headers: {
        //                 'Authorization': `Bearer ${env.GAMMA_API_KEY}`,
        //                 'Content-Type': 'application/json'
        //             },
        //             body: JSON.stringify(request)
        //         });
        //
        //         if (!res.ok) {
        //             throw new Error(`Gamma API error: ${res.statusText}`);
        //         }
        //
        //         return res.json();
        //     },
        //     {
        //         maxAttempts: 3,
        //         delayMs: 2000,
        //         backoffMultiplier: 2
        //     }
        // );

        // Placeholder response
        const response: GammaDeckResponse = {
            sessionId: `gamma_session_${Date.now()}`,
            deckId: `deck_${Date.now()}`,
            deckUrl: `https://gamma.app/docs/${Date.now()}`,
            editUrl: `https://gamma.app/docs/${Date.now()}/edit`,
            status: "ready",
        };

        requestLogger.info(
            { sessionId: response.sessionId, deckId: response.deckId },
            "Gamma deck generated successfully"
        );

        return response;
    } catch (error) {
        requestLogger.error({ error, request }, "Failed to generate Gamma deck");

        Sentry.captureException(error, {
            tags: {
                service: "gamma",
                operation: "generate_deck",
            },
            extra: {
                theme: request.theme,
                hasText: !!request.text,
            },
        });

        throw new Error(
            `Failed to generate deck: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Get deck status
 */
export async function getDeckStatus(deckId: string): Promise<{
    status: "generating" | "ready" | "failed";
    deckUrl?: string;
}> {
    try {
        logger.info({ deckId }, "Fetching Gamma deck status");

        // TODO: Implement actual Gamma API call
        // const response = await fetch(`${GAMMA_API_BASE}/decks/${deckId}`, {
        //     headers: {
        //         'Authorization': `Bearer ${env.GAMMA_API_KEY}`
        //     }
        // });
        //
        // if (!res.ok) {
        //     throw new Error(`Gamma API error: ${res.statusText}`);
        // }
        //
        // return res.json();

        return {
            status: "ready",
            deckUrl: `https://gamma.app/docs/${deckId}`,
        };
    } catch (error) {
        logger.error({ error, deckId }, "Failed to fetch deck status");

        Sentry.captureException(error, {
            tags: {
                service: "gamma",
                operation: "get_deck_status",
            },
            extra: {
                deckId,
            },
        });

        throw new Error(
            `Failed to get deck status: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Create a Gamma session
 */
export async function createSession(): Promise<GammaSession> {
    try {
        logger.info("Creating Gamma session");

        // TODO: Implement actual Gamma API call
        // const response = await fetch(`${GAMMA_API_BASE}/sessions`, {
        //     method: 'POST',
        //     headers: {
        //         'Authorization': `Bearer ${env.GAMMA_API_KEY}`,
        //         'Content-Type': 'application/json'
        //     }
        // });
        //
        // if (!response.ok) {
        //     throw new Error(`Gamma API error: ${response.statusText}`);
        // }
        //
        // return response.json();

        const session: GammaSession = {
            sessionId: `session_${Date.now()}`,
            status: "active",
            createdAt: new Date().toISOString(),
        };

        logger.info({ sessionId: session.sessionId }, "Gamma session created");

        return session;
    } catch (error) {
        logger.error({ error }, "Failed to create Gamma session");

        Sentry.captureException(error, {
            tags: {
                service: "gamma",
                operation: "create_session",
            },
        });

        throw new Error(
            `Failed to create session: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
}

/**
 * Convert deck structure to Gamma-compatible markdown
 */
export function deckStructureToMarkdown(
    slides: {
        slideNumber: number;
        title: string;
        description: string;
        section: string;
    }[]
): string {
    let markdown = "";

    slides.forEach((slide) => {
        // Add slide as H2 heading
        markdown += `## ${slide.title}\n\n`;
        // Add description as content
        markdown += `${slide.description}\n\n`;
    });

    return markdown;
}
