/**
 * Domains Settings Component
 * Manage custom domain connections for funnel projects
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { DomainCard } from "@/components/domains/domain-card";

interface CustomDomain {
    id: string;
    domain: string;
    verified: boolean;
    verification_status: string;
    funnel_projects: {
        id: string;
        name: string;
    };
    dns_instructions: {
        type: string;
        name: string;
        value: string;
    };
}

interface FunnelProject {
    id: string;
    name: string;
    slug: string;
}

export function DomainsSettings() {
    const [domains, setDomains] = useState<CustomDomain[]>([]);
    const [projects, setProjects] = useState<FunnelProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    const [newDomain, setNewDomain] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const supabase = createClient();

            const domainsRes = await fetch("/api/domains");
            const domainsData = await domainsRes.json();

            const { data: projectsData, error: projectsError } = await supabase
                .from("funnel_projects")
                .select("id, name, slug")
                .order("updated_at", { ascending: false });

            if (projectsError) {
                throw projectsError;
            }

            setDomains(domainsData.domains || []);
            setProjects(projectsData || []);
        } catch (err) {
            logger.error({ error: err }, "Failed to load domains");
            setError("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/domains", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    domain: newDomain.toLowerCase().trim(),
                    funnelProjectId: selectedProjectId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to add domain");
            }

            const { domain } = await response.json();
            setDomains([domain, ...domains]);
            setNewDomain("");
            setSelectedProjectId("");
            setSuccess(
                "Domain added successfully! Please configure your DNS settings."
            );

            logger.info({ domain: domain.domain }, "Domain added successfully");
        } catch (err: unknown) {
            logger.error({ error: err }, "Failed to add domain");
            setError(err instanceof Error ? err.message : "Failed to add domain");
        } finally {
            setAdding(false);
        }
    };

    // Callback when a domain is verified via polling
    const handleDomainVerified = useCallback((domainId: string) => {
        setDomains((prev) =>
            prev.map((d) =>
                d.id === domainId
                    ? { ...d, verified: true, verification_status: "verified" }
                    : d
            )
        );
        setSuccess("Domain verified successfully!");
    }, []);

    // Callback when a domain is deleted
    const handleDomainDeleted = useCallback((domainId: string) => {
        setDomains((prev) => prev.filter((d) => d.id !== domainId));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Custom Domains</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Connect your own domain to your funnel projects for a branded
                    experience
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {success && (
                <div className="mb-4 rounded-md bg-green-50 p-3">
                    <p className="text-sm text-green-800">{success}</p>
                </div>
            )}

            <div className="mb-6 rounded-lg border border-border bg-card p-6">
                <h3 className="mb-4 text-lg font-semibold">Add New Domain</h3>

                <form onSubmit={handleAddDomain} className="space-y-4">
                    <div>
                        <label
                            htmlFor="domain"
                            className="block text-sm font-medium text-foreground"
                        >
                            Domain or Subdomain
                        </label>
                        <input
                            id="domain"
                            type="text"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            placeholder="webinar.yourcompany.com"
                            className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            required
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Supports both root domains (company.com) and subdomains
                            (webinar.company.com)
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor="project"
                            className="block text-sm font-medium text-foreground"
                        >
                            Funnel Project
                        </label>
                        <select
                            id="project"
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            required
                        >
                            <option value="">Select a project...</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                        {projects.length === 0 && (
                            <p className="mt-1 text-xs text-amber-600">
                                You need to create a funnel project first.
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={adding || projects.length === 0}
                        className="rounded-md bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {adding ? "Adding..." : "Add Domain"}
                    </button>
                </form>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Your Domains</h3>

                {domains.length === 0 ? (
                    <div className="rounded-lg border border-border bg-card p-8 text-center">
                        <p className="text-muted-foreground">
                            No domains connected yet.
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Add a custom domain above to get started.
                        </p>
                    </div>
                ) : (
                    domains.map((domain) => (
                        <DomainCard
                            key={domain.id}
                            domain={domain}
                            onVerified={handleDomainVerified}
                            onDelete={handleDomainDeleted}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
