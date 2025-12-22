/**
 * Admin Role Utilities
 * Functions for checking and managing admin roles
 */

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { AdminRole, AdminUser } from "@/types/admin";

// Role hierarchy - higher index = more permissions
const ROLE_HIERARCHY: AdminRole[] = ["user", "support", "admin", "super_admin"];

/**
 * Check if a role has at least the minimum required permissions
 */
export function hasMinimumRole(userRole: AdminRole, minimumRole: AdminRole): boolean {
    const userLevel = ROLE_HIERARCHY.indexOf(userRole);
    const minimumLevel = ROLE_HIERARCHY.indexOf(minimumRole);
    return userLevel >= minimumLevel;
}

/**
 * Check if a user has admin access (support, admin, or super_admin)
 */
export function isAdmin(role: AdminRole): boolean {
    return hasMinimumRole(role, "support");
}

/**
 * Check if a user can perform admin actions (admin or super_admin)
 */
export function canPerformAdminActions(role: AdminRole): boolean {
    return hasMinimumRole(role, "admin");
}

/**
 * Check if a user is a super admin
 */
export function isSuperAdmin(role: AdminRole): boolean {
    return role === "super_admin";
}

/**
 * Get the current user's role from the database
 * Returns 'user' if not found or error
 */
export async function getUserRole(userId: string): Promise<AdminRole> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", userId)
        .single();

    if (error || !data) {
        logger.warn({ userId, error }, "Failed to get user role, defaulting to 'user'");
        return "user";
    }

    return (data.role as AdminRole) || "user";
}

/**
 * Get the current admin user with profile info
 * Returns null if not an admin
 */
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("user_profiles")
        .select("id, email, full_name, role, avatar_url, created_at")
        .eq("id", userId)
        .single();

    if (error || !data) {
        logger.warn({ userId, error }, "Failed to get admin user");
        return null;
    }

    const role = (data.role as AdminRole) || "user";

    if (!isAdmin(role)) {
        return null;
    }

    return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role,
        avatar_url: data.avatar_url,
        created_at: data.created_at,
    };
}

/**
 * Require admin access for a server component
 * Silently redirects to /settings if not an admin
 */
export async function requireAdminAccess(
    userId: string,
    minimumRole: AdminRole = "support"
): Promise<AdminUser> {
    const adminUser = await getAdminUser(userId);

    if (!adminUser || !hasMinimumRole(adminUser.role, minimumRole)) {
        logger.info(
            { userId, minimumRole },
            "Non-admin user attempted to access admin area, redirecting"
        );
        redirect("/settings");
    }

    return adminUser;
}

/**
 * Require admin access for an API route
 * Returns null response to return, or the admin user if authorized
 */
export async function requireAdminAccessForAPI(
    userId: string,
    minimumRole: AdminRole = "support"
): Promise<{ adminUser: AdminUser } | { response: NextResponse }> {
    const adminUser = await getAdminUser(userId);

    if (!adminUser || !hasMinimumRole(adminUser.role, minimumRole)) {
        logger.warn(
            { userId, minimumRole },
            "Non-admin user attempted to access admin API"
        );
        // Return 404 to hide existence of admin endpoints
        return {
            response: NextResponse.json({ error: "Not found" }, { status: 404 }),
        };
    }

    return { adminUser };
}

/**
 * Get all admin users
 * Only super_admins can call this
 */
export async function getAllAdminUsers(): Promise<AdminUser[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("user_profiles")
        .select("id, email, full_name, role, avatar_url, created_at")
        .in("role", ["support", "admin", "super_admin"])
        .order("created_at", { ascending: true });

    if (error) {
        logger.error({ error }, "Failed to get admin users");
        return [];
    }

    return data.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role as AdminRole,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
    }));
}

/**
 * Initialize super admin from environment variable
 * Used when no super_admin exists (e.g., new deployment)
 * Checks INITIAL_SUPER_ADMIN_EMAIL env var
 */
export async function initializeSuperAdminFromEnv(): Promise<{
    success: boolean;
    message: string;
}> {
    const supabase = await createClient();
    const envEmail = process.env.INITIAL_SUPER_ADMIN_EMAIL;

    if (!envEmail) {
        return { success: false, message: "INITIAL_SUPER_ADMIN_EMAIL not set" };
    }

    // Check if any super_admin already exists
    const { data: existingAdmins, error: checkError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("role", "super_admin")
        .limit(1);

    if (checkError) {
        logger.error(
            { error: checkError },
            "Failed to check for existing super admins"
        );
        return { success: false, message: "Failed to check existing admins" };
    }

    if (existingAdmins && existingAdmins.length > 0) {
        return { success: true, message: "Super admin already exists" };
    }

    // Find the user by email and promote them
    const { data: user, error: userError } = await supabase
        .from("user_profiles")
        .select("id, email")
        .eq("email", envEmail)
        .single();

    if (userError || !user) {
        logger.warn(
            { email: envEmail },
            "User from INITIAL_SUPER_ADMIN_EMAIL not found"
        );
        return { success: false, message: "User not found" };
    }

    // Promote to super_admin
    const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ role: "super_admin" })
        .eq("id", user.id);

    if (updateError) {
        logger.error({ error: updateError }, "Failed to promote user to super_admin");
        return { success: false, message: "Failed to update role" };
    }

    logger.info(
        { userId: user.id, email: user.email },
        "Initialized super_admin from environment variable"
    );

    return { success: true, message: `Promoted ${user.email} to super_admin` };
}

/**
 * Update a user's role
 * Only super_admins can do this
 * Cannot change the role of another super_admin
 */
export async function updateUserRole(
    adminUserId: string,
    targetUserId: string,
    newRole: AdminRole
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Check the admin has permission
    const adminRole = await getUserRole(adminUserId);
    if (!isSuperAdmin(adminRole)) {
        return { success: false, error: "Only super admins can change roles" };
    }

    // Check target user's current role
    const targetRole = await getUserRole(targetUserId);
    if (isSuperAdmin(targetRole) && adminUserId !== targetUserId) {
        return { success: false, error: "Cannot change another super admin's role" };
    }

    // Prevent demoting yourself from super_admin if you're the only one
    if (
        adminUserId === targetUserId &&
        isSuperAdmin(targetRole) &&
        newRole !== "super_admin"
    ) {
        const allAdmins = await getAllAdminUsers();
        const superAdminCount = allAdmins.filter(
            (a) => a.role === "super_admin"
        ).length;
        if (superAdminCount <= 1) {
            return { success: false, error: "Cannot remove the only super admin" };
        }
    }

    const { error } = await supabase
        .from("user_profiles")
        .update({ role: newRole })
        .eq("id", targetUserId);

    if (error) {
        logger.error({ error, targetUserId, newRole }, "Failed to update user role");
        return { success: false, error: "Failed to update role" };
    }

    logger.info(
        { adminUserId, targetUserId, oldRole: targetRole, newRole },
        "User role updated"
    );

    return { success: true };
}
