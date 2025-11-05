/**
 * Referral Code Validation API
 * Validates referral codes during user signup
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";

interface ValidateReferralRequest {
    code: string;
}

interface ValidateReferralResponse {
    valid: boolean;
    message?: string;
}

/**
 * POST /api/auth/validate-referral
 * Validates a referral code
 */
export async function POST(request: NextRequest) {
    const requestLogger = logger.child({ handler: "validate-referral" });

    try {
        const body = (await request.json()) as ValidateReferralRequest;
        const { code } = body;

        // Validate input
        if (!code || typeof code !== "string") {
            throw new ValidationError("Referral code is required");
        }

        // Sanitize input - trim and convert to uppercase
        const sanitizedCode = code.trim().toUpperCase();

        // Validate format - alphanumeric only
        if (!/^[A-Z0-9]+$/.test(sanitizedCode)) {
            requestLogger.warn({ code: sanitizedCode }, "Invalid referral code format");
            return NextResponse.json(
                {
                    valid: false,
                    message: "Invalid referral code format",
                } as ValidateReferralResponse,
                { status: 200 }
            );
        }

        requestLogger.info({ code: sanitizedCode }, "Validating referral code");

        // Query database for active referral code
        const supabase = await createClient();

        const { data: referralCode, error } = await supabase
            .from("referral_codes")
            .select("*")
            .ilike("code", sanitizedCode)
            .eq("is_active", true)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                // No rows returned - code not found
                requestLogger.info(
                    { code: sanitizedCode },
                    "Referral code not found or inactive"
                );
                return NextResponse.json(
                    {
                        valid: false,
                        message: "Invalid or inactive referral code",
                    } as ValidateReferralResponse,
                    { status: 200 }
                );
            }
            throw error;
        }

        // Check max uses constraint
        if (
            referralCode.max_uses !== null &&
            referralCode.current_uses >= referralCode.max_uses
        ) {
            requestLogger.info(
                {
                    code: sanitizedCode,
                    current_uses: referralCode.current_uses,
                    max_uses: referralCode.max_uses,
                },
                "Referral code max uses reached"
            );
            return NextResponse.json(
                {
                    valid: false,
                    message: "This referral code has reached its usage limit",
                } as ValidateReferralResponse,
                { status: 200 }
            );
        }

        requestLogger.info(
            { code: sanitizedCode, id: referralCode.id },
            "Referral code validated successfully"
        );

        return NextResponse.json(
            {
                valid: true,
            } as ValidateReferralResponse,
            { status: 200 }
        );
    } catch (error) {
        requestLogger.error({ error }, "Failed to validate referral code");

        if (error instanceof ValidationError) {
            return NextResponse.json(
                {
                    valid: false,
                    message: error.message,
                } as ValidateReferralResponse,
                { status: 200 }
            );
        }

        return NextResponse.json(
            {
                valid: false,
                message: "Failed to validate referral code",
            } as ValidateReferralResponse,
            { status: 500 }
        );
    }
}
