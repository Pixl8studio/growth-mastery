/**
 * Gamma Decks API Route
 * Fetches gamma decks for a project (server-side to avoid CORS)
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

        // Fetch gamma decks for the project
        const { data: gammaDecks, error: gammaError } = await supabase
            .from("gamma_decks")
            .select("*")
            .eq("funnel_project_id", projectId)
            .order("created_at", { ascending: false });

        if (gammaError) {
            logger.error({ error: gammaError, action: "fetch_gamma_decks" }, "Failed to fetch gamma decks");
            Sentry.captureException(gammaError, {
                tags: { component: "api", action: "fetch_gamma_decks" },
            });
            return NextResponse.json(
                { error: "Failed to fetch gamma decks" },
                { status: 500 }
            );
        }

        return NextResponse.json({ gammaDecks: gammaDecks || [] });
    } catch (error) {
        logger.error({ error, action: "gamma_decks_api" }, "Gamma decks API error");
        Sentry.captureException(error, {
            tags: { component: "api", action: "gamma_decks_api" },
        });
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { projectId } = await params;
        const { searchParams } = new URL(request.url);
        const deckId = searchParams.get("deckId");

        if (!projectId || !deckId) {
            return NextResponse.json(
                { error: "Project ID and Deck ID are required" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Delete the gamma deck (with user_id check for security)
        const { error: deleteError } = await supabase
            .from("gamma_decks")
            .delete()
            .eq("id", deckId)
            .eq("funnel_project_id", projectId)
            .eq("user_id", user.id);

        if (deleteError) {
            logger.error({ error: deleteError, action: "delete_gamma_deck" }, "Failed to delete gamma deck");
            Sentry.captureException(deleteError, {
                tags: { component: "api", action: "delete_gamma_deck" },
            });
            return NextResponse.json(
                { error: "Failed to delete gamma deck" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ error, action: "delete_gamma_deck" }, "Delete gamma deck API error");
        Sentry.captureException(error, {
            tags: { component: "api", action: "delete_gamma_deck" },
        });
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { projectId } = await params;
        const body = await request.json();
        const { deckId, title } = body;

        if (!projectId || !deckId) {
            return NextResponse.json(
                { error: "Project ID and Deck ID are required" },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Update the gamma deck title (with user_id check for security)
        const { data: updatedDeck, error: updateError } = await supabase
            .from("gamma_decks")
            .update({ title: title?.trim() })
            .eq("id", deckId)
            .eq("funnel_project_id", projectId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (updateError) {
            logger.error({ error: updateError, action: "update_gamma_deck" }, "Failed to update gamma deck");
            Sentry.captureException(updateError, {
                tags: { component: "api", action: "update_gamma_deck" },
            });
            return NextResponse.json(
                { error: "Failed to update gamma deck" },
                { status: 500 }
            );
        }

        return NextResponse.json({ gammaDeck: updatedDeck });
    } catch (error) {
        logger.error({ error, action: "update_gamma_deck" }, "Update gamma deck API error");
        Sentry.captureException(error, {
            tags: { component: "api", action: "update_gamma_deck" },
        });
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
