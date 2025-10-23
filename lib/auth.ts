/**
 * Authentication Utilities
 * Helper functions for auth checks and protected routes
 */

import { createClient } from "./supabase/server";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

/**
 * Get current user or redirect to login
 * Use in server components and server actions
 */
export async function requireAuth(redirectTo?: string): Promise<User> {
    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        const loginUrl = redirectTo
            ? `/login?redirect=${encodeURIComponent(redirectTo)}`
            : "/login";
        redirect(loginUrl);
    }

    return user;
}

/**
 * Get current user without redirecting
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    return user;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
    const user = await getCurrentUser();
    return user !== null;
}

/**
 * Get user profile from database
 */
export async function getUserProfile(userId: string) {
    const supabase = await createClient();

    const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) {
        throw error;
    }

    return profile;
}

/**
 * Get current user with profile
 */
export async function getCurrentUserWithProfile() {
    const user = await requireAuth();
    const profile = await getUserProfile(user.id);

    return {
        user,
        profile,
    };
}
