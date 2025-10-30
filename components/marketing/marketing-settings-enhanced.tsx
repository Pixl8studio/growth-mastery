/**
 * Enhanced Marketing Settings
 * 8 comprehensive sections: platform connections, publishing preferences, compliance settings,
 * content limits, notifications, import/export, activity log, danger zone
 */

"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import {
    CheckCircle2,
    XCircle,
    Shield,
    Bell,
    Download,
    Upload,
    Clock,
    AlertTriangle,
    Trash2,
    RefreshCw,
} from "lucide-react";

interface MarketingSettingsEnhancedProps {
    funnelProjectId: string;
    profileId: string;
}

export function MarketingSettingsEnhanced({
    funnelProjectId,
    profileId: _profileId,
}: MarketingSettingsEnhancedProps) {
    const { toast } = useToast();
    const [connections, setConnections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activityLog, setActivityLog] = useState<any[]>([]);

    // Section 2: Publishing Preferences
    const [defaultSpace, setDefaultSpace] = useState<"sandbox" | "production">(
        "sandbox"
    );
    const [autoPublish, setAutoPublish] = useState(false);
    const [defaultPostingTime, setDefaultPostingTime] = useState("09:00");
    const [requireApproval, setRequireApproval] = useState(true);
    const [autoOptimizeTiming, setAutoOptimizeTiming] = useState(false);
    const [timezone, setTimezone] = useState(
        Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    // Section 3: Compliance Settings
    const [industry, setIndustry] = useState("general");
    const [healthDisclaimer, setHealthDisclaimer] = useState("");
    const [financialDisclaimer, setFinancialDisclaimer] = useState("");
    const [resultsDisclaimer, setResultsDisclaimer] = useState("");
    const [coachingDisclaimer, setCoachingDisclaimer] = useState("");
    const [autoDisclaimer, setAutoDisclaimer] = useState(true);
    const [copyrightPolicy, setCopyrightPolicy] = useState("moderate");
    const [imageLicensing, setImageLicensing] = useState(true);
    const [readingLevelEnforcement, setReadingLevelEnforcement] =
        useState("soft_warning");

    // Section 4: Content Limits
    const [dailyPostLimit, setDailyPostLimit] = useState(10);
    const [perPlatformDailyLimit, setPerPlatformDailyLimit] = useState(3);
    const [notificationThreshold, setNotificationThreshold] = useState(80);
    const [overrideLimits, setOverrideLimits] = useState(false);

    // Section 5: Notification Preferences
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [notifyOnPublish, setNotifyOnPublish] = useState(true);
    const [notifyOnFail, setNotifyOnFail] = useState(true);
    const [notifyOnExperiment, setNotifyOnExperiment] = useState(true);
    const [notifyOnLimits, setNotifyOnLimits] = useState(true);
    const [weeklySummary, setWeeklySummary] = useState(true);
    const [notificationFrequency, setNotificationFrequency] = useState("immediate");

    useEffect(() => {
        loadConnections();
        loadActivityLog();
    }, [funnelProjectId]);

    const loadConnections = async () => {
        setLoading(true);

        try {
            const supabase = (await import("@/lib/supabase/client")).createClient();

            const { data, error } = await supabase
                .from("funnel_social_connections")
                .select("*")
                .eq("funnel_project_id", funnelProjectId)
                .eq("is_active", true);

            if (!error && data) {
                setConnections(data);
                logger.info({ count: data.length }, "Connections loaded");
            }
        } catch (error) {
            logger.error({ error }, "Failed to load connections");
        } finally {
            setLoading(false);
        }
    };

    const loadActivityLog = async () => {
        try {
            const response = await fetch(
                `/api/marketing/activity-log?funnel_project_id=${funnelProjectId}&limit=20`
            );
            const data = await response.json();

            if (data.success) {
                setActivityLog(data.activities || []);
            }
        } catch (error) {
            logger.error({ error }, "Failed to load activity log");
        }
    };

    const handleConnect = async (platform: string) => {
        try {
            const response = await fetch(
                `/api/funnel/${funnelProjectId}/integrations/${platform}/connect`
            );

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No authorization URL returned");
            }
        } catch (error) {
            logger.error({ error, platform }, "Failed to initiate connection");
            toast({
                title: "Connection Failed",
                description: `Unable to connect to ${platform}`,
                variant: "destructive",
            });
        }
    };

    const handleDisconnect = async (provider: string) => {
        try {
            const response = await fetch(
                `/api/funnel/${funnelProjectId}/integrations/disconnect`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ provider }),
                }
            );

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Disconnected",
                    description: `${provider} has been disconnected`,
                });
                loadConnections();
            }
        } catch (error) {
            logger.error({ error, provider }, "Failed to disconnect");
            toast({
                title: "Disconnection Failed",
                description: "Unable to disconnect",
                variant: "destructive",
            });
        }
    };

    const handleExportContent = async () => {
        try {
            const response = await fetch(
                `/api/marketing/export?funnel_project_id=${funnelProjectId}`
            );
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `marketing-content-${Date.now()}.json`;
            a.click();

            toast({
                title: "Content Exported",
                description: "All content downloaded as JSON",
            });
        } catch (error) {
            logger.error({ error }, "Export failed");
            toast({
                title: "Export Failed",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const handleClearSandbox = async () => {
        if (
            !confirm(
                "Clear all sandbox content? This cannot be undone. Production content will not be affected."
            )
        ) {
            return;
        }

        try {
            const response = await fetch("/api/marketing/content/clear-sandbox", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    funnel_project_id: funnelProjectId,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Sandbox Cleared",
                    description: `Removed ${data.deleted_count} sandbox items`,
                });
            }
        } catch (error) {
            logger.error({ error }, "Clear sandbox failed");
            toast({
                title: "Clear Failed",
                description: "Please try again",
                variant: "destructive",
            });
        }
    };

    const isConnected = (platform: string) => {
        return connections.some((c) => c.provider === platform);
    };

    const getConnection = (platform: string) => {
        return connections.find((c) => c.provider === platform);
    };

    const platforms = [
        { id: "instagram", name: "Instagram", icon: "📸" },
        { id: "facebook", name: "Facebook", icon: "👍" },
        { id: "linkedin", name: "LinkedIn", icon: "💼" },
        { id: "twitter", name: "Twitter/X", icon: "🐦" },
    ];

    return (
        <div className="space-y-6">
            {/* Section 1: Platform Connections */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Platform Connections</h3>

                {loading ? (
                    <div className="text-center py-8 text-gray-500">
                        Loading connections...
                    </div>
                ) : (
                    <div className="space-y-4">
                        {platforms.map((platform) => {
                            const connected = isConnected(platform.id);
                            const connection = getConnection(platform.id);

                            return (
                                <div
                                    key={platform.id}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">
                                            {platform.icon}
                                        </span>
                                        <div>
                                            <div className="font-medium">
                                                {platform.name}
                                            </div>
                                            {connected && connection && (
                                                <div className="text-sm text-gray-600">
                                                    Connected as{" "}
                                                    {connection.account_name}
                                                    {connection.last_sync_at && (
                                                        <span className="text-xs ml-2">
                                                            • Last sync:{" "}
                                                            {new Date(
                                                                connection.last_sync_at
                                                            ).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {connected ? (
                                            <>
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                <Button
                                                    onClick={() =>
                                                        handleConnect(platform.id)
                                                    }
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    <RefreshCw className="h-4 w-4 mr-1" />
                                                    Reconnect
                                                </Button>
                                                <Button
                                                    onClick={() =>
                                                        handleDisconnect(platform.id)
                                                    }
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Disconnect
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-5 w-5 text-gray-400" />
                                                <Button
                                                    onClick={() =>
                                                        handleConnect(platform.id)
                                                    }
                                                    size="sm"
                                                >
                                                    Connect
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Section 2: Publishing Preferences */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Publishing Preferences</h3>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="font-medium">Default Space</Label>
                            <p className="text-sm text-gray-600">
                                Where new content is created by default
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={() => setDefaultSpace("sandbox")}
                                variant={
                                    defaultSpace === "sandbox" ? "default" : "outline"
                                }
                                size="sm"
                            >
                                Sandbox
                            </Button>
                            <Button
                                onClick={() => setDefaultSpace("production")}
                                variant={
                                    defaultSpace === "production"
                                        ? "default"
                                        : "outline"
                                }
                                size="sm"
                            >
                                Production
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                        <div>
                            <Label className="font-medium">Auto-Publish</Label>
                            <p className="text-sm text-gray-600">
                                Automatically publish scheduled posts without manual
                                approval
                            </p>
                        </div>
                        <Switch
                            checked={autoPublish}
                            onCheckedChange={setAutoPublish}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <Label className="mb-2 block">Default Posting Time</Label>
                            <Input
                                type="time"
                                value={defaultPostingTime}
                                onChange={(e) => setDefaultPostingTime(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className="mb-2 block">Timezone</Label>
                            <Input value={timezone} readOnly className="bg-gray-50" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                        <div>
                            <Label className="font-medium">Require Approval</Label>
                            <p className="text-sm text-gray-600">
                                All posts need manual approval before publishing
                            </p>
                        </div>
                        <Switch
                            checked={requireApproval}
                            onCheckedChange={setRequireApproval}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="font-medium">Auto-Optimize Timing</Label>
                            <p className="text-sm text-gray-600">
                                Use best time suggestions automatically
                            </p>
                        </div>
                        <Switch
                            checked={autoOptimizeTiming}
                            onCheckedChange={setAutoOptimizeTiming}
                        />
                    </div>
                </div>
            </Card>

            {/* Section 3: Compliance Settings */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-green-500" />
                    <h3 className="text-lg font-semibold">Compliance Settings</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label className="mb-2 block">Industry</Label>
                        <select
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        >
                            <option value="general">General</option>
                            <option value="coaching">Coaching</option>
                            <option value="finance">Finance</option>
                            <option value="health">Health & Wellness</option>
                        </select>
                    </div>

                    <div>
                        <Label className="mb-2 block">Health Claims Disclaimer</Label>
                        <Textarea
                            value={healthDisclaimer}
                            onChange={(e) => setHealthDisclaimer(e.target.value)}
                            placeholder="Disclaimer for health-related claims..."
                            rows={2}
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">
                            Financial Claims Disclaimer
                        </Label>
                        <Textarea
                            value={financialDisclaimer}
                            onChange={(e) => setFinancialDisclaimer(e.target.value)}
                            placeholder="Disclaimer for financial advice..."
                            rows={2}
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">Results Disclaimer</Label>
                        <Textarea
                            value={resultsDisclaimer}
                            onChange={(e) => setResultsDisclaimer(e.target.value)}
                            placeholder="Disclaimer for results claims..."
                            rows={2}
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">Coaching Disclaimer</Label>
                        <Textarea
                            value={coachingDisclaimer}
                            onChange={(e) => setCoachingDisclaimer(e.target.value)}
                            placeholder="Disclaimer for coaching services..."
                            rows={2}
                        />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                        <div>
                            <Label className="font-medium">Auto-Disclaimer</Label>
                            <p className="text-sm text-gray-600">
                                Automatically add appropriate disclaimers
                            </p>
                        </div>
                        <Switch
                            checked={autoDisclaimer}
                            onCheckedChange={setAutoDisclaimer}
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">Copyright Policy</Label>
                        <select
                            value={copyrightPolicy}
                            onChange={(e) => setCopyrightPolicy(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        >
                            <option value="strict">
                                Strict (Original Content Only)
                            </option>
                            <option value="moderate">
                                Moderate (With Attribution)
                            </option>
                            <option value="flexible">Flexible (Fair Use)</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="font-medium">
                                Image Licensing Required
                            </Label>
                            <p className="text-sm text-gray-600">
                                Enforce licensing for all images
                            </p>
                        </div>
                        <Switch
                            checked={imageLicensing}
                            onCheckedChange={setImageLicensing}
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">Reading Level Enforcement</Label>
                        <select
                            value={readingLevelEnforcement}
                            onChange={(e) => setReadingLevelEnforcement(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2"
                        >
                            <option value="strict">Strict (Block if Exceeded)</option>
                            <option value="soft_warning">
                                Soft Warning (Notify Only)
                            </option>
                            <option value="disabled">Disabled</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Section 4: Content Limits & Quotas */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Content Limits & Quotas</h3>

                <div className="space-y-4">
                    <div>
                        <Label className="mb-2 block">Daily Post Limit</Label>
                        <Input
                            type="number"
                            min="1"
                            max="100"
                            value={dailyPostLimit}
                            onChange={(e) =>
                                setDailyPostLimit(parseInt(e.target.value) || 10)
                            }
                        />
                        <p className="text-xs text-gray-600 mt-1">
                            Soft warning threshold for total posts per day
                        </p>
                    </div>

                    <div>
                        <Label className="mb-2 block">Posts Per Platform Per Day</Label>
                        <Input
                            type="number"
                            min="1"
                            max="20"
                            value={perPlatformDailyLimit}
                            onChange={(e) =>
                                setPerPlatformDailyLimit(parseInt(e.target.value) || 3)
                            }
                        />
                    </div>

                    <div>
                        <div className="flex justify-between mb-2">
                            <Label>Notification Threshold</Label>
                            <span className="text-sm text-gray-600">
                                {notificationThreshold}%
                            </span>
                        </div>
                        <Slider
                            value={[notificationThreshold]}
                            onValueChange={([value]) => setNotificationThreshold(value)}
                            min={50}
                            max={100}
                            step={5}
                        />
                        <p className="text-xs text-gray-600 mt-1">
                            Warn when reaching this % of daily limit
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                        <div>
                            <Label className="font-medium">
                                Override Limits (Admin)
                            </Label>
                            <p className="text-sm text-gray-600">
                                Allow posting beyond soft limits
                            </p>
                        </div>
                        <Switch
                            checked={overrideLimits}
                            onCheckedChange={setOverrideLimits}
                        />
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="font-medium text-blue-900 mb-1">
                            Soft Warnings Only
                        </div>
                        <div className="text-sm text-blue-800">
                            No hard stops. We'll notify you when approaching limits but
                            never block your content.
                        </div>
                    </div>
                </div>
            </Card>

            {/* Continuing with sections 5-8... */}
            {/* Section 5: Notification Preferences */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Bell className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-semibold">Notification Preferences</h3>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="font-medium">Email Notifications</Label>
                            <p className="text-sm text-gray-600">
                                Receive email updates
                            </p>
                        </div>
                        <Switch
                            checked={emailNotifications}
                            onCheckedChange={setEmailNotifications}
                        />
                    </div>

                    {emailNotifications && (
                        <>
                            <div className="pl-6 space-y-3 pt-3 border-t">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">
                                        Post Published Successfully
                                    </Label>
                                    <Switch
                                        checked={notifyOnPublish}
                                        onCheckedChange={setNotifyOnPublish}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">
                                        Post Failed to Publish
                                    </Label>
                                    <Switch
                                        checked={notifyOnFail}
                                        onCheckedChange={setNotifyOnFail}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">
                                        Experiment Completed
                                    </Label>
                                    <Switch
                                        checked={notifyOnExperiment}
                                        onCheckedChange={setNotifyOnExperiment}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">
                                        Approaching Limits
                                    </Label>
                                    <Switch
                                        checked={notifyOnLimits}
                                        onCheckedChange={setNotifyOnLimits}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">Weekly Summary</Label>
                                    <Switch
                                        checked={weeklySummary}
                                        onCheckedChange={setWeeklySummary}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <Label className="mb-2 block">
                                    Notification Frequency
                                </Label>
                                <select
                                    value={notificationFrequency}
                                    onChange={(e) =>
                                        setNotificationFrequency(e.target.value)
                                    }
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                >
                                    <option value="immediate">Immediate</option>
                                    <option value="daily_digest">Daily Digest</option>
                                    <option value="weekly_digest">Weekly Digest</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </Card>

            {/* Section 6: Import/Export */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Import / Export</h3>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Button onClick={handleExportContent} variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export All Content (JSON)
                        </Button>
                        <Button variant="outline">
                            <Upload className="h-4 w-4 mr-2" />
                            Import Content from File
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export Analytics (CSV)
                        </Button>
                        <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Export From Template Library
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Section 7: Activity Log */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-purple-500" />
                        <h3 className="text-lg font-semibold">Activity Log</h3>
                    </div>
                    <Button onClick={loadActivityLog} variant="ghost" size="sm">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>

                <div className="space-y-2">
                    {activityLog.slice(0, 10).map((activity, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">{activity.action}</span>
                                <span className="text-xs text-gray-600">
                                    {new Date(activity.created_at).toLocaleString()}
                                </span>
                            </div>
                            <div className="text-xs text-gray-600">
                                {activity.details}
                            </div>
                        </div>
                    ))}
                    {activityLog.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No activity yet
                        </div>
                    )}
                </div>

                <Button variant="outline" size="sm" className="w-full mt-4">
                    <Download className="h-4 w-4 mr-2" />
                    Export Full Activity Log
                </Button>
            </Card>

            {/* Section 8: Danger Zone */}
            <Card className="p-6 border-red-200 bg-red-50">
                <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <h3 className="text-lg font-semibold text-red-900">Danger Zone</h3>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <div>
                            <Label className="font-medium">Clear Sandbox Content</Label>
                            <p className="text-sm text-gray-600">
                                Remove all content in sandbox space
                            </p>
                        </div>
                        <Button
                            onClick={handleClearSandbox}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Clear Sandbox
                        </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <div>
                            <Label className="font-medium">
                                Reset Profile to Defaults
                            </Label>
                            <p className="text-sm text-gray-600">
                                Reset all profile settings
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reset Profile
                        </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <div>
                            <Label className="font-medium">
                                Delete All Analytics Data
                            </Label>
                            <p className="text-sm text-gray-600">
                                Permanently delete analytics history
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Analytics
                        </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <div>
                            <Label className="font-medium">Archive Old Content</Label>
                            <p className="text-sm text-gray-600">
                                Move content older than 90 days to archive
                            </p>
                        </div>
                        <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Archive
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
