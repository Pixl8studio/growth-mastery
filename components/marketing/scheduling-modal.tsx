/**
 * Scheduling Modal Component
 * Schedule posts with date/time picker, space selector, recurring toggle, best time suggestions
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import {
    Calendar,
    Clock,
    Repeat,
    Sparkles,
    AlertTriangle,
    X,
} from "lucide-react";

interface SchedulingModalProps {
    isOpen: boolean;
    onClose: () => void;
    variantId: string;
    onScheduleComplete: () => void;
    platform?: string;
}

export function SchedulingModal({
    isOpen,
    onClose,
    variantId,
    onScheduleComplete,
    platform = "instagram",
}: SchedulingModalProps) {
    const { toast } = useToast();
    const [scheduling, setScheduling] = useState(false);

    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("09:00");
    const [space, setSpace] = useState<"sandbox" | "production">("sandbox");
    const [isRecurring, setIsRecurring] = useState(false);
    const [showConflictWarning, setShowConflictWarning] = useState(false);

    // Best time suggestions by platform
    const bestTimes: Record<string, string[]> = {
        instagram: ["9:00 AM", "12:00 PM", "5:00 PM"],
        facebook: ["1:00 PM", "3:00 PM"],
        linkedin: ["8:00 AM", "12:00 PM", "5:00 PM"],
        twitter: ["9:00 AM", "12:00 PM", "6:00 PM"],
    };

    const handleSchedule = async () => {
        if (!scheduleDate) {
            toast({
                title: "Date Required",
                description: "Please select a date",
                variant: "destructive",
            });
            return;
        }

        setScheduling(true);

        try {
            const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);

            const response = await fetch("/api/marketing/calendar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    variant_id: variantId,
                    scheduled_publish_at: scheduledDateTime.toISOString(),
                    space,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Post Scheduled",
                    description: `Scheduled for ${scheduledDateTime.toLocaleString()}`,
                });
                onScheduleComplete();
                onClose();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            logger.error({ error }, "Scheduling failed");
            toast({
                title: "Scheduling Failed",
                description:
                    error instanceof Error ? error.message : "Please try again",
                variant: "destructive",
            });
        } finally {
            setScheduling(false);
        }
    };

    const applyBestTime = (time: string) => {
        const [hour, period] = time.split(" ");
        let hours = parseInt(hour.split(":")[0]);

        if (period === "PM" && hours !== 12) {
            hours += 12;
        } else if (period === "AM" && hours === 12) {
            hours = 0;
        }

        setScheduleTime(`${hours.toString().padStart(2, "0")}:00`);
        toast({
            title: "Best Time Applied",
            description: `Set to ${time}`,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
            <Card className="w-full max-w-2xl">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold">Schedule Post</h2>
                            <p className="text-sm text-gray-600 capitalize">
                                {platform}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="space-y-6">
                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="mb-2 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Date
                                </Label>
                                <Input
                                    type="date"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    min={new Date().toISOString().split("T")[0]}
                                />
                            </div>
                            <div>
                                <Label className="mb-2 flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Time
                                </Label>
                                <Input
                                    type="time"
                                    value={scheduleTime}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                />
                                <p className="text-xs text-gray-600 mt-1">
                                    {Intl.DateTimeFormat().resolvedOptions().timeZone}
                                </p>
                            </div>
                        </div>

                        {/* Best Time Suggestions */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="h-4 w-4 text-blue-600" />
                                <h4 className="font-semibold text-blue-900">
                                    Best Times for {platform}
                                </h4>
                            </div>
                            <div className="flex gap-2">
                                {(bestTimes[platform] || ["9:00 AM"]).map((time) => (
                                    <Button
                                        key={time}
                                        onClick={() => applyBestTime(time)}
                                        variant="outline"
                                        size="sm"
                                    >
                                        {time}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Space Selector */}
                        <div>
                            <Label className="mb-2 block">Space</Label>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setSpace("sandbox")}
                                    variant={space === "sandbox" ? "default" : "outline"}
                                    className="flex-1"
                                >
                                    Sandbox (Testing)
                                </Button>
                                <Button
                                    onClick={() => setSpace("production")}
                                    variant={space === "production" ? "default" : "outline"}
                                    className="flex-1"
                                >
                                    Production (Live)
                                </Button>
                            </div>
                        </div>

                        {/* Recurring Toggle */}
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-2">
                                <Repeat className="h-5 w-5 text-purple-500" />
                                <div>
                                    <Label className="font-medium">Recurring Post</Label>
                                    <p className="text-xs text-gray-600">
                                        Schedule this post to repeat
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={isRecurring}
                                onCheckedChange={setIsRecurring}
                            />
                        </div>

                        {/* Conflict Warning */}
                        {showConflictWarning && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                                <div>
                                    <h4 className="font-semibold text-yellow-900 mb-1">
                                        High Volume Warning
                                    </h4>
                                    <p className="text-sm text-yellow-800">
                                        You have 3 other posts scheduled within 1 hour of
                                        this time. Consider spacing them out.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t">
                            <Button onClick={onClose} variant="outline" className="flex-1">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSchedule}
                                disabled={scheduling || !scheduleDate}
                                className="flex-1"
                            >
                                <Calendar className="h-4 w-4 mr-2" />
                                {scheduling ? "Scheduling..." : "Schedule Post"}
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

