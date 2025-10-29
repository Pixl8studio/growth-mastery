/**
 * Gmail Integration Component
 *
 * Connect and manage Gmail integration for sending emails.
 */

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { SocialConnection } from "@/types/integrations";

interface GmailIntegrationProps {
    projectId: string;
}

export function GmailIntegration({ projectId }: GmailIntegrationProps) {
    const [connection, setConnection] = useState<SocialConnection | null>(null);
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
                .from("funnel_social_connections")
                .select("*")
                .eq("funnel_project_id", projectId)
                .eq("provider", "gmail")
                .single();

            if (data) {
                setConnection(data);
            }
        } catch (error) {
            logger.error({ error, projectId }, "Failed to load Gmail connection");
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const redirectUri = `${window.location.origin}/api/funnel/${projectId}/integrations/gmail/callback`;
            const response = await fetch(
                `/api/funnel/${projectId}/integrations/gmail/connect?redirect_uri=${encodeURIComponent(redirectUri)}`
            );
            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            logger.error({ error, projectId }, "Failed to initiate Gmail connection");
            toast({
                title: "Connection Error",
                description: "Failed to connect Gmail. Please try again.",
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
                    body: JSON.stringify({ provider: "gmail" }),
                }
            );

            if (response.ok) {
                setConnection(null);
                toast({
                    title: "Disconnected",
                    description: "Gmail has been disconnected",
                });
            }
        } catch (error) {
            logger.error({ error, projectId }, "Failed to disconnect Gmail");
            toast({
                title: "Error",
                description: "Failed to disconnect Gmail",
                variant: "destructive",
            });
        }
    };

    if (loading) {
        return (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div className="h-24 animate-pulse rounded bg-gray-200" />
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-red-100 p-2">
                        <Mail className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900">Gmail</h4>
                        <p className="text-xs text-gray-500">
                            Connect Gmail for sending emails
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
                    <div className="rounded-lg bg-gray-50 p-3">
                        <div className="text-sm font-medium text-gray-900">
                            {connection.account_email || "gmail@example.com"}
                        </div>
                        <div className="text-xs text-gray-500">
                            Connected{" "}
                            {new Date(connection.connected_at).toLocaleDateString()}
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnect}
                        className="w-full"
                    >
                        Disconnect
                    </Button>
                </div>
            ) : (
                <div className="mt-4">
                    <Button
                        onClick={handleConnect}
                        disabled={connecting}
                        className="w-full"
                    >
                        {connecting ? "Connecting..." : "Connect Gmail"}
                    </Button>
                </div>
            )}
        </div>
    );
}
