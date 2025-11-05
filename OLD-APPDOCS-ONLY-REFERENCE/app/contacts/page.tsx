/**
 * Contacts Dashboard Page
 * View and manage all contacts from funnel registrations
 */

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile } from "@/lib/auth";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ContactsStats } from "@/components/contacts/contacts-stats";
import { Header } from "@/components/layout/header";
import Link from "next/link";

export const metadata = {
    title: "Contacts | Genie AI",
    description: "View and manage your funnel contacts",
};

export default async function ContactsPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string>>;
}) {
    const { user } = await getCurrentUserWithProfile();
    const supabase = await createClient();
    const params = await searchParams;

    // Get query parameters
    const stage = params.stage || "all";
    const search = params.search || "";
    const funnelProjectId = params.funnelProjectId || null;

    // Build query for contacts
    let contactsQuery = supabase
        .from("contacts")
        .select("*, funnel_projects!inner(id, name)", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

    // Apply filters
    if (stage !== "all") {
        contactsQuery = contactsQuery.eq("current_stage", stage);
    }

    if (search) {
        const sanitizedSearch = search.replace(/[%_\\]/g, "").trim();
        if (sanitizedSearch) {
            contactsQuery = contactsQuery.or(
                `email.ilike.%${sanitizedSearch}%,name.ilike.%${sanitizedSearch}%`
            );
        }
    }

    if (funnelProjectId) {
        contactsQuery = contactsQuery.eq("funnel_project_id", funnelProjectId);
    }

    const { data: contacts, error, count: _count } = await contactsQuery;

    if (error) {
        console.error("Error fetching contacts:", error);
    }

    // Get funnel projects for filter dropdown
    const { data: funnelProjects } = await supabase
        .from("funnel_projects")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    // Calculate stage stats
    const statsQuery = supabase
        .from("contacts")
        .select("current_stage")
        .eq("user_id", user.id);

    const { data: allContacts } = await statsQuery;

    const stats = {
        total: allContacts?.length || 0,
        registered:
            allContacts?.filter((c) => c.current_stage === "registered").length || 0,
        watched: allContacts?.filter((c) => c.current_stage === "watched").length || 0,
        enrolled:
            allContacts?.filter((c) => c.current_stage === "enrolled").length || 0,
        purchased:
            allContacts?.filter((c) => c.current_stage === "purchased").length || 0,
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            {/* Main Content */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Stats Cards */}
                <ContactsStats stats={stats} />

                {/* Filters and Table */}
                <div className="mt-8">
                    <ContactsTable
                        contacts={contacts || []}
                        funnelProjects={funnelProjects || []}
                        initialStage={stage}
                        initialSearch={search}
                        initialFunnelProjectId={funnelProjectId}
                    />
                </div>

                {/* Empty State */}
                {contacts && contacts.length === 0 && (
                    <div className="mt-8 rounded-lg border border-gray-200 bg-white p-12 text-center">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                        </svg>
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">
                            No contacts found
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {stage !== "all" || search
                                ? "Try adjusting your filters"
                                : "Contacts will appear here when someone registers for your funnel"}
                        </p>
                        {(stage !== "all" || search) && (
                            <div className="mt-6">
                                <Link
                                    href="/contacts"
                                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                                >
                                    Clear Filters
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
