/**
 * API Route: Rewrite Field for Enrollment Page
 * Generates 3 AI-powered rewrite options for a specific field
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { generateTextWithAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ pageId: string }> }
) {
    try {
        // Authenticate user
        const { user } = await getCurrentUserWithProfile();

        const { pageId } = await params;
        const { fieldContent, fieldType } = await request.json();

        if (!fieldContent || !fieldType) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        logger.info(
            { pageId, fieldType, userEmail: user.email },
            "Generating field rewrites"
        );

        // Define style variants based on field type
        const styles = {
            heading: [
                "Professional and Direct",
                "Conversational and Engaging",
                "Action-Oriented and Urgent",
            ],
            subheading: [
                "Clear and Benefit-Focused",
                "Emotional and Relatable",
                "Data-Driven and Credible",
            ],
            body: [
                "Concise and Scannable",
                "Detailed and Informative",
                "Story-Driven and Personal",
            ],
            cta: [
                "Direct Call-to-Action",
                "Value-Focused Promise",
                "Risk-Free Invitation",
            ],
        };

        const fieldStyles = styles[fieldType as keyof typeof styles] || styles.heading;

        // Generate 3 rewrite options with different styles
        const optionsPromises = fieldStyles.map(async (style, index) => {
            const prompt = `Rewrite the following ${fieldType} for an enrollment/sales page in a ${style.toLowerCase()} style.

Original content: "${fieldContent}"

Requirements:
- Keep the core message but adjust the tone to match the style
- Make it compelling and conversion-focused
- Keep it concise (${fieldType === "heading" ? "10-15 words" : fieldType === "subheading" ? "15-25 words" : fieldType === "cta" ? "2-5 words" : "30-50 words"})
- Focus on value proposition and benefits
- Use active voice
- Address purchase objections where appropriate

Provide ONLY the rewritten content, no explanations or quotes.`;

            const rewrite = await generateTextWithAI(
                [
                    {
                        role: "system",
                        content:
                            "You are an expert sales copywriter specializing in high-converting enrollment pages.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                {
                    temperature: 0.8,
                    maxTokens: 150,
                }
            );

            return {
                id: `option-${index + 1}`,
                content: rewrite.trim(),
                style,
            };
        });

        const options = await Promise.all(optionsPromises);

        logger.info(
            { pageId, optionsGenerated: options.length },
            "Field rewrites generated successfully"
        );

        return NextResponse.json({
            success: true,
            options,
        });
    } catch (error) {
        const { pageId } = await params;
        logger.error({ error, pageId }, "Field rewrite generation failed");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                endpoint: "POST /api/pages/enrollment/[pageId]/rewrite-field",
            },
            extra: { pageId },
        });

        return NextResponse.json(
            { error: "Failed to generate rewrites" },
            { status: 500 }
        );
    }
}
