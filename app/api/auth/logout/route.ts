/**
 * Logout API Route
 * Handles user logout
 */

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (user) {
            logger.info({ userId: user.id }, "User logging out");
        }

        await supabase.auth.signOut();

        return NextResponse.redirect(new URL("/login", request.url));
    } catch (error) {
        logger.error({ error }, "Logout failed");

        Sentry.captureException(error, {
            tags: {
                component: "api",
                action: "logout",
                endpoint: "POST /api/auth/logout",
            },
        });

        return NextResponse.json(
            { success: false, error: "Logout failed" },
            { status: 500 }
        );
    }
}
