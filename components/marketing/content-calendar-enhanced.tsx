/**
 * Enhanced Content Calendar
 * Multiple views (Month/Week/List), day detail panel, scheduling modal, bulk actions, publishing queue
 */

"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    List,
    Clock,
    CheckCircle2,
    Filter,
    RefreshCw,
    Trash2,
    Upload,
} from "lucide-react";
import { RecurringPostScheduler } from "./recurring-post-scheduler";
import type { ContentCalendar as CalendarEntry } from "@/types/marketing";

interface ContentCalendarEnhancedProps {
    funnelProjectId: string;
    onUpdate: () => void;
}

export function ContentCalendarEnhanced({
    funnelProjectId,
    onUpdate,
}: ContentCalendarEnhancedProps) {
    const { toast } = useToast();
    const [entries, setEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [space, setSpace] = useState<"sandbox" | "production">("sandbox");
    const [view, setView] = useState<"month" | "week" | "list">("month");
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [platformFilter, setPlatformFilter] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
    const [showSchedulingModal, setShowSchedulingModal] = useState(false);
    const [schedulingVariantId, setSchedulingVariantId] = useState<string | null>(null);

    useEffect(() => {
        loadCalendar();
    }, [funnelProjectId, currentMonth, space]);

    const loadCalendar = async () => {
        setLoading(true);

        try {
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

    const handleBulkAction = async (action: string) => {
        if (selectedEntries.length === 0) {
            toast({
                title: "No Selection",
                description: "Please select posts first",
                variant: "destructive",
            });
            return;
        }

        if (
            action === "delete" &&
            !confirm(`Delete ${selectedEntries.length} posts?`)
        ) {
            return;
        }

        try {
            const response = await fetch("/api/marketing/calendar/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    entry_ids: selectedEntries,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Bulk Action Complete",
                    description: `${action} applied to ${selectedEntries.length} posts`,
                });
                setSelectedEntries([]);
                loadCalendar();
                onUpdate();
            }
        } catch (error) {
            logger.error({ error }, "Bulk action failed");
            toast({
                title: "Bulk Action Failed",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const toggleSelectEntry = (entryId: string) => {
        if (selectedEntries.includes(entryId)) {
            setSelectedEntries(selectedEntries.filter((id) => id !== entryId));
        } else {
            setSelectedEntries([...selectedEntries, entryId]);
        }
    };

    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startingDayOfWeek = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const days = [];

        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

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

    const filteredEntries = entries.filter((entry) => {
        if (
            platformFilter &&
            (entry as any).marketing_post_variants?.platform !== platformFilter
        ) {
            return false;
        }
        if (statusFilter && entry.publish_status !== statusFilter) {
            return false;
        }
        return true;
    });

    const monthName = currentMonth.toLocaleString("default", {
        month: "long",
        year: "numeric",
    });

    const platformIcons: Record<string, string> = {
        instagram: "📸",
        facebook: "👍",
        linkedin: "💼",
        twitter: "🐦",
    };

    return (
        <div className="space-y-4">
            {/* Header Controls */}
            <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={handlePreviousMonth}
                            variant="outline"
                            size="sm"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h3 className="text-lg font-semibold min-w-[200px] text-center">
                            {monthName}
                        </h3>
                        <Button onClick={handleNextMonth} variant="outline" size="sm">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Selector */}
                        <div className="flex border rounded-lg">
                            <Button
                                onClick={() => setView("month")}
                                variant={view === "month" ? "default" : "ghost"}
                                size="sm"
                                className="rounded-r-none"
                            >
                                <CalendarIcon className="h-4 w-4" />
                            </Button>
                            <Button
                                onClick={() => setView("week")}
                                variant={view === "week" ? "default" : "ghost"}
                                size="sm"
                                className="rounded-none border-x"
                            >
                                Week
                            </Button>
                            <Button
                                onClick={() => setView("list")}
                                variant={view === "list" ? "default" : "ghost"}
                                size="sm"
                                className="rounded-l-none"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Space Toggle */}
                        <div className="flex gap-2">
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
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 pt-3 border-t">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                        value={platformFilter || "all"}
                        onChange={(e) =>
                            setPlatformFilter(
                                e.target.value === "all" ? null : e.target.value
                            )
                        }
                        className="text-sm rounded-md border border-gray-300 px-2 py-1"
                    >
                        <option value="all">All Platforms</option>
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="twitter">Twitter</option>
                    </select>

                    <select
                        value={statusFilter || "all"}
                        onChange={(e) =>
                            setStatusFilter(
                                e.target.value === "all" ? null : e.target.value
                            )
                        }
                        className="text-sm rounded-md border border-gray-300 px-2 py-1"
                    >
                        <option value="all">All Statuses</option>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                        <option value="failed">Failed</option>
                    </select>

                    {selectedEntries.length > 0 && (
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                                {selectedEntries.length} selected
                            </span>
                            <Button
                                onClick={() => handleBulkAction("promote")}
                                variant="outline"
                                size="sm"
                            >
                                <Upload className="h-3 w-3 mr-1" />
                                Promote
                            </Button>
                            <Button
                                onClick={() => handleBulkAction("delete")}
                                variant="outline"
                                size="sm"
                                className="text-red-600"
                            >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Calendar Grid View */}
            {view === "month" && (
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
                                            onClick={() => setSelectedDay(day)}
                                            className={`aspect-square border rounded-lg p-2 cursor-pointer transition-colors ${
                                                hasEntries
                                                    ? "bg-blue-50 border-blue-300 hover:bg-blue-100"
                                                    : "bg-white border-gray-200 hover:border-gray-300"
                                            } ${selectedDay === day ? "ring-2 ring-blue-500" : ""}`}
                                        >
                                            <div className="text-sm font-medium mb-1">
                                                {day}
                                            </div>
                                            {hasEntries && (
                                                <div className="space-y-1">
                                                    {dayEntries
                                                        .slice(0, 2)
                                                        .map((entry) => {
                                                            const variant = (
                                                                entry as any
                                                            ).marketing_post_variants;
                                                            return (
                                                                <div
                                                                    key={entry.id}
                                                                    className="text-xs truncate flex items-center gap-1"
                                                                >
                                                                    <span>
                                                                        {platformIcons[
                                                                            variant
                                                                                ?.platform
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
            )}

            {/* List View */}
            {view === "list" && (
                <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4">
                        All Posts ({filteredEntries.length})
                    </h3>
                    <div className="space-y-2">
                        {filteredEntries.map((entry) => {
                            const variant = (entry as any).marketing_post_variants;
                            const scheduledDate = new Date(entry.scheduled_publish_at);

                            return (
                                <div
                                    key={entry.id}
                                    className="p-3 bg-gray-50 rounded-lg flex items-center gap-3"
                                >
                                    <Checkbox
                                        checked={selectedEntries.includes(entry.id)}
                                        onCheckedChange={() =>
                                            toggleSelectEntry(entry.id)
                                        }
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">
                                                {platformIcons[variant?.platform]}
                                            </span>
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
                                            {entry.publish_status === "published" && (
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            )}
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

            {/* Day Detail Panel (Sidebar) */}
            {selectedDay && view === "month" && (
                <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">
                            {monthName.split(" ")[0]} {selectedDay}
                        </h3>
                        <Button
                            onClick={() => setSelectedDay(null)}
                            variant="ghost"
                            size="sm"
                        >
                            Close
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {getEntriesForDay(selectedDay).map((entry) => {
                            const variant = (entry as any).marketing_post_variants;
                            const scheduledDate = new Date(entry.scheduled_publish_at);

                            return (
                                <div
                                    key={entry.id}
                                    className="p-3 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">
                                            {platformIcons[variant?.platform]}
                                        </span>
                                        <span className="text-sm font-medium">
                                            {scheduledDate.toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded ${
                                                entry.publish_status === "published"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-blue-100 text-blue-700"
                                            }`}
                                        >
                                            {entry.publish_status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-700">
                                        {variant?.copy_text?.substring(0, 100)}...
                                    </p>
                                </div>
                            );
                        })}
                        {getEntriesForDay(selectedDay).length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No posts scheduled for this day
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Publishing Queue */}
            <Card className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-purple-500" />
                    <h3 className="text-lg font-semibold">Publishing Queue</h3>
                    <Button
                        onClick={loadCalendar}
                        variant="ghost"
                        size="sm"
                        className="ml-auto"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
                <div className="space-y-2">
                    {filteredEntries
                        .filter((e) => e.publish_status === "scheduled")
                        .slice(0, 5)
                        .map((entry) => {
                            const variant = (entry as any).marketing_post_variants;
                            const scheduledDate = new Date(entry.scheduled_publish_at);
                            const now = new Date();
                            const isUpcoming =
                                scheduledDate.getTime() - now.getTime() < 3600000; // Within 1 hour

                            return (
                                <div
                                    key={entry.id}
                                    className={`p-3 rounded-lg border ${
                                        isUpcoming
                                            ? "bg-orange-50 border-orange-200"
                                            : "bg-gray-50 border-gray-200"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span>
                                                {platformIcons[variant?.platform]}
                                            </span>
                                            <span className="text-sm font-medium">
                                                {scheduledDate.toLocaleString()}
                                            </span>
                                            {isUpcoming && (
                                                <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                                                    Publishing Soon
                                                </span>
                                            )}
                                        </div>
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
                    {filteredEntries.filter((e) => e.publish_status === "scheduled")
                        .length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No posts in publishing queue
                        </div>
                    )}
                </div>
            </Card>

            {/* Scheduling Modal */}
            {showSchedulingModal && schedulingVariantId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
                    <div className="bg-white rounded-lg max-w-2xl w-full">
                        <RecurringPostScheduler
                            variantId={schedulingVariantId}
                            onSchedule={(config) => {
                                logger.info({ config }, "Recurring schedule created");
                                setShowSchedulingModal(false);
                                loadCalendar();
                                onUpdate();
                            }}
                            onCancel={() => setShowSchedulingModal(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
