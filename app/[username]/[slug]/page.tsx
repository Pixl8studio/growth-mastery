/**
 * Public Page Handler (Vanity URL)
 * Handles public pages by username/slug
 * URLs: genieai.com/[username]/[slug]
 */

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { RegistrationPageTemplate } from "@/components/public/registration-page-template";
import { WatchPageTemplate } from "@/components/public/watch-page-template";
import { EnrollmentPageTemplate } from "@/components/public/enrollment-page-template";
import { PublicPageWrapper } from "@/components/public/public-page-wrapper";

interface PageProps {
    params: Promise<{
        username: string;
        slug: string;
    }>;
}

export default async function PublicPageBySlug({ params }: PageProps) {
    const { username, slug } = await params;

    const supabase = await createClient();

    // First, find the user by username
    const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("username", username)
        .single();

    if (!userProfile) {
        notFound();
    }

    const userId = userProfile.id;

    // Try to find the page in each table by vanity_slug
    // Check registration pages
    const { data: registrationPage } = await supabase
        .from("registration_pages")
        .select("*, funnel_projects(*)")
        .eq("user_id", userId)
        .eq("vanity_slug", slug)
        .eq("is_published", true)
        .single();

    if (registrationPage) {
        // If html_content exists, render it with proper wrapper
        if (registrationPage.html_content) {
            return (
                <PublicPageWrapper
                    htmlContent={registrationPage.html_content}
                    theme={registrationPage.theme}
                />
            );
        }

        // Fallback to template if no html_content
        return <RegistrationPageTemplate page={registrationPage} />;
    }

    // Check watch pages
    const { data: watchPage } = await supabase
        .from("watch_pages")
        .select("*, funnel_projects(*), pitch_videos(*)")
        .eq("user_id", userId)
        .eq("vanity_slug", slug)
        .eq("is_published", true)
        .single();

    if (watchPage) {
        // If html_content exists, render it with proper wrapper
        if (watchPage.html_content) {
            return (
                <PublicPageWrapper
                    htmlContent={watchPage.html_content}
                    theme={watchPage.theme}
                />
            );
        }

        // Fallback to template if no html_content
        return <WatchPageTemplate page={watchPage} />;
    }

    // Check enrollment pages
    const { data: enrollmentPage } = await supabase
        .from("enrollment_pages")
        .select("*, funnel_projects(*), offers(*)")
        .eq("user_id", userId)
        .eq("vanity_slug", slug)
        .eq("is_published", true)
        .single();

    if (enrollmentPage) {
        // If html_content exists, render it with proper wrapper
        if (enrollmentPage.html_content) {
            return (
                <PublicPageWrapper
                    htmlContent={enrollmentPage.html_content}
                    theme={enrollmentPage.theme}
                />
            );
        }

        // Fallback to template if no html_content
        return <EnrollmentPageTemplate page={enrollmentPage} />;
    }

    // Page not found
    notFound();
}

export async function generateMetadata({ params }: PageProps) {
    const { username, slug } = await params;

    const supabase = await createClient();

    const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("username", username)
        .single();

    if (!userProfile) {
        return { title: "Page Not Found" };
    }

    // Try to get page metadata for SEO
    const { data: registrationPage } = await supabase
        .from("registration_pages")
        .select("headline, subheadline")
        .eq("user_id", userProfile.id)
        .eq("vanity_slug", slug)
        .eq("is_published", true)
        .single();

    if (registrationPage) {
        return {
            title: registrationPage.headline,
            description: registrationPage.subheadline,
        };
    }

    const { data: watchPage } = await supabase
        .from("watch_pages")
        .select("headline, subheadline")
        .eq("user_id", userProfile.id)
        .eq("vanity_slug", slug)
        .eq("is_published", true)
        .single();

    if (watchPage) {
        return {
            title: watchPage.headline,
            description: watchPage.subheadline,
        };
    }

    const { data: enrollmentPage } = await supabase
        .from("enrollment_pages")
        .select("headline, subheadline")
        .eq("user_id", userProfile.id)
        .eq("vanity_slug", slug)
        .eq("is_published", true)
        .single();

    if (enrollmentPage) {
        return {
            title: enrollmentPage.headline,
            description: enrollmentPage.subheadline,
        };
    }

    return {
        title: "Genie AI",
    };
}
