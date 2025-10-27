"use client";

/**
 * Custom Domains Settings Page
 * Manage custom domain connections for funnel projects
 */

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

export default function DomainsSettingsPage() {
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

            // Load domains via API
            const domainsRes = await fetch("/api/domains");
            const domainsData = await domainsRes.json();

            // Load projects directly from Supabase
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
        } catch (err: any) {
            logger.error({ error: err }, "Failed to add domain");
            setError(err.message || "Failed to add domain");
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
            <div className="max-w-4xl mx-auto p-6">
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading domains...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-2">Custom Domains</h1>
            <p className="text-gray-600 mb-6">
                Connect your own domain to your funnel projects for a branded
                experience.
            </p>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                    {success}
                </div>
            )}

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Add New Domain</h2>

                <form onSubmit={handleAddDomain} className="space-y-4">
                    <div>
                        <label
                            htmlFor="domain"
                            className="block text-sm font-medium mb-2"
                        >
                            Domain or Subdomain
                        </label>
                        <input
                            id="domain"
                            type="text"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            placeholder="webinar.yourcompany.com"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                        <p className="text-sm text-gray-600 mt-1">
                            Supports both root domains (company.com) and subdomains
                            (webinar.company.com)
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor="project"
                            className="block text-sm font-medium mb-2"
                        >
                            Funnel Project
                        </label>
                        <select
                            id="project"
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            <p className="text-sm text-amber-600 mt-1">
                                You need to create a funnel project first.
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={adding || projects.length === 0}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {adding ? "Adding..." : "Add Domain"}
                    </button>
                </form>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Your Domains</h2>

                {domains.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-600">No domains connected yet.</p>
                        <p className="text-sm text-gray-500 mt-2">
                            Add a custom domain above to get started.
                        </p>
                    </div>
                ) : (
                    domains.map((domain) => (
                        <div key={domain.id} className="bg-white rounded-lg shadow p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        {domain.domain}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Points to: {domain.funnel_projects.name}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {domain.verified ? (
                                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                            ✓ Verified
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                                            Pending
                                        </span>
                                    )}
                                </div>
                            </div>

                            {!domain.verified && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                    <h4 className="font-semibold mb-2">
                                        DNS Configuration Required
                                    </h4>
                                    <p className="text-sm mb-2">
                                        Add this CNAME record to your DNS provider:
                                    </p>
                                    <div className="bg-white p-3 rounded border font-mono text-sm space-y-1">
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
                                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {verifying === domain.id
                                            ? "Checking..."
                                            : "Check Verification Status"}
                                    </button>
                                </div>
                            )}

                            {domain.verified && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
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
                                className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
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
