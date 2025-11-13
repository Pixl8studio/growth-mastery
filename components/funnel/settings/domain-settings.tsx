/**
 * Domain Settings Component
 *
 * Allows selecting a custom domain for the funnel.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { Button } from "@/components/ui/button";
import { Globe, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface CustomDomain {
    id: string;
    domain: string;
    status: string;
}

interface DomainSettingsProps {
    projectId: string;
}

export function DomainSettings({ projectId }: DomainSettingsProps) {
    const [domains, setDomains] = useState<CustomDomain[]>([]);
    const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const supabase = createClient();

            const { data: project } = await supabase
                .from("funnel_projects")
                .select("custom_domain_id")
                .eq("id", projectId)
                .single();

            if (project) {
                setSelectedDomainId(project.custom_domain_id);
            }

            const response = await fetch("/api/domains");
            const data = await response.json();
            setDomains(data.domains || []);
        } catch (error) {
            logger.error({ error, projectId }, "Failed to load domain settings");
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("funnel_projects")
                .update({ custom_domain_id: selectedDomainId })
                .eq("id", projectId);

            if (error) {
                throw error;
            }

            toast({
                title: "Domain Updated",
                description: "Funnel domain settings saved successfully",
            });
        } catch (error) {
            logger.error({ error, projectId }, "Failed to save domain settings");
            toast({
                title: "Error",
                description: "Failed to save domain settings",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="rounded-lg border border-border bg-card p-6">
                <div className="h-40 animate-pulse rounded bg-gray-200" />
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">Custom Domain</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Select a custom domain for this funnel or use the default domain.
                </p>
            </div>

            <div className="space-y-4">
                {/* Default Domain Option */}
                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-4 hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                        <input
                            type="radio"
                            name="domain"
                            checked={selectedDomainId === null}
                            onChange={() => setSelectedDomainId(null)}
                            className="h-4 w-4 text-primary"
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">
                                    Default Domain
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Use the app's default domain for all pages
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
                                name="domain"
                                checked={selectedDomainId === domain.id}
                                onChange={() => setSelectedDomainId(domain.id)}
                                className="h-4 w-4 text-primary"
                            />
                            <div>
                                <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-primary" />
                                    <span className="font-medium text-foreground">
                                        {domain.domain}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Status:{" "}
                                    {domain.status === "verified"
                                        ? "Active"
                                        : "Pending"}
                                </p>
                            </div>
                        </div>
                        {selectedDomainId === domain.id && (
                            <Check className="h-5 w-5 text-primary" />
                        )}
                    </label>
                ))}

                {domains.length === 0 && (
                    <div className="rounded-lg border border-border bg-muted/50 p-6 text-center">
                        <Globe className="mx-auto h-8 w-8 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">
                            No custom domains configured.
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Add a custom domain in Settings → Domains
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-6 flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}
