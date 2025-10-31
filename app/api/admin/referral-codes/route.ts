/**
 * Referral Code Management API
 * Admin endpoint for managing referral codes (future admin panel support)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { ValidationError, AuthenticationError } from "@/lib/errors";

/**
 * GET /api/admin/referral-codes
 * List all referral codes with usage stats
 */
export async function GET(request: NextRequest) {
    const requestLogger = logger.child({ handler: "list-referral-codes" });

    try {
        // TODO: Add admin authentication check when admin system is implemented
        // For now, this endpoint requires authentication but doesn't check for admin role

        const supabase = await createClient();

        // Check if user is authenticated
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new AuthenticationError("Authentication required");
        }

        requestLogger.info({ userId: user.id }, "Listing referral codes");

        // Fetch all referral codes with usage stats
        const { data: referralCodes, error } = await supabase
            .from("referral_codes")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        requestLogger.info(
            { count: referralCodes.length },
            "Retrieved referral codes successfully"
        );

        return NextResponse.json({ referralCodes }, { status: 200 });
    } catch (error) {
        requestLogger.error({ error }, "Failed to list referral codes");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        return NextResponse.json(
            { error: "Failed to list referral codes" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/referral-codes
 * Create a new referral code
 */
export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "create-referral-code" });

    try {
        // TODO: Add admin authentication check when admin system is implemented

        const supabase = await createClient();

        // Check if user is authenticated
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new AuthenticationError("Authentication required");
        }

        const body = await request.json();
        const { code, description, max_uses } = body;

        // Validate input
        if (!code || typeof code !== "string") {
            throw new ValidationError("Code is required");
        }

        // Sanitize and validate code
        const sanitizedCode = code.trim().toUpperCase();

        if (!/^[A-Z0-9]+$/.test(sanitizedCode)) {
            throw new ValidationError("Code must contain only alphanumeric characters");
        }

        if (sanitizedCode.length < 3 || sanitizedCode.length > 50) {
            throw new ValidationError("Code must be between 3 and 50 characters");
        }

        requestLogger.info(
            { userId: user.id, code: sanitizedCode },
            "Creating referral code"
        );

        // Insert new referral code
        const { data: newCode, error } = await supabase
            .from("referral_codes")
            .insert({
                code: sanitizedCode,
                description: description || null,
                max_uses: max_uses || null,
                is_active: true,
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                // Unique violation
                throw new ValidationError("This referral code already exists");
            }
            throw error;
        }

        requestLogger.info(
            { codeId: newCode.id, code: sanitizedCode },
            "Referral code created successfully"
        );

        return NextResponse.json({ referralCode: newCode }, { status: 201 });
    } catch (error) {
        requestLogger.error({ error }, "Failed to create referral code");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
            { error: "Failed to create referral code" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/referral-codes
 * Update a referral code
 */
export async function PATCH(request: NextRequest) {
    const requestLogger = logger.child({ handler: "update-referral-code" });

    try {
        // TODO: Add admin authentication check when admin system is implemented

        const supabase = await createClient();

        // Check if user is authenticated
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new AuthenticationError("Authentication required");
        }

        const body = await request.json();
        const { id, is_active, max_uses, description } = body;

        // Validate input
        if (!id || typeof id !== "string") {
            throw new ValidationError("Code ID is required");
        }

        requestLogger.info({ userId: user.id, codeId: id }, "Updating referral code");

        // Build update object
        const updates: {
            is_active?: boolean;
            max_uses?: number | null;
            description?: string | null;
        } = {};

        if (typeof is_active === "boolean") {
            updates.is_active = is_active;
        }

        if (max_uses !== undefined) {
            updates.max_uses = max_uses || null;
        }

        if (description !== undefined) {
            updates.description = description || null;
        }

        // Update referral code
        const { data: updatedCode, error } = await supabase
            .from("referral_codes")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        requestLogger.info(
            { codeId: id, updates },
            "Referral code updated successfully"
        );

        return NextResponse.json({ referralCode: updatedCode }, { status: 200 });
    } catch (error) {
        requestLogger.error({ error }, "Failed to update referral code");

        if (error instanceof AuthenticationError) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(
            { error: "Failed to update referral code" },
            { status: 500 }
        );
    }
}
