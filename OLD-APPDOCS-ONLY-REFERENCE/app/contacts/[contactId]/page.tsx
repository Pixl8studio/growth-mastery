/**
 * Contact Detail Page
 * View detailed engagement and funnel progression for a specific contact
 */

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoEngagementChart } from "@/components/contacts/video-engagement-chart";
import { FunnelProgressionTimeline } from "@/components/contacts/funnel-progression-timeline";
import { ContactEventsList } from "@/components/contacts/contact-events-list";
import { formatDateTime } from "@/lib/utils";
import { Header } from "@/components/layout/header";

export default async function ContactDetailPage({
    params,
}: {
    params: Promise<{ contactId: string }>;
}) {
    const { user } = await getCurrentUserWithProfile();
    const supabase = await createClient();
    const { contactId } = await params;

    // Fetch contact details
    const { data: contact, error } = await supabase
        .from("contacts")
        .select(
            `
            *,
            funnel_projects (id, name),
            registration_pages (id, title),
            watch_pages (id, title),
            enrollment_pages (id, title)
        `
        )
        .eq("id", contactId)
        .eq("user_id", user.id)
        .single();

    if (error || !contact) {
        notFound();
    }

    // Fetch contact events for timeline
    const { data: events } = await supabase
        .from("contact_events")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false })
        .limit(50);

    const _getStageVariant = (
        stage: string
    ): "default" | "secondary" | "success" | "warning" | "destructive" => {
        switch (stage) {
            case "registered":
                return "secondary";
            case "watched":
                return "default";
            case "enrolled":
                return "warning";
            case "purchased":
                return "success";
            default:
                return "secondary";
        }
    };

    const formatStage = (stage: string): string => {
        switch (stage) {
            case "registered":
                return "Registered";
            case "watched":
                return "Watched Video";
            case "enrolled":
                return "Viewed Enrollment";
            case "purchased":
                return "Purchased";
            default:
                return stage;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            {/* Main Content */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Contact Info Cards */}
                <div className="mb-8 grid gap-6 md:grid-cols-3">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">
                                Contact Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-600">Email</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {contact.email}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Name</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {contact.name || "Not provided"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Phone</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {contact.phone || "Not provided"}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Funnel</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {contact.funnel_projects?.name || "Unknown"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Engagement Stats */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Engagement Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-600">Current Stage</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {formatStage(contact.current_stage)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">
                                    Video Watch Percentage
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                    <div className="flex-1">
                                        <div className="h-2 w-full rounded-full bg-gray-200">
                                            <div
                                                className="h-2 rounded-full bg-green-500"
                                                style={{
                                                    width: `${contact.video_watch_percentage}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                        {contact.video_watch_percentage}%
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Video Replays</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {contact.replay_count || 0}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">
                                    Total Page Views
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                    {contact.total_page_views}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Activity Timeline */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-600">First Seen</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {formatDateTime(contact.first_seen_at)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Last Activity</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {formatDateTime(contact.last_activity_at)}
                                </p>
                            </div>
                            {contact.video_watched_at && (
                                <div>
                                    <p className="text-sm text-gray-600">
                                        Video Watched At
                                    </p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {formatDateTime(contact.video_watched_at)}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Funnel Progression */}
                <div className="mb-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Funnel Progression</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FunnelProgressionTimeline contact={contact} />
                        </CardContent>
                    </Card>
                </div>

                {/* Video Engagement */}
                {contact.video_watch_percentage > 0 && (
                    <div className="mb-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Video Engagement Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <VideoEngagementChart
                                    watchPercentage={contact.video_watch_percentage}
                                    completionEvents={
                                        (contact.video_completion_events as number[]) ||
                                        []
                                    }
                                    replayCount={contact.replay_count || 0}
                                />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* UTM Tracking */}
                {(contact.utm_source ||
                    contact.utm_medium ||
                    contact.utm_campaign ||
                    contact.referrer) && (
                    <div className="mb-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Traffic Source</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {contact.utm_source && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">
                                            Source:
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {contact.utm_source}
                                        </span>
                                    </div>
                                )}
                                {contact.utm_medium && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">
                                            Medium:
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {contact.utm_medium}
                                        </span>
                                    </div>
                                )}
                                {contact.utm_campaign && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">
                                            Campaign:
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {contact.utm_campaign}
                                        </span>
                                    </div>
                                )}
                                {contact.utm_term && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">
                                            Term:
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {contact.utm_term}
                                        </span>
                                    </div>
                                )}
                                {contact.utm_content && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">
                                            Content:
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {contact.utm_content}
                                        </span>
                                    </div>
                                )}
                                {contact.referrer && (
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">
                                            Referrer:
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {contact.referrer}
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Recent Events */}
                {events && events.length > 0 && (
                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Activity Events</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ContactEventsList events={events} />
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    );
}
