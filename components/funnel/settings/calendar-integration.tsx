/**
 * Calendar Integration Component
 *
 * Connect and manage Google Calendar integration.
 */

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { CalendarConnection } from "@/types/integrations";

interface CalendarIntegrationProps {
    projectId: string;
}

export function CalendarIntegration({ projectId }: CalendarIntegrationProps) {
    const [connection, setConnection] = useState<CalendarConnection | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        loadConnection();
    }, [projectId]);

    const loadConnection = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data } = await supabase
                .from("funnel_calendar_connections")
                .select("*")
                .eq("funnel_project_id", projectId)
                .eq("provider", "google")
                .single();

            if (data) {
                setConnection(data);
            }
        } catch (error) {
            logger.error({ error, projectId }, "Failed to load calendar connection");
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const redirectUri = `${window.location.origin}/api/funnel/${projectId}/integrations/calendar/callback`;
            const response = await fetch(
                `/api/funnel/${projectId}/integrations/calendar/connect?redirect_uri=${encodeURIComponent(redirectUri)}`
            );
            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            logger.error(
                { error, projectId },
                "Failed to initiate calendar connection"
            );
            toast({
                title: "Connection Error",
                description: "Failed to connect calendar. Please try again.",
                variant: "destructive",
            });
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            const response = await fetch(
                `/api/funnel/${projectId}/integrations/disconnect`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ provider: "google", type: "calendar" }),
                }
            );

            if (response.ok) {
                setConnection(null);
                toast({
                    title: "Disconnected",
                    description: "Calendar has been disconnected",
                });
            }
        } catch (error) {
            logger.error({ error, projectId }, "Failed to disconnect calendar");
            toast({
                title: "Error",
                description: "Failed to disconnect calendar",
                variant: "destructive",
            });
        }
    };

    if (loading) {
        return (
            <div className="rounded-lg border border-border bg-card p-6">
                <div className="h-32 animate-pulse rounded bg-gray-200" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-foreground">
                    Calendar Integration
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Connect your calendar to enable scheduling features
                </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-3">
                            <Calendar className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground">
                                Google Calendar
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Connect your Google Calendar
                            </p>
                        </div>
                    </div>
                    {connection ? (
                        <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Connected
                        </Badge>
                    ) : (
                        <Badge variant="secondary">
                            <XCircle className="mr-1 h-3 w-3" />
                            Not Connected
                        </Badge>
                    )}
                </div>

                {connection ? (
                    <div className="mt-4 space-y-3">
                        <div className="rounded-lg bg-muted/50 p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">
                                    Calendar
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {connection.account_email}
                                </span>
                            </div>
                            <div className="text-sm text-foreground">
                                {connection.calendar_name || "Primary Calendar"}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                                Connected{" "}
                                {new Date(connection.connected_at).toLocaleDateString()}
                            </div>
                            {connection.last_synced_at && (
                                <div className="text-xs text-muted-foreground">
                                    Last synced{" "}
                                    {new Date(
                                        connection.last_synced_at
                                    ).toLocaleString()}
                                </div>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDisconnect}
                            className="w-full"
                        >
                            Disconnect Calendar
                        </Button>
                    </div>
                ) : (
                    <div className="mt-4 space-y-4">
                        <div className="rounded-lg bg-muted/50 p-4">
                            <h5 className="mb-2 text-sm font-medium text-foreground">
                                Features with Calendar Connection
                            </h5>
                            <ul className="space-y-1 text-xs text-muted-foreground">
                                <li>
                                    • Schedule calls and meetings directly from funnel
                                </li>
                                <li>
                                    • Automatic calendar event creation for enrollments
                                </li>
                                <li>• Send calendar invites to prospects</li>
                                <li>• Sync availability for booking pages</li>
                            </ul>
                        </div>
                        <Button
                            onClick={handleConnect}
                            disabled={connecting}
                            className="w-full"
                        >
                            {connecting ? "Connecting..." : "Connect Google Calendar"}
                        </Button>
                    </div>
                )}
            </div>

            {/* Future providers placeholder */}
            <div className="rounded-lg border border-border bg-muted/50 p-6">
                <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <h5 className="text-sm font-medium text-foreground">
                            More Calendars
                        </h5>
                        <p className="text-xs text-muted-foreground">
                            Outlook and CalDAV support coming soon
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
