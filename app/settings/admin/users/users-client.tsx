"use client";

/**
 * Admin Users List Client Component
 * Handles interactive sorting, filtering, and display of user data
 * Data is fetched server-side and passed as props
 */

import { useState, useMemo } from "react";
import Link from "next/link";

import type { UserSortField, SortOrder, HealthFilter } from "@/lib/admin/validation";

export interface UserListItem {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
    healthScore: number | null;
    funnelCount: number;
    lastActive: string | null;
    monthlyCostCents: number;
    hasErrors: boolean;
}

interface UsersClientProps {
    users: UserListItem[];
    initialSort: UserSortField;
    initialOrder: SortOrder;
    initialFilter: HealthFilter;
    initialSearch: string;
}

export default function UsersClient({
    users,
    initialSort,
    initialOrder,
    initialFilter,
    initialSearch,
}: UsersClientProps) {
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [sortField, setSortField] = useState<UserSortField>(initialSort);
    const [sortOrder, setSortOrder] = useState<SortOrder>(initialOrder);
    const [healthFilter, setHealthFilter] = useState<HealthFilter>(initialFilter);

    // Filter and sort users client-side for responsiveness
    const filteredUsers = useMemo(() => {
        return users
            .filter((user) => {
                // Search filter
                if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    const matchesEmail = user.email.toLowerCase().includes(query);
                    const matchesName = user.fullName?.toLowerCase().includes(query);
                    if (!matchesEmail && !matchesName) return false;
                }

                // Health filter
                if (healthFilter === "critical" && (user.healthScore ?? 100) >= 30) {
                    return false;
                }
                if (
                    healthFilter === "at-risk" &&
                    ((user.healthScore ?? 100) < 30 || (user.healthScore ?? 100) >= 50)
                ) {
                    return false;
                }
                if (healthFilter === "healthy" && (user.healthScore ?? 0) < 80) {
                    return false;
                }

                return true;
            })
            .sort((a, b) => {
                let aVal: number | string;
                let bVal: number | string;

                switch (sortField) {
                    case "email":
                        aVal = a.email;
                        bVal = b.email;
                        break;
                    case "healthScore":
                        aVal = a.healthScore ?? 0;
                        bVal = b.healthScore ?? 0;
                        break;
                    case "funnelCount":
                        aVal = a.funnelCount;
                        bVal = b.funnelCount;
                        break;
                    case "monthlyCostCents":
                        aVal = a.monthlyCostCents;
                        bVal = b.monthlyCostCents;
                        break;
                    default:
                        aVal = a.createdAt;
                        bVal = b.createdAt;
                }

                if (typeof aVal === "string" && typeof bVal === "string") {
                    return sortOrder === "asc"
                        ? aVal.localeCompare(bVal)
                        : bVal.localeCompare(aVal);
                }

                return sortOrder === "asc"
                    ? (aVal as number) - (bVal as number)
                    : (bVal as number) - (aVal as number);
            });
    }, [users, searchQuery, sortField, sortOrder, healthFilter]);

    const handleSort = (field: UserSortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("desc");
        }
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(cents / 100);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const getHealthBadge = (score: number | null) => {
        if (score === null) {
            return (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    N/A
                </span>
            );
        }

        if (score >= 80) {
            return (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {score}
                </span>
            );
        }

        if (score >= 50) {
            return (
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    {score}
                </span>
            );
        }

        return (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {score}
            </span>
        );
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search by email or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>

                <select
                    value={healthFilter}
                    onChange={(e) => setHealthFilter(e.target.value as HealthFilter)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                    <option value="all">All Users</option>
                    <option value="critical">Critical (Health &lt; 30)</option>
                    <option value="at-risk">At-Risk (Health 30-49)</option>
                    <option value="healthy">Healthy (Health &gt;= 80)</option>
                </select>

                <span className="text-sm text-muted-foreground">
                    {filteredUsers.length} users
                </span>
            </div>

            {/* Users Table */}
            <div className="overflow-hidden rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                        <tr>
                            <th
                                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                                onClick={() => handleSort("email")}
                            >
                                User{" "}
                                {sortField === "email" &&
                                    (sortOrder === "asc" ? "↑" : "↓")}
                            </th>
                            <th
                                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                                onClick={() => handleSort("healthScore")}
                            >
                                Health{" "}
                                {sortField === "healthScore" &&
                                    (sortOrder === "asc" ? "↑" : "↓")}
                            </th>
                            <th
                                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                                onClick={() => handleSort("funnelCount")}
                            >
                                Funnels{" "}
                                {sortField === "funnelCount" &&
                                    (sortOrder === "asc" ? "↑" : "↓")}
                            </th>
                            <th
                                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                                onClick={() => handleSort("monthlyCostCents")}
                            >
                                Cost (MTD){" "}
                                {sortField === "monthlyCostCents" &&
                                    (sortOrder === "asc" ? "↑" : "↓")}
                            </th>
                            <th
                                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
                                onClick={() => handleSort("createdAt")}
                            >
                                Joined{" "}
                                {sortField === "createdAt" &&
                                    (sortOrder === "asc" ? "↑" : "↓")}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-muted/50">
                                <td className="whitespace-nowrap px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 flex-shrink-0 rounded-full bg-muted">
                                            {user.avatarUrl ? (
                                                <img
                                                    src={user.avatarUrl}
                                                    alt=""
                                                    className="h-8 w-8 rounded-full"
                                                />
                                            ) : (
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                                    {user.email[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-foreground">
                                                {user.fullName || "—"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                    {getHealthBadge(user.healthScore)}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                                    {user.funnelCount}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                                    {formatCurrency(user.monthlyCostCents)}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                                    {formatDate(user.createdAt)}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                                    <Link
                                        href={`/settings/admin/users/${user.id}`}
                                        className="text-primary hover:underline"
                                    >
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))}

                        {filteredUsers.length === 0 && (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-6 py-8 text-center text-sm text-muted-foreground"
                                >
                                    No users found matching your criteria
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
