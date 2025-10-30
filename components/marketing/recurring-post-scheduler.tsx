/**
 * Recurring Post Scheduler Component
 * Schedule posts to recur weekly, biweekly, or monthly
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Calendar, Clock, Repeat } from "lucide-react";

interface RecurringPostSchedulerProps {
    variantId: string;
    onSchedule: (scheduleConfig: RecurringScheduleConfig) => void;
    onCancel: () => void;
}

export interface RecurringScheduleConfig {
    frequency: "weekly" | "biweekly" | "monthly";
    day_of_week?: number; // 0-6 for weekly
    day_of_month?: number; // 1-31 for monthly
    time: string; // HH:MM format
    end_condition: "date" | "count";
    end_date?: string;
    occurrence_count?: number;
    timezone: string;
}

export function RecurringPostScheduler({
    variantId: _variantId,
    onSchedule,
    onCancel,
}: RecurringPostSchedulerProps) {
    const { toast } = useToast();
    const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly">(
        "weekly"
    );
    const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
    const [dayOfMonth, setDayOfMonth] = useState(1);
    const [time, setTime] = useState("09:00");
    const [endCondition, setEndCondition] = useState<"date" | "count">("count");
    const [endDate, setEndDate] = useState("");
    const [occurrenceCount, setOccurrenceCount] = useState(4);
    const [previewDates, setPreviewDates] = useState<string[]>([]);

    const daysOfWeek = [
        { value: 0, label: "Sunday" },
        { value: 1, label: "Monday" },
        { value: 2, label: "Tuesday" },
        { value: 3, label: "Wednesday" },
        { value: 4, label: "Thursday" },
        { value: 5, label: "Friday" },
        { value: 6, label: "Saturday" },
    ];

    const generatePreview = () => {
        const dates: string[] = [];
        const now = new Date();
        // eslint-disable-next-line prefer-const
        let currentDate = new Date(now);

        // Find first occurrence
        if (frequency === "weekly" || frequency === "biweekly") {
            const targetDay = dayOfWeek;
            const currentDay = currentDate.getDay();
            const daysUntilTarget = (targetDay - currentDay + 7) % 7;
            currentDate.setDate(currentDate.getDate() + daysUntilTarget);
        } else if (frequency === "monthly") {
            currentDate.setDate(dayOfMonth);
            if (currentDate < now) {
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        }

        // Set time
        const [hours, minutes] = time.split(":");
        currentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Generate dates
        const maxDates = endCondition === "count" ? occurrenceCount : 10;
        const endDateTime = endDate ? new Date(endDate) : null;

        for (let i = 0; i < maxDates; i++) {
            if (endDateTime && currentDate > endDateTime) break;

            dates.push(currentDate.toLocaleString());

            // Move to next occurrence
            if (frequency === "weekly") {
                currentDate.setDate(currentDate.getDate() + 7);
            } else if (frequency === "biweekly") {
                currentDate.setDate(currentDate.getDate() + 14);
            } else if (frequency === "monthly") {
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        }

        setPreviewDates(dates);
    };

    const handleGeneratePreview = () => {
        generatePreview();
        toast({
            title: "Preview Generated",
            description: `Showing ${previewDates.length} upcoming posts`,
        });
    };

    const handleSchedule = () => {
        const config: RecurringScheduleConfig = {
            frequency,
            day_of_week: frequency !== "monthly" ? dayOfWeek : undefined,
            day_of_month: frequency === "monthly" ? dayOfMonth : undefined,
            time,
            end_condition: endCondition,
            end_date: endCondition === "date" ? endDate : undefined,
            occurrence_count: endCondition === "count" ? occurrenceCount : undefined,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        onSchedule(config);
    };

    return (
        <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
                <Repeat className="h-6 w-6 text-purple-500" />
                <h3 className="text-xl font-bold">Recurring Post Schedule</h3>
            </div>

            <div className="space-y-6">
                {/* Frequency Selection */}
                <div>
                    <Label className="mb-3 block">Frequency</Label>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { value: "weekly", label: "Weekly", desc: "Every week" },
                            {
                                value: "biweekly",
                                label: "Biweekly",
                                desc: "Every 2 weeks",
                            },
                            {
                                value: "monthly",
                                label: "Monthly",
                                desc: "Once per month",
                            },
                        ].map((freq) => (
                            <Button
                                key={freq.value}
                                onClick={() =>
                                    setFrequency(
                                        freq.value as "weekly" | "biweekly" | "monthly"
                                    )
                                }
                                variant={
                                    frequency === freq.value ? "default" : "outline"
                                }
                                className="flex flex-col h-auto py-4"
                            >
                                <div className="font-semibold">{freq.label}</div>
                                <div className="text-xs opacity-70">{freq.desc}</div>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Day Selection */}
                {(frequency === "weekly" || frequency === "biweekly") && (
                    <div>
                        <Label className="mb-3 block">Day of Week</Label>
                        <select
                            value={dayOfWeek}
                            onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        >
                            {daysOfWeek.map((day) => (
                                <option key={day.value} value={day.value}>
                                    {day.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {frequency === "monthly" && (
                    <div>
                        <Label className="mb-3 block">Day of Month</Label>
                        <Input
                            type="number"
                            min="1"
                            max="31"
                            value={dayOfMonth}
                            onChange={(e) =>
                                setDayOfMonth(parseInt(e.target.value) || 1)
                            }
                            placeholder="1-31"
                        />
                    </div>
                )}

                {/* Time Selection */}
                <div>
                    <Label className="mb-3 block flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Time
                    </Label>
                    <Input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                        Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </p>
                </div>

                {/* End Condition */}
                <div>
                    <Label className="mb-3 block">End Condition</Label>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <Button
                            onClick={() => setEndCondition("count")}
                            variant={endCondition === "count" ? "default" : "outline"}
                        >
                            After X Posts
                        </Button>
                        <Button
                            onClick={() => setEndCondition("date")}
                            variant={endCondition === "date" ? "default" : "outline"}
                        >
                            Until Date
                        </Button>
                    </div>

                    {endCondition === "count" && (
                        <div>
                            <Label className="mb-2 block text-sm">
                                Number of Occurrences
                            </Label>
                            <Input
                                type="number"
                                min="1"
                                max="52"
                                value={occurrenceCount}
                                onChange={(e) =>
                                    setOccurrenceCount(parseInt(e.target.value) || 1)
                                }
                                placeholder="4"
                            />
                        </div>
                    )}

                    {endCondition === "date" && (
                        <div>
                            <Label className="mb-2 block text-sm">End Date</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={new Date().toISOString().split("T")[0]}
                            />
                        </div>
                    )}
                </div>

                {/* Preview Button */}
                <Button
                    onClick={handleGeneratePreview}
                    variant="outline"
                    className="w-full"
                >
                    <Calendar className="h-4 w-4 mr-2" />
                    Generate Preview
                </Button>

                {/* Preview Dates */}
                {previewDates.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold mb-3">
                            Upcoming Posts ({previewDates.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {previewDates.map((date, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 text-sm"
                                >
                                    <span className="font-mono text-blue-600">
                                        #{index + 1}
                                    </span>
                                    <span className="text-gray-700">{date}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                    <Button
                        onClick={handleSchedule}
                        className="flex-1"
                        disabled={
                            previewDates.length === 0 ||
                            (endCondition === "date" && !endDate)
                        }
                    >
                        <Repeat className="h-4 w-4 mr-2" />
                        Schedule Recurring Posts
                    </Button>
                    <Button onClick={onCancel} variant="outline">
                        Cancel
                    </Button>
                </div>
            </div>
        </Card>
    );
}
