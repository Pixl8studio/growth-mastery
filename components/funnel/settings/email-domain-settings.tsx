/**
 * Email Domain Settings Component
 *
 * Manages email domain configuration for a specific funnel.
 * Shows current domain and allows setup/selection of email domains.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { Button } from "@/components/ui/button";
import {
    Mail,
    Check,
    Plus,
    Settings as SettingsIcon,
    ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { EmailDomainSetup } from "./email-domain-setup";
import type { EmailDomain } from "@/types/integrations";

interface EmailDomainSettingsProps {
    projectId: string;
}

export function EmailDomainSettings({ projectId }: EmailDomainSettingsProps) {
    const [domains, setDomains] = useState<EmailDomain[]>([]);
    const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSetup, setShowSetup] = useState(false);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const supabase = createClient();

            // Load domains (funnel-specific and account-wide)
            const response = await fetch(
                `/api/email-domains?funnel_project_id=${projectId}`
            );
            const data = await response.json();
            setDomains(data.domains || []);

            // Check if funnel has selected domain
            const { data: project } = await supabase
                .from("funnel_projects")
                .select("settings")
                .eq("id", projectId)
                .single();

            if (project?.settings?.email_domain_id) {
                setSelectedDomainId(project.settings.email_domain_id);
            }
        } catch (error) {
            logger.error({ error, projectId }, "Failed to load email domain settings");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSave = async (domainId: string | null) => {
        setSaving(true);
        try {
            const supabase = createClient();

            // Get current settings
            const { data: project } = await supabase
                .from("funnel_projects")
                .select("settings")
                .eq("id", projectId)
                .single();

            const currentSettings = project?.settings || {};

            // Update settings with new domain
            const { error } = await supabase
                .from("funnel_projects")
                .update({
                    settings: {
                        ...currentSettings,
                        email_domain_id: domainId,
                    },
                })
                .eq("id", projectId);

            if (error) {
                throw error;
            }

            setSelectedDomainId(domainId);

            toast({
                title: "Email Domain Updated",
                description: domainId
                    ? "Email domain configured successfully"
                    : "Using default email configuration",
            });
        } catch (error) {
            logger.error({ error, projectId }, "Failed to save email domain settings");
            toast({
                title: "Error",
                description: "Failed to save email domain settings",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDomainSetupComplete = (domain: EmailDomain) => {
        setShowSetup(false);
        loadData();
        handleSave(domain.id);
    };

    if (loading) {
        return (
            <div className="rounded-lg border border-border bg-card p-6">
                <div className="h-40 animate-pulse rounded bg-gray-200" />
            </div>
        );
    }

    if (showSetup) {
        return (
            <div className="rounded-lg border border-border bg-card p-6">
                <EmailDomainSetup
                    projectId={projectId}
                    onComplete={handleDomainSetupComplete}
                />
                <Button
                    variant="ghost"
                    onClick={() => setShowSetup(false)}
                    className="mt-4 w-full"
                >
                    Cancel
                </Button>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">Email Domain</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Configure a custom email domain to send follow-up emails from your
                    own branded address. This improves deliverability and brand trust.
                </p>
            </div>

            <div className="space-y-4">
                {/* Default (No Custom Domain) */}
                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                        <input
                            type="radio"
                            name="email-domain"
                            checked={selectedDomainId === null}
                            onChange={() => handleSave(null)}
                            disabled={saving}
                            className="h-4 w-4 text-primary"
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">
                                    Default Email Configuration
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Use SendGrid or Gmail for email sending
                            </p>
                        </div>
                    </div>
                    {selectedDomainId === null && (
                        <Check className="h-5 w-5 text-primary" />
                    )}
                </label>

                {/* Custom Domains */}
                {domains.map((domain) => (
                    <label
                        key={domain.id}
                        className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50"
                    >
                        <div className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="email-domain"
                                checked={selectedDomainId === domain.id}
                                onChange={() => handleSave(domain.id)}
                                disabled={
                                    saving || domain.verification_status !== "verified"
                                }
                                className="h-4 w-4 text-primary"
                            />
                            <div>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-primary" />
                                    <span className="font-medium text-foreground">
                                        {domain.full_domain}
                                    </span>
                                    {domain.verification_status === "verified" && (
                                        <Check className="h-4 w-4 text-green-500" />
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Status: {domain.verification_status}
                                    {domain.funnel_project_id === projectId
                                        ? " • This funnel"
                                        : " • Account-wide"}
                                </p>
                            </div>
                        </div>
                        {selectedDomainId === domain.id && (
                            <Check className="h-5 w-5 text-primary" />
                        )}
                    </label>
                ))}

                {/* Add New Domain Button */}
                <Button
                    variant="outline"
                    onClick={() => setShowSetup(true)}
                    className="w-full"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Custom Email Domain
                </Button>

                {/* Info Box */}
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                    <div className="flex gap-2">
                        <SettingsIcon className="h-5 w-5 text-blue-500" />
                        <div className="flex-1">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                                Why Use a Custom Domain?
                            </h4>
                            <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
                                <li>
                                    • Better email deliverability and inbox placement
                                </li>
                                <li>
                                    • Branded sender address (e.g.,
                                    noreply@yourdomain.com)
                                </li>
                                <li>• Improved trust and professionalism</li>
                                <li>• Full control over email reputation</li>
                            </ul>
                            <Button
                                variant="link"
                                className="mt-2 h-auto p-0 text-sm text-blue-600 dark:text-blue-400"
                                onClick={() =>
                                    (window.location.href = "/settings/email-domains")
                                }
                            >
                                Manage account-wide domains
                                <ExternalLink className="ml-1 h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
