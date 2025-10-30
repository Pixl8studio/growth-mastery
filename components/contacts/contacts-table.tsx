/**
 * Contacts Table Component
 * Display and filter contacts list
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils";

interface Contact {
    id: string;
    email: string;
    name: string | null;
    current_stage: string;
    video_watch_percentage: number;
    created_at: string;
    last_activity_at: string;
    funnel_projects: {
        id: string;
        name: string;
    } | null;
}

interface ContactsTableProps {
    contacts: Contact[];
    funnelProjects: Array<{ id: string; name: string }>;
    initialStage: string;
    initialSearch: string;
    initialFunnelProjectId: string | null;
}

export function ContactsTable({
    contacts,
    funnelProjects,
    initialStage,
    initialSearch,
    initialFunnelProjectId,
}: ContactsTableProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(initialSearch);

    const handleStageFilter = (stage: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (stage === "all") {
            params.delete("stage");
        } else {
            params.set("stage", stage);
        }
        router.push(`/contacts?${params.toString()}`);
    };

    const handleFunnelFilter = (funnelProjectId: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (funnelProjectId === "all") {
            params.delete("funnelProjectId");
        } else {
            params.set("funnelProjectId", funnelProjectId);
        }
        router.push(`/contacts?${params.toString()}`);
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set("search", value);
        } else {
            params.delete("search");
        }
        router.push(`/contacts?${params.toString()}`);
    };

    const getStageVariant = (
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
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 gap-4">
                    {/* Search */}
                    <Input
                        type="search"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="max-w-sm"
                    />

                    {/* Stage Filter */}
                    <Select value={initialStage} onValueChange={handleStageFilter}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by stage" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Stages</SelectItem>
                            <SelectItem value="registered">Registered</SelectItem>
                            <SelectItem value="watched">Watched Video</SelectItem>
                            <SelectItem value="enrolled">Viewed Enrollment</SelectItem>
                            <SelectItem value="purchased">Purchased</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Funnel Filter */}
                    {funnelProjects.length > 0 && (
                        <Select
                            value={initialFunnelProjectId || "all"}
                            onValueChange={handleFunnelFilter}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by funnel" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Funnels</SelectItem>
                                {funnelProjects.map((project) => (
                                    <SelectItem key={project.id} value={project.id}>
                                        {project.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {/* Table */}
            {contacts.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Contact
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Funnel
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Stage
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Video Progress
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Last Activity
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-card">
                                {contacts.map((contact) => (
                                    <tr
                                        key={contact.id}
                                        className="hover:bg-muted/50 transition-smooth"
                                    >
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="text-sm font-medium text-foreground">
                                                    {contact.name || "Anonymous"}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {contact.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="text-sm text-foreground">
                                                {contact.funnel_projects?.name ||
                                                    "Unknown Funnel"}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <Badge
                                                variant={getStageVariant(
                                                    contact.current_stage
                                                )}
                                            >
                                                {formatStage(contact.current_stage)}
                                            </Badge>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="mr-2 h-2 w-24 rounded-full bg-gray-200">
                                                    <div
                                                        className="h-2 rounded-full bg-green-500"
                                                        style={{
                                                            width: `${contact.video_watch_percentage}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-sm text-muted-foreground">
                                                    {contact.video_watch_percentage}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                                            {formatDateTime(contact.last_activity_at)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                            <Link
                                                href={`/contacts/${contact.id}`}
                                                className="text-primary hover:text-primary"
                                            >
                                                View Details →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
