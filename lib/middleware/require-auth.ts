/**
 * Authentication Middleware
 * Extracts and validates user authentication from requests
 *
 * Related: GitHub Issue #325 - Code deduplication for presentation routes
 */

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { AuthenticationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export interface AuthenticatedContext {
    user: {
        id: string;
        email?: string;
    };
    supabase: Awaited<ReturnType<typeof createClient>>;
}

/**
 * Require authentication for an API route
 * Returns authenticated user and Supabase client, or throws AuthenticationError
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *     const { user, supabase } = await requireAuth();
 *     // ... use user and supabase
 * }
 * ```
 */
export async function requireAuth(): Promise<AuthenticatedContext> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        logger.warn({}, "Unauthorized request - no user session");
        throw new AuthenticationError("Unauthorized");
    }

    return { user, supabase };
}

/**
 * Create a JSON response for authentication errors
 * Use this when you need to return a response instead of throwing
 */
export function unauthorizedResponse(): NextResponse {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Verify that a user owns a resource
 * @param resourceUserId - The user_id from the resource
 * @param currentUserId - The current authenticated user's ID
 * @param resourceName - Name of the resource for error message
 */
export function verifyOwnership(
    resourceUserId: string,
    currentUserId: string,
    resourceName: string
): void {
    if (resourceUserId !== currentUserId) {
        logger.warn(
            { resourceUserId, currentUserId, resourceName },
            "Access denied - user does not own resource"
        );
        throw new AuthenticationError(`You do not have access to this ${resourceName}`);
    }
}
