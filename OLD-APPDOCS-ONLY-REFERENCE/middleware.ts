/**
 * Next.js Middleware
 * Handles Supabase sessions and custom domain routing
 */

import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { createClient } from "./lib/supabase/server";

export async function middleware(request: NextRequest) {
    const hostname = request.headers.get("host") || "";
    const url = request.nextUrl;

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
    const supabase = await createClient();
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
