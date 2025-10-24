/**
 * Logout API Route
 * Handles user logout
 */

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
        return NextResponse.json(
            { success: false, error: "Logout failed" },
            { status: 500 }
        );
    }
}
