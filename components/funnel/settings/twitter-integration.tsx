/**
 * Twitter (X) Integration Component
 *
 * Connect and manage Twitter/X account integration.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Twitter, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { SocialConnection } from "@/types/integrations";

interface TwitterIntegrationProps {
    projectId: string;
}

export function TwitterIntegration({ projectId }: TwitterIntegrationProps) {
    const [connection, setConnection] = useState<SocialConnection | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const { toast } = useToast();

    const loadConnection = useCallback(async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data } = await supabase
                .from("funnel_social_connections")
                .select("*")
                .eq("funnel_project_id", projectId)
                .eq("provider", "twitter")
                .single();

            if (data) {
                setConnection(data);
            }
        } catch (error) {
            logger.error({ error, projectId }, "Failed to load Twitter connection");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadConnection();
    }, [loadConnection]);

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const redirectUri = `${window.location.origin}/api/funnel/${projectId}/integrations/twitter/callback`;
            const response = await fetch(
                `/api/funnel/${projectId}/integrations/twitter/connect?redirect_uri=${encodeURIComponent(redirectUri)}`
            );
            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            logger.error({ error, projectId }, "Failed to initiate Twitter connection");
            toast({
                title: "Connection Error",
                description: "Failed to connect Twitter. Please try again.",
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
                    body: JSON.stringify({ provider: "twitter" }),
                }
            );

            if (response.ok) {
                setConnection(null);
                toast({
                    title: "Disconnected",
                    description: "Twitter has been disconnected",
                });
            }
        } catch (error) {
            logger.error({ error, projectId }, "Failed to disconnect Twitter");
            toast({
                title: "Error",
                description: "Failed to disconnect Twitter",
                variant: "destructive",
            });
        }
    };

    if (loading) {
        return (
            <div className="rounded-lg border border-border bg-card p-6">
                <div className="h-24 animate-pulse rounded bg-gray-200" />
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-sky-100 p-2">
                        <Twitter className="h-6 w-6 text-sky-600" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-foreground">X (Twitter)</h4>
                        <p className="text-xs text-muted-foreground">
                            Connect your X/Twitter account
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
                    <div className="rounded-lg bg-muted/50 p-3">
                        <div className="text-sm font-medium text-foreground">
                            @{connection.account_name || "twitter"}
                        </div>
                        <div className="text-xs text-muted-foreground">
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
                        {connecting ? "Connecting..." : "Connect X"}
                    </Button>
                </div>
            )}
        </div>
    );
}
