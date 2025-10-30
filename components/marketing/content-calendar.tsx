/**
 * Content Calendar
 * Visual calendar for scheduling and managing posts
 */

"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ContentCalendar as CalendarEntry } from "@/types/marketing";

interface ContentCalendarProps {
    funnelProjectId: string;
    onUpdate: () => void;
}

export function ContentCalendar({ funnelProjectId, onUpdate }: ContentCalendarProps) {
    const { toast } = useToast();
    const [entries, setEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [space, setSpace] = useState<"sandbox" | "production">("sandbox");

    useEffect(() => {
        loadCalendar();
    }, [funnelProjectId, currentMonth, space]);

    const loadCalendar = async () => {
        setLoading(true);

        try {
            // Get start and end of current month
            const start = new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth(),
                1
            );
            const end = new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth() + 1,
                0
            );

            const response = await fetch(
                `/api/marketing/calendar?start=${start.toISOString()}&end=${end.toISOString()}&space=${space}`
            );

            const data = await response.json();

            if (data.success) {
                setEntries(data.entries || []);
                logger.info({ count: data.entries?.length || 0 }, "Calendar loaded");
            }
        } catch (error) {
            logger.error({ error }, "Failed to load calendar");
        } finally {
            setLoading(false);
        }
    };

    const handlePreviousMonth = () => {
        setCurrentMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
        );
    };

    const handleNextMonth = () => {
        setCurrentMonth(
            new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
        );
    };

    const handlePromoteToProduction = async (entryId: string) => {
        try {
            const response = await fetch(`/api/marketing/calendar/${entryId}/promote`, {
                method: "POST",
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Promoted to Production",
                    description: "Content is now ready for publishing",
                });
                loadCalendar();
                onUpdate();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            logger.error({ error }, "Failed to promote");
            toast({
                title: "Promotion Failed",
                description: "Unable to promote to production",
                variant: "destructive",
            });
        }
    };

    const handleCancelScheduled = async (entryId: string) => {
        try {
            const response = await fetch(`/api/marketing/calendar/${entryId}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Post Cancelled",
                    description: "Scheduled post has been removed",
                });
                loadCalendar();
                onUpdate();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            logger.error({ error }, "Failed to cancel");
            toast({
                title: "Cancellation Failed",
                description: "Unable to cancel post",
                variant: "destructive",
            });
        }
    };

    // Generate calendar grid
    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startingDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const days = [];

        // Empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Days in month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }

        return days;
    };

    const getEntriesForDay = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

        return entries.filter((entry) => {
            const scheduledDate = new Date(entry.scheduled_publish_at);
            return (
                scheduledDate.getDate() === day &&
                scheduledDate.getMonth() === date.getMonth() &&
                scheduledDate.getFullYear() === date.getFullYear()
            );
        });
    };

    const monthName = currentMonth.toLocaleString("default", {
        month: "long",
        year: "numeric",
    });

    return (
        <div className="space-y-4">
            {/* Header Controls */}
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={handlePreviousMonth}
                            variant="outline"
                            size="sm"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h3 className="text-lg font-semibold">{monthName}</h3>
                        <Button onClick={handleNextMonth} variant="outline" size="sm">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Space:</span>
                        <Button
                            onClick={() => setSpace("sandbox")}
                            variant={space === "sandbox" ? "default" : "outline"}
                            size="sm"
                        >
                            Sandbox
                        </Button>
                        <Button
                            onClick={() => setSpace("production")}
                            variant={space === "production" ? "default" : "outline"}
                            size="sm"
                        >
                            Production
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Calendar Grid */}
            <Card className="p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-500">Loading calendar...</div>
                    </div>
                ) : (
                    <>
                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                                (day) => (
                                    <div
                                        key={day}
                                        className="text-center text-sm font-medium text-gray-600 py-2"
                                    >
                                        {day}
                                    </div>
                                )
                            )}
                        </div>

                        {/* Calendar days */}
                        <div className="grid grid-cols-7 gap-2">
                            {generateCalendarDays().map((day, index) => {
                                if (day === null) {
                                    return (
                                        <div
                                            key={`empty-${index}`}
                                            className="aspect-square"
                                        />
                                    );
                                }

                                const dayEntries = getEntriesForDay(day);
                                const hasEntries = dayEntries.length > 0;

                                return (
                                    <div
                                        key={day}
                                        className={`aspect-square border rounded-lg p-2 ${
                                            hasEntries
                                                ? "bg-blue-50 border-blue-300"
                                                : "bg-white border-gray-200"
                                        }`}
                                    >
                                        <div className="text-sm font-medium mb-1">
                                            {day}
                                        </div>
                                        {hasEntries && (
                                            <div className="space-y-1">
                                                {dayEntries.slice(0, 2).map((entry) => {
                                                    const variant = (entry as any)
                                                        .marketing_post_variants;
                                                    const platformIcons: Record<
                                                        string,
                                                        string
                                                    > = {
                                                        instagram: "📸",
                                                        facebook: "👍",
                                                        linkedin: "💼",
                                                        twitter: "🐦",
                                                    };

                                                    return (
                                                        <div
                                                            key={entry.id}
                                                            className="text-xs truncate"
                                                            title={
                                                                variant?.copy_text?.substring(
                                                                    0,
                                                                    100
                                                                ) || ""
                                                            }
                                                        >
                                                            <span className="mr-1">
                                                                {platformIcons[
                                                                    variant?.platform
                                                                ] || "📝"}
                                                            </span>
                                                            {entry.publish_status ===
                                                            "published"
                                                                ? "✅"
                                                                : "🕐"}
                                                        </div>
                                                    );
                                                })}
                                                {dayEntries.length > 2 && (
                                                    <div className="text-xs text-gray-600">
                                                        +{dayEntries.length - 2}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </Card>

            {/* Upcoming Posts List */}
            {entries.length > 0 && (
                <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4">
                        Upcoming Posts ({entries.length})
                    </h3>
                    <div className="space-y-3">
                        {entries.slice(0, 10).map((entry) => {
                            const variant = (entry as any).marketing_post_variants;
                            const scheduledDate = new Date(entry.scheduled_publish_at);

                            return (
                                <div
                                    key={entry.id}
                                    className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium capitalize">
                                                {variant?.platform}
                                            </span>
                                            <span className="text-xs text-gray-600">
                                                {scheduledDate.toLocaleDateString()} at{" "}
                                                {scheduledDate.toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-700 truncate">
                                            {variant?.copy_text?.substring(0, 80)}...
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {entry.space === "sandbox" && (
                                            <Button
                                                onClick={() =>
                                                    handlePromoteToProduction(entry.id)
                                                }
                                                variant="outline"
                                                size="sm"
                                            >
                                                Promote
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() =>
                                                handleCancelScheduled(entry.id)
                                            }
                                            variant="ghost"
                                            size="sm"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </div>
    );
}
