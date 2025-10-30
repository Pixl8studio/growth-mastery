/**
 * Contacts Stats Component
 * Display funnel stage statistics
 */

"use client";

import { Card } from "@/components/ui/card";
import { calculatePercentage } from "@/lib/utils";

interface ContactsStatsProps {
    stats: {
        total: number;
        registered: number;
        watched: number;
        enrolled: number;
        purchased: number;
    };
}

export function ContactsStats({ stats }: ContactsStatsProps) {
    const { total, registered, watched, enrolled, purchased } = stats;

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {/* Total Contacts */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">
                            Total Contacts
                        </p>
                        <p className="mt-2 text-3xl font-bold text-foreground">
                            {total}
                        </p>
                    </div>
                    <div className="rounded-full bg-primary/10 p-3">
                        <svg
                            className="h-6 w-6 text-primary"
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
                    </div>
                </div>
            </Card>

            {/* Registered */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div className="w-full">
                        <p className="text-sm font-medium text-muted-foreground">
                            Registered
                        </p>
                        <div className="mt-2 flex items-baseline justify-between">
                            <p className="text-3xl font-bold text-foreground">
                                {registered}
                            </p>
                            {total > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {calculatePercentage(registered, total)}%
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="rounded-full bg-purple-100 p-3">
                        <svg
                            className="h-6 w-6 text-purple-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                        </svg>
                    </div>
                </div>
            </Card>

            {/* Watched Video */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div className="w-full">
                        <p className="text-sm font-medium text-muted-foreground">
                            Watched Video
                        </p>
                        <div className="mt-2 flex items-baseline justify-between">
                            <p className="text-3xl font-bold text-foreground">
                                {watched}
                            </p>
                            {total > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {calculatePercentage(watched, total)}%
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="rounded-full bg-green-100 p-3">
                        <svg
                            className="h-6 w-6 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                </div>
            </Card>

            {/* Viewed Enrollment */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div className="w-full">
                        <p className="text-sm font-medium text-muted-foreground">
                            Viewed Enrollment
                        </p>
                        <div className="mt-2 flex items-baseline justify-between">
                            <p className="text-3xl font-bold text-foreground">
                                {enrolled}
                            </p>
                            {total > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {calculatePercentage(enrolled, total)}%
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="rounded-full bg-yellow-100 p-3">
                        <svg
                            className="h-6 w-6 text-yellow-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    </div>
                </div>
            </Card>

            {/* Purchased */}
            <Card className="p-6">
                <div className="flex items-center justify-between">
                    <div className="w-full">
                        <p className="text-sm font-medium text-muted-foreground">
                            Purchased
                        </p>
                        <div className="mt-2 flex items-baseline justify-between">
                            <p className="text-3xl font-bold text-foreground">
                                {purchased}
                            </p>
                            {total > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {calculatePercentage(purchased, total)}%
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="rounded-full bg-emerald-100 p-3">
                        <svg
                            className="h-6 w-6 text-emerald-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                </div>
            </Card>
        </div>
    );
}
