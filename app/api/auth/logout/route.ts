/**
 * Logout API Route
 * Handles user logout
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST() {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (user) {
            logger.info({ userId: user.id }, "User logging out");
        }

        await supabase.auth.signOut();

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ error }, "Logout failed");
        return NextResponse.json(
            { success: false, error: "Logout failed" },
            { status: 500 }
        );
    }
}
