/**
 * Step 12: Marketing Content Engine
 *
 * Comprehensive organic social content generation and publishing system.
 * Features Echo Mode voice mirroring, multi-platform publishing, and analytics.
 */

"use client";

import { useState, useEffect } from "react";
import { StepLayout } from "@/components/funnel/step-layout";
import { useStepCompletion } from "@/app/funnel-builder/use-completion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/client-logger";
import {
    Sparkles,
    TrendingUp,
    Calendar,
    BarChart3,
    Settings,
    Lightbulb,
    Share2,
} from "lucide-react";

// Import enhanced components with comprehensive controls
import { ProfileConfigForm } from "@/components/marketing/profile-config-form";
import { ContentGenerator } from "@/components/marketing/content-generator";
import { ContentCalendar } from "@/components/marketing/content-calendar";
import { MarketingAnalyticsDashboard } from "@/components/marketing/marketing-analytics-dashboard";
import { TrendExplorer } from "@/components/marketing/trend-explorer";
import { MarketingSettings } from "@/components/marketing/marketing-settings";
import { ApprovalWorkflowModal } from "@/components/marketing/approval-workflow-modal";
import { ExperimentCreatorModal } from "@/components/marketing/experiment-creator-modal";

export default function Step12Page({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const { toast } = useToast();
    const [projectId, setProjectId] = useState("");
    const [marketingEnabled, setMarketingEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("profile");

    // State for marketing data
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState({
        postsThisMonth: 0,
        totalOptIns: 0,
        scheduledPosts: 0,
        activeExperiments: 0,
        overallOI1000: 0,
        pendingApprovals: 0,
    });

    // Modal states
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showExperimentModal, setShowExperimentModal] = useState(false);

    // Load completion status
    const { completedSteps } = useStepCompletion(projectId);

    useEffect(() => {
        const resolveParams = async () => {
            const resolved = await params;
            setProjectId(resolved.projectId);
        };
        resolveParams();
    }, [params]);

    // Load marketing data
    useEffect(() => {
        const loadData = async () => {
            if (!projectId) return;

            try {
                setLoading(true);

                // Load profile
                const profileRes = await fetch(
                    `/api/marketing/profiles?funnel_project_id=${projectId}`
                );

                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    if (profileData.profiles && profileData.profiles.length > 0) {
                        setProfile(profileData.profiles[0]);
                        setMarketingEnabled(true);
                        logger.info(
                            { profileId: profileData.profiles[0].id },
                            "Marketing profile loaded"
                        );
                    }
                }

                // Load stats if enabled
                if (profile) {
                    await loadStats();
                }
            } catch (error) {
                logger.error({ error }, "Failed to load marketing data");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [projectId]);

    const loadStats = async () => {
        try {
            // Get posts this month
            const monthStart = new Date();
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);

            const calendarRes = await fetch(
                `/api/marketing/calendar?start=${monthStart.toISOString()}`
            );

            if (calendarRes.ok) {
                const calendarData = await calendarRes.json();
                const entries = calendarData.entries || [];

                const published = entries.filter(
                    (e: any) => e.publish_status === "published"
                );
                const scheduled = entries.filter(
                    (e: any) => e.publish_status === "scheduled"
                );

                setStats((prev) => ({
                    ...prev,
                    postsThisMonth: published.length,
                    scheduledPosts: scheduled.length,
                }));
            }

            // Get analytics
            const analyticsRes = await fetch(
                `/api/marketing/analytics?funnel_project_id=${projectId}`
            );

            if (analyticsRes.ok) {
                const analyticsData = await analyticsRes.json();
                const dashboard = analyticsData.dashboard;

                if (dashboard) {
                    setStats((prev) => ({
                        ...prev,
                        totalOptIns: dashboard.overview?.total_opt_ins || 0,
                        overallOI1000: dashboard.overview?.overall_oi_1000 || 0,
                    }));
                }
            }

            // Get experiments count
            const experimentsRes = await fetch(
                `/api/marketing/analytics/experiments?funnel_project_id=${projectId}&status=running`
            );

            if (experimentsRes.ok) {
                const experimentsData = await experimentsRes.json();
                setStats((prev) => ({
                    ...prev,
                    activeExperiments: experimentsData.experiments?.length || 0,
                }));
            }
        } catch (error) {
            logger.error({ error }, "Failed to load stats");
        }
    };

    const handleEnableMarketing = async (enabled: boolean) => {
        setMarketingEnabled(enabled);

        if (enabled && !profile) {
            try {
                const response = await fetch("/api/marketing/profiles", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        funnel_project_id: projectId,
                        name: "Main Marketing Profile",
                    }),
                });

                const data = await response.json();

                if (data.success && data.profile) {
                    setProfile(data.profile);

                    toast({
                        title: "Marketing Content Engine Enabled",
                        description:
                            "Your profile has been created with auto-populated brand voice from your intake and offer data.",
                    });

                    logger.info(
                        { profileId: data.profile.id },
                        "Marketing profile created"
                    );
                } else {
                    throw new Error(data.error || "Failed to create profile");
                }
            } catch (error) {
                logger.error({ error }, "Failed to enable marketing");
                toast({
                    title: "Error",
                    description: "Failed to enable marketing engine. Please try again.",
                    variant: "destructive",
                });
                setMarketingEnabled(false);
            }
        }
    };

    if (loading) {
        return (
            <StepLayout
                stepTitle="Marketing Content Engine"
                stepDescription="Generate and publish organic social content"
                currentStep={12}
                projectId={projectId}
                completedSteps={completedSteps}
            >
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
                        <p className="text-gray-600">Loading marketing engine...</p>
                    </div>
                </div>
            </StepLayout>
        );
    }

    return (
        <StepLayout
            stepTitle="Marketing Content Engine"
            stepDescription="AI-powered social content generation with Echo Mode voice mirroring"
            currentStep={12}
            projectId={projectId}
            completedSteps={completedSteps}
            nextLabel="Continue to Analytics"
        >
            <div className="space-y-6">
                {/* Enable/Disable Section */}
                <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Share2 className="h-6 w-6 text-blue-500" />
                            <div>
                                <h3 className="text-lg font-semibold">
                                    Enable Marketing Content Engine
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Generate platform-optimized content in your
                                    authentic founder voice
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={marketingEnabled}
                            onCheckedChange={handleEnableMarketing}
                        />
                    </div>

                    {marketingEnabled && (
                        <>
                            <div className="mt-6 grid grid-cols-5 gap-4 text-sm">
                                <div className="text-center p-3 bg-white rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {stats.postsThisMonth}
                                    </div>
                                    <div className="text-gray-600">Posts This Month</div>
                                </div>
                                <div className="text-center p-3 bg-white rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">
                                        {stats.totalOptIns}
                                    </div>
                                    <div className="text-gray-600">Total Opt-ins</div>
                                    {stats.overallOI1000 > 0 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            {stats.overallOI1000.toFixed(1)} O/I-1000
                                        </div>
                                    )}
                                </div>
                                <div className="text-center p-3 bg-white rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {stats.scheduledPosts}
                                    </div>
                                    <div className="text-gray-600">Scheduled</div>
                                </div>
                                <div className="text-center p-3 bg-white rounded-lg">
                                    <div className="text-2xl font-bold text-orange-600">
                                        {stats.activeExperiments}
                                    </div>
                                    <div className="text-gray-600">Active Tests</div>
                                </div>
                                <div
                                    className="text-center p-3 bg-white rounded-lg cursor-pointer hover:bg-yellow-50 transition-colors"
                                    onClick={() => setShowApprovalModal(true)}
                                >
                                    <div className="text-2xl font-bold text-yellow-600">
                                        {stats.pendingApprovals}
                                    </div>
                                    <div className="text-gray-600">Pending</div>
                                </div>
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="mt-4 flex justify-end gap-3">
                                <Button
                                    onClick={() => setShowApprovalModal(true)}
                                    variant="outline"
                                    size="sm"
                                >
                                    Review Approvals
                                </Button>
                                <Button
                                    onClick={() => setShowExperimentModal(true)}
                                    variant="outline"
                                    size="sm"
                                >
                                    Create A/B Test
                                </Button>
                            </div>
                        </>
                    )}
                </Card>

                {marketingEnabled && profile && (
                    <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="w-full"
                    >
                        <TabsList className="grid w-full grid-cols-6">
                            <TabsTrigger value="profile">
                                <Sparkles className="h-4 w-4 mr-2" />
                                Profile
                            </TabsTrigger>
                            <TabsTrigger value="generate">
                                <Lightbulb className="h-4 w-4 mr-2" />
                                Generate
                            </TabsTrigger>
                            <TabsTrigger value="calendar">
                                <Calendar className="h-4 w-4 mr-2" />
                                Calendar
                            </TabsTrigger>
                            <TabsTrigger value="analytics">
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Analytics
                            </TabsTrigger>
                            <TabsTrigger value="trends">
                                <TrendingUp className="h-4 w-4 mr-2" />
                                Trends
                            </TabsTrigger>
                            <TabsTrigger value="settings">
                                <Settings className="h-4 w-4 mr-2" />
                                Settings
                            </TabsTrigger>
                        </TabsList>

                        {/* Profile Tab */}
                        <TabsContent value="profile" className="mt-6">
                            <ProfileConfigForm
                                profile={profile}
                                onUpdate={async () => {
                                    // Reload profile
                                    const res = await fetch(
                                        `/api/marketing/profiles?funnel_project_id=${projectId}`
                                    );
                                    if (res.ok) {
                                        const data = await res.json();
                                        if (data.profiles?.[0]) {
                                            setProfile(data.profiles[0]);
                                        }
                                    }
                                }}
                            />
                        </TabsContent>

                        {/* Generate Tab */}
                        <TabsContent value="generate" className="mt-6">
                            <ContentGenerator
                                profileId={profile.id}
                                funnelProjectId={projectId}
                                onContentGenerated={() => loadStats()}
                            />
                        </TabsContent>

                        {/* Calendar Tab */}
                        <TabsContent value="calendar" className="mt-6">
                            <ContentCalendar
                                funnelProjectId={projectId}
                                onUpdate={() => loadStats()}
                            />
                        </TabsContent>

                        {/* Analytics Tab */}
                        <TabsContent value="analytics" className="mt-6">
                            <MarketingAnalyticsDashboard funnelProjectId={projectId} />
                        </TabsContent>

                        {/* Trends Tab */}
                        <TabsContent value="trends" className="mt-6">
                            <TrendExplorer
                                profileId={profile.id}
                                funnelProjectId={projectId}
                            />
                        </TabsContent>

                        {/* Settings Tab */}
                        <TabsContent value="settings" className="mt-6">
                            <MarketingSettings
                                funnelProjectId={projectId}
                                profileId={profile.id}
                            />
                        </TabsContent>
                    </Tabs>
                )}
            </div>

            {/* Approval Workflow Modal */}
            {marketingEnabled && (
                <ApprovalWorkflowModal
                    isOpen={showApprovalModal}
                    onClose={() => setShowApprovalModal(false)}
                    funnelProjectId={projectId}
                    onApprovalComplete={() => {
                        loadStats();
                    }}
                />
            )}

            {/* Experiment Creator Modal */}
            {marketingEnabled && (
                <ExperimentCreatorModal
                    isOpen={showExperimentModal}
                    onClose={() => setShowExperimentModal(false)}
                    funnelProjectId={projectId}
                    onExperimentCreated={() => {
                        setShowExperimentModal(false);
                        loadStats();
                    }}
                />
            )}
        </StepLayout>
    );
}
