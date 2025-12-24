/**
 * Next.js Middleware
 * Handles Supabase sessions, admin route protection, and custom domain routing
 */

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

// Admin role hierarchy - lower index = less permissions
const ADMIN_ROLES = ["support", "admin", "super_admin"];

/**
 * Create a Supabase client for use in middleware
 * Note: Middleware cannot use next/headers cookies() - must use request.cookies
 */
function createMiddlewareClient(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return null;
    }

    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll() {
                // Middleware doesn't set cookies here - updateSession handles that
            },
        },
    });
}

/**
 * Check if user has admin access for middleware protection
 * Defense-in-depth layer - layout.tsx also enforces access control
 */
async function checkAdminAccess(request: NextRequest): Promise<NextResponse | null> {
    const supabase = createMiddlewareClient(request);

    if (!supabase) {
        // Supabase not configured - allow through (server components will handle auth)
        return null;
    }

    // Get authenticated user
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        // Not authenticated - redirect to login
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Check user role
    const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        // No profile found - redirect to settings
        return NextResponse.redirect(new URL("/settings", request.url));
    }

    const userRole = profile.role || "user";

    // Check if user has at least support role (minimum for admin access)
    if (!ADMIN_ROLES.includes(userRole)) {
        // Not an admin - redirect to settings (silent, no error exposed)
        return NextResponse.redirect(new URL("/settings", request.url));
    }

    // User has admin access - allow through
    return null;
}

export async function middleware(request: NextRequest) {
    const hostname = request.headers.get("host") || "";
    const url = request.nextUrl;

    // Admin route protection (defense-in-depth)
    if (url.pathname.startsWith("/settings/admin")) {
        const adminCheck = await checkAdminAccess(request);
        if (adminCheck) {
            return adminCheck;
        }
        // Continue with session update for valid admin users
        return await updateSession(request);
    }

    // Get the main domain from environment
    const mainDomain =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/https?:\/\//, "") || "";

    // Skip custom domain logic for main domain or localhost
    if (
        hostname.includes("localhost") ||
        hostname === mainDomain ||
        hostname === `www.${mainDomain}`
    ) {
        return await updateSession(request);
    }

    // Check if this hostname is a custom domain
    const supabase = createMiddlewareClient(request);
    if (!supabase) {
        // Supabase not configured - skip custom domain check
        return await updateSession(request);
    }
    const { data: customDomain } = await supabase
        .from("custom_domains")
        .select(
            `
            funnel_project_id,
            funnel_projects!inner(
                slug,
                user_id,
                user_profiles!inner(username)
            )
        `
        )
        .eq("domain", hostname)
        .eq("verified", true)
        .single();

    if (customDomain?.funnel_projects) {
        const project = customDomain.funnel_projects as any;
        const username = project.user_profiles.username;

        // Rewrite to the user's funnel pages
        // Custom domain visitors see the project as if it's at the root
        if (url.pathname === "/") {
            // Show the project's pages (could be customized to show a primary page)
            url.pathname = `/funnel-builder/${customDomain.funnel_project_id}/pages`;
        } else {
            // Pass through other paths to the user's namespace
            url.pathname = `/${username}${url.pathname}`;
        }

        // Create rewrite response with session handling
        const rewriteUrl = new URL(url.pathname, request.url);
        const response = NextResponse.rewrite(rewriteUrl);

        // Copy session cookies to rewritten response
        const sessionResponse = await updateSession(request);
        sessionResponse.cookies.getAll().forEach((cookie) => {
            response.cookies.set(cookie.name, cookie.value);
        });

        return response;
    }

    // Not a custom domain, continue normal flow
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
