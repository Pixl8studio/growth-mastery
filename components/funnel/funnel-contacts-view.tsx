/**
 * Funnel Contacts View Component
 *
 * Displays contacts and their stages for a specific funnel.
 */

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";
import { ContactsStats } from "@/components/contacts/contacts-stats";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, CheckCircle, CreditCard } from "lucide-react";
import Link from "next/link";

interface Contact {
    id: string;
    email: string;
    name: string | null;
    current_stage: string;
    video_watch_percentage: number | null;
    created_at: string;
}

interface Stats {
    total: number;
    registered: number;
    watched: number;
    enrolled: number;
    purchased: number;
}

interface FunnelContactsViewProps {
    projectId: string;
}

export function FunnelContactsView({ projectId }: FunnelContactsViewProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [stats, setStats] = useState<Stats>({
        total: 0,
        registered: 0,
        watched: 0,
        enrolled: 0,
        purchased: 0,
    });
    const [loading, setLoading] = useState(true);
    const [stageFilter, setStageFilter] = useState<string>("all");

    useEffect(() => {
        loadData();
    }, [projectId, stageFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const supabase = createClient();

            let query = supabase
                .from("contacts")
                .select(
                    "id, email, name, current_stage, video_watch_percentage, created_at"
                )
                .eq("funnel_project_id", projectId)
                .order("created_at", { ascending: false })
                .limit(100);

            if (stageFilter !== "all") {
                query = query.eq("current_stage", stageFilter);
            }

            const { data: contactsData } = await query;

            const { data: allContactsData } = await supabase
                .from("contacts")
                .select("current_stage")
                .eq("funnel_project_id", projectId);

            if (contactsData) {
                setContacts(contactsData);
            }

            if (allContactsData) {
                const newStats = {
                    total: allContactsData.length,
                    registered: allContactsData.filter(
                        (c) => c.current_stage === "registered"
                    ).length,
                    watched: allContactsData.filter(
                        (c) => c.current_stage === "watched"
                    ).length,
                    enrolled: allContactsData.filter(
                        (c) => c.current_stage === "enrolled"
                    ).length,
                    purchased: allContactsData.filter(
                        (c) => c.current_stage === "purchased"
                    ).length,
                };
                setStats(newStats);
            }
        } catch (error) {
            logger.error({ error, projectId }, "Failed to load funnel contacts");
        } finally {
            setLoading(false);
        }
    };

    const getStageBadge = (stage: string) => {
        const badges = {
            registered: <Badge variant="secondary">Registered</Badge>,
            watched: <Badge className="bg-purple-100 text-purple-800">Watched</Badge>,
            enrolled: <Badge className="bg-blue-100 text-blue-800">Enrolled</Badge>,
            purchased: <Badge className="bg-green-100 text-green-800">Purchased</Badge>,
        };
        return (
            badges[stage as keyof typeof badges] || (
                <Badge variant="outline">{stage}</Badge>
            )
        );
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-32 animate-pulse rounded-lg bg-gray-200" />
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-20 animate-pulse rounded-lg bg-gray-200"
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <ContactsStats stats={stats} />

            {/* Stage Filter */}
            <div className="flex gap-2">
                <button
                    onClick={() => setStageFilter("all")}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        stageFilter === "all"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                    All ({stats.total})
                </button>
                <button
                    onClick={() => setStageFilter("registered")}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        stageFilter === "registered"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                    Registered ({stats.registered})
                </button>
                <button
                    onClick={() => setStageFilter("watched")}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        stageFilter === "watched"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                    Watched ({stats.watched})
                </button>
                <button
                    onClick={() => setStageFilter("enrolled")}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        stageFilter === "enrolled"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                    Enrolled ({stats.enrolled})
                </button>
                <button
                    onClick={() => setStageFilter("purchased")}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        stageFilter === "purchased"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                    Purchased ({stats.purchased})
                </button>
            </div>

            {/* Contacts List */}
            <div className="rounded-lg border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-gray-200 bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Contact
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Stage
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Watch %
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                    Registered
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {contacts.map((contact) => (
                                <tr key={contact.id} className="hover:bg-gray-50">
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <Link
                                            href={`/contacts/${contact.id}`}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                        >
                                            {contact.name || contact.email}
                                        </Link>
                                        {contact.name && (
                                            <div className="text-xs text-gray-500">
                                                {contact.email}
                                            </div>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        {getStageBadge(contact.current_stage)}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                        {contact.video_watch_percentage
                                            ? `${contact.video_watch_percentage}%`
                                            : "-"}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                        {new Date(
                                            contact.created_at
                                        ).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {contacts.length === 0 && (
                    <div className="p-12 text-center">
                        <Users className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">
                            No contacts found
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {stageFilter !== "all"
                                ? "Try adjusting your filter"
                                : "Contacts will appear here when someone registers"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
