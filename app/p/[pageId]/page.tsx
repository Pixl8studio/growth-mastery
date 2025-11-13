/**
 * Public Page Handler (UUID-based)
 * Handles all public funnel pages by UUID
 * URLs: genieai.com/[uuid]
 */

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { isValidUUID } from "@/lib/utils";
import { RegistrationPageTemplate } from "@/components/public/registration-page-template";
import { WatchPageTemplate } from "@/components/public/watch-page-template";
import { EnrollmentPageTemplate } from "@/components/public/enrollment-page-template";

interface PageProps {
    params: Promise<{
        pageId: string;
    }>;
}

export default async function PublicPageByUUID({ params }: PageProps) {
    const { pageId } = await params;

    // Validate UUID format
    if (!isValidUUID(pageId)) {
        notFound();
    }

    const supabase = await createClient();

    // Try to find the page in each table
    // Check registration pages first
    const { data: registrationPage } = await supabase
        .from("registration_pages")
        .select("*, funnel_projects(*)")
        .eq("id", pageId)
        .eq("is_published", true)
        .single();

    if (registrationPage) {
        return <RegistrationPageTemplate page={registrationPage} />;
    }

    // Check watch pages
    const { data: watchPage } = await supabase
        .from("watch_pages")
        .select("*, funnel_projects(*), pitch_videos(*)")
        .eq("id", pageId)
        .eq("is_published", true)
        .single();

    if (watchPage) {
        return <WatchPageTemplate page={watchPage} />;
    }

    // Check enrollment pages
    const { data: enrollmentPage } = await supabase
        .from("enrollment_pages")
        .select("*, funnel_projects(*), offers(*)")
        .eq("id", pageId)
        .eq("is_published", true)
        .single();

    if (enrollmentPage) {
        return <EnrollmentPageTemplate page={enrollmentPage} />;
    }

    // Page not found
    notFound();
}

export async function generateMetadata({ params }: PageProps) {
    const { pageId } = await params;

    if (!isValidUUID(pageId)) {
        return {
            title: "Page Not Found",
        };
    }

    const supabase = await createClient();

    // Try to get page metadata
    const { data: registrationPage } = await supabase
        .from("registration_pages")
        .select("headline, subheadline")
        .eq("id", pageId)
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
        .eq("id", pageId)
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
        .eq("id", pageId)
        .eq("is_published", true)
        .single();

    if (enrollmentPage) {
        return {
            title: enrollmentPage.headline,
            description: enrollmentPage.subheadline,
        };
    }

    return {
        title: "Growth Mastery AI",
    };
}
