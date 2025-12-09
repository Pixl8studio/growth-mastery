/**
 * Deck Structures API Route
 * Fetches deck structures for a project (server-side to avoid CORS)
 */

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { projectId } = await params;

        if (!projectId) {
            return NextResponse.json(
                { error: "Project ID is required" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Verify project ownership
        const { data: project, error: projectError } = await supabase
            .from("funnel_projects")
            .select("id")
            .eq("id", projectId)
            .eq("user_id", user.id)
            .single();

        if (projectError || !project) {
            return NextResponse.json(
                { error: "Project not found or access denied" },
                { status: 404 }
            );
        }

        // Fetch deck structures for the project
        const { data: deckStructures, error: deckError } = await supabase
            .from("deck_structures")
            .select("*")
            .eq("funnel_project_id", projectId)
            .order("created_at", { ascending: false });

        if (deckError) {
            logger.error(
                { error: deckError, action: "fetch_deck_structures" },
                "Failed to fetch deck structures"
            );
            Sentry.captureException(deckError, {
                tags: { component: "api", action: "fetch_deck_structures" },
            });
            return NextResponse.json(
                { error: "Failed to fetch deck structures" },
                { status: 500 }
            );
        }

        return NextResponse.json({ deckStructures: deckStructures || [] });
    } catch (error) {
        logger.error(
            { error, action: "deck_structures_api" },
            "Deck structures API error"
        );
        Sentry.captureException(error, {
            tags: { component: "api", action: "deck_structures_api" },
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
