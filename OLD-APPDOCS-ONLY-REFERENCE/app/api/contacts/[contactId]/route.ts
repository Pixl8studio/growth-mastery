/**
 * Contact Detail API
 * Get individual contact with full activity timeline
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface RouteParams {
    params: Promise<{
        contactId: string;
    }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const requestLogger = logger.child({ handler: "get-contact-detail" });
    const { contactId } = await params;

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        requestLogger.info({ userId: user.id, contactId }, "Fetching contact detail");

        // Get contact
        const { data: contact, error: contactError } = await supabase
            .from("contacts")
            .select("*, funnel_projects(name)")
            .eq("id", contactId)
            .eq("user_id", user.id)
            .single();

        if (contactError || !contact) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        // Get contact events
        const { data: events } = await supabase
            .from("contact_events")
            .select("*")
            .eq("contact_id", contactId)
            .order("created_at", { ascending: false })
            .limit(100);

        requestLogger.info({ contactId }, "Contact detail fetched successfully");

        return NextResponse.json({
            success: true,
            contact,
            events: events || [],
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to fetch contact detail");
        return NextResponse.json({ error: "Failed to fetch contact" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const requestLogger = logger.child({ handler: "update-contact" });
    const { contactId } = await params;

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { notes, tags } = body;

        requestLogger.info({ userId: user.id, contactId }, "Updating contact");

        const { data: contact, error } = await supabase
            .from("contacts")
            .update({
                notes: notes !== undefined ? notes : undefined,
                tags: tags !== undefined ? tags : undefined,
            })
            .eq("id", contactId)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        requestLogger.info({ contactId }, "Contact updated successfully");

        return NextResponse.json({
            success: true,
            contact,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to update contact");
        return NextResponse.json(
            { error: "Failed to update contact" },
            { status: 500 }
        );
    }
}
