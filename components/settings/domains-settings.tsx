/**
 * Domains Settings Component
 * Manage custom domain connections for funnel projects
 */

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";

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
    const [verifying, setVerifying] = useState<string | null>(null);

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

    const handleVerifyDomain = async (domainId: string) => {
        setVerifying(domainId);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(`/api/domains/${domainId}/verify`, {
                method: "POST",
            });

            const { verified } = await response.json();

            if (verified) {
                setDomains(
                    domains.map((d) =>
                        d.id === domainId
                            ? {
                                  ...d,
                                  verified: true,
                                  verification_status: "verified",
                              }
                            : d
                    )
                );
                setSuccess("Domain verified successfully!");
            } else {
                setError(
                    "Domain not yet verified. Please check your DNS settings and try again in a few minutes."
                );
            }
        } catch (err) {
            logger.error({ error: err }, "Failed to verify domain");
            setError("Failed to verify domain");
        } finally {
            setVerifying(null);
        }
    };

    const handleDeleteDomain = async (domainId: string, domainName: string) => {
        if (
            !confirm(
                `Are you sure you want to remove ${domainName}? This action cannot be undone.`
            )
        ) {
            return;
        }

        try {
            const response = await fetch(`/api/domains/${domainId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete domain");
            }

            setDomains(domains.filter((d) => d.id !== domainId));
            setSuccess("Domain removed successfully");
            logger.info({ domainId }, "Domain deleted");
        } catch (err) {
            logger.error({ error: err }, "Failed to delete domain");
            setError("Failed to delete domain");
        }
    };

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
                        <div
                            key={domain.id}
                            className="rounded-lg border border-border bg-card p-6"
                        >
                            <div className="mb-4 flex items-start justify-between">
                                <div>
                                    <h4 className="text-lg font-semibold">
                                        {domain.domain}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        Points to: {domain.funnel_projects.name}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {domain.verified ? (
                                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                                            ✓ Verified
                                        </span>
                                    ) : (
                                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                                            Pending
                                        </span>
                                    )}
                                </div>
                            </div>

                            {!domain.verified && (
                                <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                                    <h5 className="mb-2 font-semibold">
                                        DNS Configuration Required
                                    </h5>
                                    <p className="mb-2 text-sm">
                                        Add this CNAME record to your DNS provider:
                                    </p>
                                    <div className="space-y-1 rounded border bg-card p-3 font-mono text-sm">
                                        <div>
                                            <strong>Type:</strong> CNAME
                                        </div>
                                        <div>
                                            <strong>Name:</strong>{" "}
                                            {domain.dns_instructions.name}
                                        </div>
                                        <div>
                                            <strong>Value:</strong>{" "}
                                            {domain.dns_instructions.value}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleVerifyDomain(domain.id)}
                                        disabled={verifying === domain.id}
                                        className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {verifying === domain.id
                                            ? "Checking..."
                                            : "Check Verification Status"}
                                    </button>
                                </div>
                            )}

                            {domain.verified && (
                                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
                                    <p className="text-sm text-green-800">
                                        Your domain is live! Visitors can now access
                                        your funnel at{" "}
                                        <a
                                            href={`https://${domain.domain}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="underline hover:no-underline"
                                        >
                                            {domain.domain}
                                        </a>
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() =>
                                    handleDeleteDomain(domain.id, domain.domain)
                                }
                                className="text-sm font-medium text-red-600 hover:text-red-800"
                            >
                                Remove Domain
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
