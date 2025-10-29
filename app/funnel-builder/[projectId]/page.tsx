/**
 * Funnel Project Dashboard Page
 *
 * Comprehensive tabbed dashboard showing:
 * - Dashboard: Progress stepper and analytics
 * - Pages: All funnel pages
 * - AI Followup: Prospect management
 * - Contacts: Contact tracking
 * - Settings: Integrations and configuration
 */

import { getCurrentUserWithProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { FunnelDashboardTabs } from "@/components/funnel/funnel-dashboard-tabs";
import { Header } from "@/components/layout/header";

interface PageProps {
    params: Promise<{
        projectId: string;
    }>;
}

export default async function FunnelProjectPage({ params }: PageProps) {
    const { projectId } = await params;
    const { user, profile } = await getCurrentUserWithProfile();
    const supabase = await createClient();

    // Fetch project
    const { data: project, error } = await supabase
        .from("funnel_projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

    if (error || !project) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            {/* Main Content */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Project Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-gray-900">
                            {project.name}
                        </h1>
                        <Badge
                            variant={
                                project.status === "active" ? "default" : "secondary"
                            }
                        >
                            {project.status}
                        </Badge>
                    </div>
                </div>

                {/* Tabbed Dashboard */}
                <FunnelDashboardTabs
                    projectId={projectId}
                    username={profile.username}
                    currentStep={project.current_step}
                />
            </main>
        </div>
    );
}
