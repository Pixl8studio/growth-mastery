/**
 * Analytics Tracking API
 * Tracks funnel events and updates contact engagement
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
    sendWebhook,
    buildVideoWatchedPayload,
    buildEnrollmentViewedPayload,
} from "@/lib/webhook-service";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

// Validation schemas
const trackAnalyticsSchema = z.object({
    eventType: z.string().min(1, "Event type is required"),
    pageType: z.enum(["registration", "watch", "enrollment", "thank_you"]).optional(),
    pageId: z.string().uuid("Invalid page ID").optional(),
    funnelProjectId: z.string().uuid("Invalid project ID"),
    contactId: z.string().uuid("Invalid contact ID").optional(),
    visitorId: z.string().max(255).optional(),
    sessionId: z.string().max(255).optional(),
    eventData: z.record(z.string(), z.unknown()).optional(),
    utmData: z
        .object({
            source: z.string().max(255).optional(),
            medium: z.string().max(255).optional(),
            campaign: z.string().max(255).optional(),
            term: z.string().max(255).optional(),
            content: z.string().max(255).optional(),
        })
        .optional(),
});

type AnalyticsEventData = {
    percentage?: number;
    duration?: number;
    pageType?: string;
    pageId?: string;
    sessionId?: string;
    offerId?: string;
};

type ContactUpdateData = {
    last_activity_at: string;
    current_stage?: string;
    stages_completed?: string[];
    video_watch_percentage?: number;
    video_watch_duration?: number;
    video_watched_at?: string;
    video_completion_events?: number[];
    enrollment_page_id?: string;
};

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "track-analytics" });

    try {
        const body = await request.json();

        // Validate input with Zod
        const validationResult = trackAnalyticsSchema.safeParse(body);
        if (!validationResult.success) {
            requestLogger.warn(
                { errors: validationResult.error.issues },
                "Invalid analytics data"
            );
            return NextResponse.json(
                {
                    error: "Invalid input",
                    details: validationResult.error.issues,
                },
                { status: 400 }
            );
        }

        const {
            eventType,
            pageType,
            pageId,
            funnelProjectId,
            contactId,
            visitorId,
            sessionId,
            eventData,
            utmData,
        } = validationResult.data;

        requestLogger.info({ eventType, pageType, pageId }, "Tracking analytics event");

        const supabase = await createClient();

        // Log analytics event
        const { error: analyticsError } = await supabase
            .from("funnel_analytics")
            .insert({
                funnel_project_id: funnelProjectId,
                event_type: eventType,
                page_type: pageType,
                page_id: pageId,
                visitor_id: visitorId,
                session_id: sessionId,
                event_data: eventData,
                utm_source: utmData?.source,
                utm_medium: utmData?.medium,
                utm_campaign: utmData?.campaign,
                utm_term: utmData?.term,
                utm_content: utmData?.content,
            });

        if (analyticsError) {
            requestLogger.error({ error: analyticsError }, "Failed to log analytics");
        }

        // Update contact if provided
        if (contactId) {
            await updateContactEngagement(contactId, eventType, eventData, supabase);
        }

        requestLogger.info({ eventType }, "Analytics event tracked successfully");

        return NextResponse.json({
            success: true,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to track analytics");
        return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
    }
}

/**
 * Update contact engagement based on event type
 */
async function updateContactEngagement(
    contactId: string,
    eventType: string,
    eventData: Record<string, unknown> | undefined,
    supabase: SupabaseClient
) {
    const requestLogger = logger.child({ contactId, eventType });

    try {
        // Get current contact
        const { data: contact } = await supabase
            .from("contacts")
            .select("*")
            .eq("id", contactId)
            .single();

        if (!contact) return;

        const updateData: ContactUpdateData = {
            last_activity_at: new Date().toISOString(),
        };

        // Cast eventData to the expected type for type safety
        const typedEventData = eventData as AnalyticsEventData | undefined;

        switch (eventType) {
            case "video_start":
                updateData.current_stage = "watched";
                updateData.stages_completed = ["registration", "watch"];
                break;

            case "video_progress":
                const percentage = typedEventData?.percentage || 0;
                const duration = typedEventData?.duration || 0;

                updateData.video_watch_percentage = Math.max(
                    contact.video_watch_percentage || 0,
                    percentage
                );
                updateData.video_watch_duration = duration;
                updateData.video_watched_at = new Date().toISOString();

                // Track completion milestones
                const milestones = contact.video_completion_events || [];
                if (percentage >= 25 && !milestones.includes(25)) milestones.push(25);
                if (percentage >= 50 && !milestones.includes(50)) milestones.push(50);
                if (percentage >= 75 && !milestones.includes(75)) milestones.push(75);
                if (percentage >= 100 && !milestones.includes(100))
                    milestones.push(100);

                updateData.video_completion_events = milestones;

                // Send webhook for significant milestones
                if (
                    [25, 50, 75, 100].includes(percentage) &&
                    !milestones.includes(percentage)
                ) {
                    void sendWebhook(
                        contact.user_id,
                        buildVideoWatchedPayload({
                            contactId: contact.id,
                            email: contact.email,
                            name: contact.name || "",
                            watchPercentage: percentage,
                            watchDuration: duration,
                            funnelProjectId: contact.funnel_project_id,
                            pageId: typedEventData?.pageId || "",
                        }),
                        {
                            pageId: typedEventData?.pageId,
                            pageType: "watch",
                        }
                    );
                }
                break;

            case "enrollment.viewed":
                updateData.current_stage = "enrolled";
                updateData.stages_completed = ["registration", "watch", "enrollment"];
                updateData.enrollment_page_id = typedEventData?.pageId;

                // Send webhook
                void sendWebhook(
                    contact.user_id,
                    buildEnrollmentViewedPayload({
                        contactId: contact.id,
                        email: contact.email,
                        name: contact.name || "",
                        funnelProjectId: contact.funnel_project_id,
                        offerId: typedEventData?.offerId || "",
                        pageId: typedEventData?.pageId || "",
                    }),
                    {
                        pageId: typedEventData?.pageId,
                        pageType: "enrollment",
                    }
                );
                break;

            case "purchase":
                updateData.current_stage = "purchased";
                updateData.stages_completed = [
                    "registration",
                    "watch",
                    "enrollment",
                    "purchased",
                ];
                break;
        }

        // Update contact
        await supabase.from("contacts").update(updateData).eq("id", contactId);

        // Log contact event
        await supabase.from("contact_events").insert({
            contact_id: contactId,
            funnel_project_id: contact.funnel_project_id,
            event_type: eventType,
            page_type: typedEventData?.pageType,
            page_id: typedEventData?.pageId,
            event_data: eventData,
            session_id: typedEventData?.sessionId,
            visitor_id: contact.visitor_id,
        });

        requestLogger.info({ contactId }, "Contact engagement updated");
    } catch (error) {
        requestLogger.error({ error }, "Failed to update contact engagement");
    }
}
