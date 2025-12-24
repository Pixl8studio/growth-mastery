"use client";

/**
 * Admin Cost Monitoring Dashboard
 * API usage and cost tracking across all users
 */

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/client-logger";

interface UserCost {
    userId: string;
    userEmail: string;
    totalCostCents: number;
    percentOfThreshold: number;
}

interface ServiceCost {
    service: string;
    totalCostCents: number;
    totalCalls: number;
}

const COST_THRESHOLD_CENTS = 5000; // $50

export default function AdminCostsPage() {
    const [userCosts, setUserCosts] = useState<UserCost[]>([]);
    const [serviceCosts, setServiceCosts] = useState<ServiceCost[]>([]);
    const [totalCostCents, setTotalCostCents] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCostData = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = createClient();

            const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

            // Fetch monthly usage by user
            const { data: monthlyData, error: monthlyError } = await supabase
                .from("api_usage_monthly")
                .select("user_id, service, total_cost_cents, total_calls")
                .eq("month", currentMonth);

            if (monthlyError) throw monthlyError;

            // Aggregate by user
            const userCostMap = new Map<string, number>();
            const serviceCostMap = new Map<string, { cost: number; calls: number }>();

            monthlyData?.forEach((row) => {
                // User costs
                userCostMap.set(
                    row.user_id,
                    (userCostMap.get(row.user_id) || 0) + row.total_cost_cents
                );

                // Service costs
                const existing = serviceCostMap.get(row.service) || {
                    cost: 0,
                    calls: 0,
                };
                serviceCostMap.set(row.service, {
                    cost: existing.cost + row.total_cost_cents,
                    calls: existing.calls + row.total_calls,
                });
            });

            // Get user emails
            const userIds = [...userCostMap.keys()];
            const { data: users } = await supabase
                .from("user_profiles")
                .select("id, email")
                .in("id", userIds);

            const userEmailMap = new Map(users?.map((u) => [u.id, u.email]) || []);

            // Build user costs array
            const userCostsArray: UserCost[] = [...userCostMap.entries()]
                .map(([userId, cost]) => ({
                    userId,
                    userEmail: userEmailMap.get(userId) || "Unknown",
                    totalCostCents: cost,
                    percentOfThreshold: Math.round((cost / COST_THRESHOLD_CENTS) * 100),
                }))
                .sort((a, b) => b.totalCostCents - a.totalCostCents);

            // Build service costs array
            const serviceCostsArray: ServiceCost[] = [...serviceCostMap.entries()]
                .map(([service, data]) => ({
                    service,
                    totalCostCents: data.cost,
                    totalCalls: data.calls,
                }))
                .sort((a, b) => b.totalCostCents - a.totalCostCents);

            const total = [...userCostMap.values()].reduce((sum, c) => sum + c, 0);

            setUserCosts(userCostsArray);
            setServiceCosts(serviceCostsArray);
            setTotalCostCents(total);
        } catch (err) {
            logger.error({ error: err }, "Failed to fetch cost data");
            setError("Failed to load cost data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCostData();
    }, [fetchCostData]);

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(cents / 100);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">
                    Loading cost data...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
            </div>
        );
    }

    const usersApproachingLimit = userCosts.filter((u) => u.percentOfThreshold >= 80);

    return (
        <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        Total Cost (MTD)
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {formatCurrency(totalCostCents)}
                    </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        Users with Usage
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {userCosts.length}
                    </p>
                </div>
                <div
                    className={`rounded-lg border p-4 ${
                        usersApproachingLimit.length > 0
                            ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-950/30"
                            : "border-border bg-card"
                    }`}
                >
                    <p className="text-sm font-medium text-muted-foreground">
                        Approaching Limit
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                        {usersApproachingLimit.length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {">"}80% of {formatCurrency(COST_THRESHOLD_CENTS)}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Cost by Service */}
                <div className="rounded-lg border border-border bg-card p-4">
                    <h3 className="mb-4 font-semibold text-foreground">
                        Cost by Service
                    </h3>
                    {serviceCosts.length > 0 ? (
                        <div className="space-y-3">
                            {serviceCosts.map((service) => (
                                <div
                                    key={service.service}
                                    className="flex items-center justify-between"
                                >
                                    <div>
                                        <p className="text-sm font-medium capitalize text-foreground">
                                            {service.service}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {service.totalCalls.toLocaleString()} calls
                                        </p>
                                    </div>
                                    <p className="font-semibold text-foreground">
                                        {formatCurrency(service.totalCostCents)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No usage data</p>
                    )}
                </div>

                {/* Top Users by Cost */}
                <div className="rounded-lg border border-border bg-card p-4">
                    <h3 className="mb-4 font-semibold text-foreground">
                        Top Users by Cost
                    </h3>
                    {userCosts.length > 0 ? (
                        <div className="space-y-3">
                            {userCosts.slice(0, 10).map((user) => (
                                <div
                                    key={user.userId}
                                    className="flex items-center justify-between"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate text-sm font-medium text-foreground">
                                            {user.userEmail}
                                        </p>
                                        <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                                            <div
                                                className={`h-1.5 rounded-full ${
                                                    user.percentOfThreshold >= 100
                                                        ? "bg-red-500"
                                                        : user.percentOfThreshold >= 80
                                                          ? "bg-yellow-500"
                                                          : "bg-green-500"
                                                }`}
                                                style={{
                                                    width: `${Math.min(user.percentOfThreshold, 100)}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="ml-4 text-right">
                                        <p className="font-semibold text-foreground">
                                            {formatCurrency(user.totalCostCents)}
                                        </p>
                                        <p
                                            className={`text-xs ${
                                                user.percentOfThreshold >= 100
                                                    ? "text-red-600"
                                                    : user.percentOfThreshold >= 80
                                                      ? "text-yellow-600"
                                                      : "text-muted-foreground"
                                            }`}
                                        >
                                            {user.percentOfThreshold}% of limit
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No usage data</p>
                    )}
                </div>
            </div>

            {/* Alert Threshold Info */}
            <div className="rounded-lg border border-border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                    <strong>Cost Alert Threshold:</strong>{" "}
                    {formatCurrency(COST_THRESHOLD_CENTS)} per user per month. Users
                    approaching or exceeding this limit trigger notifications.
                </p>
            </div>
        </div>
    );
}
