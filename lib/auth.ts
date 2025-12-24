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
 * Creates a basic profile if one doesn't exist (handles edge case for new users)
 */
export async function getUserProfile(userId: string) {
    const supabase = await createClient();

    // Use maybeSingle() to avoid PGRST116 error when no rows found
    const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    // Profile exists - return it
    if (profile) {
        return profile;
    }

    // No profile found - try to get user email and create a basic profile
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
        throw new Error("Unable to create profile: user email not available");
    }

    // Generate a unique username from email
    const baseUsername = user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
    const uniqueUsername = `${baseUsername}_${Date.now().toString(36)}`;

    // Create basic profile
    const { data: newProfile, error: createError } = await supabase
        .from("user_profiles")
        .insert({
            id: userId,
            email: user.email,
            username: uniqueUsername,
            full_name: user.user_metadata?.full_name || null,
            onboarding_completed: false,
        })
        .select()
        .single();

    if (createError) {
        throw createError;
    }

    return newProfile;
}

/**
 * Get current user with profile
 * Uses requireAuth which redirects - only for server components
 */
export async function getCurrentUserWithProfile() {
    const user = await requireAuth();
    const profile = await getUserProfile(user.id);

    return {
        user,
        profile,
    };
}

/**
 * Get current user with profile for API routes
 * Throws error instead of redirecting
 */
export async function getCurrentUserWithProfileForAPI() {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const profile = await getUserProfile(user.id);

    return {
        user,
        profile,
    };
}
