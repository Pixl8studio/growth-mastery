/**
 * Contacts API
 * CRUD operations for contact management
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { PAGINATION, APP_CONFIG } from "@/lib/config";
import { sendWebhook, buildRegistrationPayload } from "@/lib/webhook-service";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

// Validation schemas
const createContactSchema = z.object({
    email: z.string().email("Invalid email address"),
    name: z.string().min(1, "Name is required").max(255),
    funnelProjectId: z.string().uuid("Invalid project ID"),
    registrationPageId: z.string().uuid("Invalid page ID").optional(),
    visitorId: z.string().max(255).optional(),
    utmData: z
        .object({
            source: z.string().max(255).optional(),
            medium: z.string().max(255).optional(),
            campaign: z.string().max(255).optional(),
            term: z.string().max(255).optional(),
            content: z.string().max(255).optional(),
        })
        .optional(),
    userAgent: z.string().max(500).optional(),
    referrer: z.string().url().optional().or(z.literal("")),
});

/**
 * Sanitize search input to prevent SQL injection
 * Removes special characters that could be used in SQL injection attacks
 */
function sanitizeSearchInput(input: string): string {
    // Remove special SQL characters and wildcards that could be exploited
    return input.replace(/[%_\\]/g, "").trim();
}

export async function GET(request: NextRequest) {
    const requestLogger = logger.child({ handler: "get-contacts" });

    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse query params for filtering
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = Math.min(
            parseInt(
                searchParams.get("pageSize") || String(PAGINATION.defaultPageSize)
            ),
            PAGINATION.maxPageSize
        );
        const funnelProjectId = searchParams.get("funnelProjectId");
        const stage = searchParams.get("stage");
        const search = searchParams.get("search");

        requestLogger.info({ userId: user.id, page, pageSize }, "Fetching contacts");

        // Build query
        let query = supabase
            .from("contacts")
            .select("*, funnel_projects(name)", { count: "exact" })
            .eq("user_id", user.id);

        // Apply filters
        if (funnelProjectId) {
            query = query.eq("funnel_project_id", funnelProjectId);
        }

        if (stage) {
            query = query.eq("current_stage", stage);
        }

        if (search) {
            // Sanitize search input to prevent SQL injection
            const sanitizedSearch = sanitizeSearchInput(search);
            if (sanitizedSearch) {
                query = query.or(
                    `email.ilike.%${sanitizedSearch}%,name.ilike.%${sanitizedSearch}%`
                );
            }
        }

        // Pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        query = query.range(from, to).order("created_at", { ascending: false });

        const { data: contacts, error, count } = await query;

        if (error) {
            throw error;
        }

        requestLogger.info({ userId: user.id, count }, "Contacts fetched successfully");

        return NextResponse.json({
            success: true,
            contacts,
            pagination: {
                page,
                pageSize,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / pageSize),
            },
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to fetch contacts");
        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "fetch_contacts",
                endpoint: "GET /api/contacts",
            },
            extra: {},
        });
        return NextResponse.json(
            { error: "Failed to fetch contacts" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "create-contact" });

    try {
        const supabase = await createClient();

        const body = await request.json();

        // Validate input with Zod
        const validationResult = createContactSchema.safeParse(body);
        if (!validationResult.success) {
            requestLogger.warn(
                { errors: validationResult.error.issues },
                "Invalid contact data"
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
            email,
            name,
            funnelProjectId,
            registrationPageId,
            visitorId,
            utmData,
            userAgent,
            referrer,
        } = validationResult.data;

        requestLogger.info({ email, funnelProjectId }, "Creating contact");

        // Get funnel project to find user_id
        const { data: project } = await supabase
            .from("funnel_projects")
            .select("user_id")
            .eq("id", funnelProjectId)
            .single();

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Create or update contact
        const { data: contact, error } = await supabase
            .from("contacts")
            .upsert(
                {
                    user_id: project.user_id,
                    funnel_project_id: funnelProjectId,
                    email,
                    name,
                    registration_page_id: registrationPageId,
                    current_stage: "registered",
                    stages_completed: ["registration"],
                    visitor_id: visitorId,
                    utm_source: utmData?.source,
                    utm_medium: utmData?.medium,
                    utm_campaign: utmData?.campaign,
                    utm_term: utmData?.term,
                    utm_content: utmData?.content,
                    referrer,
                    user_agent: userAgent,
                },
                {
                    onConflict: "user_id,email,funnel_project_id",
                    ignoreDuplicates: false,
                }
            )
            .select()
            .single();

        if (error) {
            throw error;
        }

        requestLogger.info({ contactId: contact.id }, "Contact created successfully");

        // Get funnel project details for webhook payload
        const { data: projectDetails } = await supabase
            .from("funnel_projects")
            .select("name, slug")
            .eq("id", funnelProjectId)
            .single();

        // Get user profile for webhook URL construction
        const { data: userProfile } = await supabase
            .from("user_profiles")
            .select("username")
            .eq("id", project.user_id)
            .single();

        // Send webhook notification (non-blocking)
        if (projectDetails && userProfile) {
            const pageUrl = registrationPageId
                ? `${APP_CONFIG.url}/${userProfile.username}/${projectDetails.slug}/register`
                : `${APP_CONFIG.url}/${userProfile.username}/${projectDetails.slug}`;

            void (async () => {
                try {
                    const webhookPayload = buildRegistrationPayload({
                        email,
                        name,
                        funnelProjectId,
                        funnelProjectName: projectDetails.name,
                        pageId: registrationPageId || funnelProjectId,
                        pageUrl,
                        visitorId: visitorId || contact.id,
                        userAgent,
                        referrer,
                        utmParams: utmData
                            ? {
                                  source: utmData.source,
                                  medium: utmData.medium,
                                  campaign: utmData.campaign,
                                  term: utmData.term,
                                  content: utmData.content,
                              }
                            : undefined,
                    });

                    await sendWebhook(project.user_id, webhookPayload, {
                        pageId: registrationPageId || undefined,
                        pageType: registrationPageId ? "registration" : undefined,
                    });
                    requestLogger.info(
                        { contactId: contact.id },
                        "Webhook sent for new contact"
                    );
                } catch (webhookError) {
                    // Log but don't fail the request
                    requestLogger.error(
                        { error: webhookError, contactId: contact.id },
                        "Failed to send webhook"
                    );
                    Sentry.captureException(webhookError, {
                        tags: {
                            component: "api",
                            action: "send_webhook",
                            endpoint: "POST /api/contacts",
                        },
                        extra: {
                            contactId: contact.id,
                            funnelProjectId,
                        },
                    });
                }
            })();
        }

        return NextResponse.json({
            success: true,
            contact,
        });
    } catch (error) {
        requestLogger.error({ error }, "Failed to create contact");
        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "create_contact",
                endpoint: "POST /api/contacts",
            },
            extra: {},
        });
        return NextResponse.json(
            { error: "Failed to create contact" },
            { status: 500 }
        );
    }
}
